import { pool, transaction } from './db.js';
import { json, body, fail, requireRole, admins, staff } from './http.js';
import schema, { fields, options, validate, ageOfCedula } from './validation.js';
import { today } from '../public/js/validation.js';
const readers = {
  Marca:admins,Modelo:admins,Vehiculo:[...admins,'Vendedor','Bodega'],
  Cliente:staff,Proveedor:admins,TipoCosto:admins,CostoVehiculo:admins,
  AdquisicionVehiculo:admins,Venta:[...admins,'Vendedor']
};
const identifiers = { IdMarca:'Marca',IdModelo:'Modelo',IdVehiculo:'Vehiculo',IdProveedor:'Proveedor',IdCliente:'Cliente',IdTipoCosto:'TipoCosto' };
async function relations(db,data) {
  for(const [key,table] of Object.entries(identifiers)) {
    if (!data[key]) continue;
    const result=await db.query(`SELECT * FROM nicar."${table}" WHERE "${key}"=$1 FOR SHARE`,[data[key]]);
    if(!result.rows[0]?.Activo) fail('Seleccioná un registro activo en '+key+'.');
    if(table==='Modelo') {
      const parent=await db.query('SELECT "Activo" FROM nicar."Marca" WHERE "IdMarca"=$1 FOR SHARE',[result.rows[0].IdMarca]);
      if(!parent.rows[0]?.Activo) fail('La marca debe estar activa.');
    }
  }
}
export async function admin(req,res,path,user) {
  if(path==='/api/modules' && req.method==='GET') {
    if(!user) fail('Iniciá sesión.',401);
    json(res,Object.entries(readers).filter(([,roles])=>roles.includes(user.Rol)).map(([table])=>({
      table, fields:fields(table).filter(c=>!['Activo','Activa'].includes(c.name)), options,
      writable:(table==='Cliente'?staff:table==='Venta'?[...admins,'Vendedor']:admins).includes(user.Rol),
      editable:table!=='Venta'
    }))); return true;
  }
  const match=/^\/api\/admin\/([A-Za-z]+)(?:\/(\d+))?$/.exec(path);
  if(!match || !readers[match[1]]) return false;
  const [,table,id]=match;
  requireRole(user,readers[table]);
  const primary=schema[table][0].name;
  if(req.method==='GET') {
    json(res,(await pool.query(`SELECT * FROM nicar."${table}" ORDER BY "${primary}" DESC LIMIT 1000`)).rows);
    return true;
  }
  requireRole(user,table==='Cliente'?staff:table==='Venta'?[...admins,'Vendedor']:admins);
  if(req.method==='DELETE') {
    if(!id || table==='Venta') fail('Esta operación requiere conservar el historial.');
    const active=table==='Venta'?'Activa':'Activo';
    await pool.query(`UPDATE nicar."${table}" SET "${active}"=NOT "${active}" WHERE "${primary}"=$1`,[id]);
    json(res,{message:'Estado actualizado.'}); return true;
  }
  if(!['POST','PUT'].includes(req.method)) return false;
  if((req.method==='PUT' && !id) || (req.method==='POST' && id)) fail('Ruta inválida.');
  if(table==='Venta' && req.method==='PUT') fail('Las ventas registradas conservan su comprobante.');
  const data=validate(table,await body(req),req.method==='POST');
  const result=await transaction(async db=>{
    if(id) {
      const row=await db.query(`SELECT * FROM nicar."${table}" WHERE "${primary}"=$1 FOR UPDATE`,[id]);
      if(!row.rows.length) fail('Registro no encontrado.',404);
    } else {
      if(['Cliente','Proveedor','Vehiculo'].includes(table)) data.FechaRegistro=today()+'T12:00:00';
      if(table==='Vehiculo') { data.Estado='Disponible'; data.EstadoMatricula=data.Placa?'Matriculado':'Pendiente'; }
    }
    await relations(db,data);
    if(table==='Venta') {
      const vehicle=await db.query('SELECT * FROM nicar."Vehiculo" WHERE "IdVehiculo"=$1 FOR UPDATE',[data.IdVehiculo]);
      if(vehicle.rows[0].Estado!=='Disponible') fail('El vehículo ya no está disponible.');
      const customer=await db.query('SELECT * FROM nicar."Cliente" WHERE "IdCliente"=$1',[data.IdCliente]);
      if(customer.rows[0].TipoCliente==='Natural') {
        if(customer.rows[0].TipoIdentificacion!=='Cedula') fail('Verificá la mayoría de edad del cliente mediante su cédula antes de vender.');
        if(ageOfCedula(customer.rows[0].NumeroIdentificacion)<18) fail('La venta directa requiere mayoría de edad.');
      }
      data.NumeroComprobante='V-'+crypto.randomUUID().slice(0,20);
      data.FechaVenta=today(); data.UsuarioRegistro=user.NombreUsuario;
      await db.query('UPDATE nicar."Vehiculo" SET "Estado"=\'Vendido\' WHERE "IdVehiculo"=$1',[data.IdVehiculo]);
    }
    const keys=Object.keys(data),values=Object.values(data);
    if(id) {
      const set=keys.map((key,i)=>`"${key}"=$${i+1}`).join(',');
      return db.query(`UPDATE nicar."${table}" SET ${set} WHERE "${primary}"=$${values.length+1} RETURNING *`,[...values,id]);
    }
    return db.query(`INSERT INTO nicar."${table}" (${keys.map(k=>'"'+k+'"').join(',')})
      VALUES (${keys.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,values);
  });
  json(res,result.rows[0],req.method==='POST'?201:200); return true;
}
