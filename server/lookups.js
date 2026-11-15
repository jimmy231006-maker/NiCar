import { pool } from './db.js';
import { requireRole,json,staff,admins } from './http.js';
const config={
  Marca:['IdMarca','"Nombre"'],Modelo:['IdModelo','"Nombre"'],
  Vehiculo:['IdVehiculo','concat("IdentificadorUnico",\' · \',"Anio")'],
  Cliente:['IdCliente','coalesce("RazonSocial",concat("Nombres",\' \',"Apellidos"))'],
  Proveedor:['IdProveedor','"NombreProveedor"'],TipoCosto:['IdTipoCosto','"Nombre"']
};
export async function lookups(req,res,path,user) {
  const table=path.split('/')[3];
  if(!path.startsWith('/api/lookups/') || !config[table] || req.method!=='GET') return false;
  requireRole(user,table==='Vehiculo'?[...staff,'Bodega']:table==='Cliente'?staff:admins);
  const [key,text]=config[table];
  json(res,(await pool.query(`SELECT "${key}" AS id,${text} AS label FROM nicar."${table}" WHERE "Activo" ORDER BY label`)).rows);
  return true;
}
