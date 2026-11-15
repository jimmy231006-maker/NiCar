import { app,el,heading,table,notify,label } from './dom.js';
import { field,modal } from './forms.js';
import { api,state } from './api.js';
const titles={Marca:'Marcas',Modelo:'Modelos',Vehiculo:'Inventario',Cliente:'Clientes',Proveedor:'Proveedores',TipoCosto:'Tipos de costo',CostoVehiculo:'Costos',AdquisicionVehiculo:'Adquisiciones',Venta:'Ventas'};
const refs={IdMarca:'Marca',IdModelo:'Modelo',IdVehiculo:'Vehiculo',IdCliente:'Cliente',IdProveedor:'Proveedor',IdTipoCosto:'TipoCosto'};
export async function adminPage(selected) {
  state.modules=await api('/modules');
  if(!state.modules.length) throw new Error('Tu cuenta no tiene módulos administrativos.');
  const module=state.modules.find(m=>m.table===selected)||state.modules[0];
  heading(titles[module.table]);
  const select=el('select',{'aria-label':'Módulo'},...state.modules.map(m=>el('option',{value:m.table},titles[m.table])));
  select.value=module.table;select.onchange=()=>location.hash='#admin/'+select.value;
  const toolbar=el('div',{class:'toolbar'},select);
  if(module.writable) toolbar.append(el('button',{onClick:()=>edit(module)},'Agregar registro'));
  app.append(toolbar);
  const rows=await api('/admin/'+module.table);
  app.append(table(rows,module.writable && module.editable?row=>[
    el('button',{onClick:()=>edit(module,row)},'Editar'),
    el('button',{onClick:async()=>{
      if(!confirm('¿Cambiar el estado de este registro?')) return;
      try {await api('/admin/'+module.table+'/'+Object.values(row)[0],'DELETE',{});await adminPage(module.table);}
      catch(e){notify(e.message);}
    }},row.Activo===false?'Activar':'Desactivar')
  ]:null));
}
async function edit(module,row={}) {
  try {
    const relationOptions={};
    for(const column of module.fields.filter(c=>refs[c.name])) {
      const reference=refs[column.name];
      // Las listas de referencia se consultan en un endpoint autorizado por el servidor.
      relationOptions[column.name]=(await api('/lookups/'+reference)).map(r=>({value:r.id,label:r.label}));
    }
    const inputs=module.fields.map(column=>{
      const type=column.type==='date'?'date':['integer','smallint','bigint','numeric'].includes(column.type)?'number':'text';
      return field(column.name,{type,required:column.required,choices:relationOptions[column.name]||module.options[column.name],
        max:column.max,value:row[column.name],min:type==='number'?0:undefined,step:column.type==='numeric'?(column.name==='TasaCambio'?'0.000001':'0.01'):undefined});
    });
    modal((Object.keys(row).length?'Editar ':'Agregar ')+(titles[module.table]||module.table),inputs,async data=>{
      const id=Object.values(row)[0];
      await api('/admin/'+module.table+(id?'/'+id:''),id?'PUT':'POST',data);
      await adminPage(module.table);
    });
  } catch(e){notify(e.message);}
}
export async function appointmentsPage() {
  heading(state.user?.Rol==='Cliente'?'Mis citas':'Agenda de visitas','Fechas y horas de Nicaragua.');
  app.append(table(await api('/appointments')));
}
export async function usersPage() {
  heading('Cuentas');
  app.append(el('button',{onClick:()=>modal('Crear cuenta del personal',[
    field('Nombre',{required:true,max:100,label:'Nombre completo'}),field('Correo',{required:true,type:'email',max:50}),
    field('Contrasena',{required:true,type:'password',max:100,label:'Contraseña temporal (mínimo 12 caracteres)'}),
    field('Rol',{required:true,choices:state.user.Rol==='SuperAdministrador'?['Administrador','Vendedor','Recepcionista','Bodega']:['Vendedor','Recepcionista','Bodega']})
  ],async data=>{await api('/users','POST',data);await usersPage();})},'Crear cuenta'));
  app.append(table(await api('/users'),row=>el('button',{onClick:async()=>{
    try {await api('/users/'+row.IdUsuario,'DELETE',{});await usersPage();}catch(e){notify(e.message);}
  }},row.Activo?'Desactivar':'Activar')));
}
export async function logsPage(){heading('Auditoría de accesos');app.append(table(await api('/logs')));}
