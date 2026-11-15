export function el(tag, attrs={}, ...children) {
  const node=document.createElement(tag);
  for(const [key,value] of Object.entries(attrs)) {
    if(key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(),value);
    else if(key==='class') node.className=value;
    else if(value!==undefined && value!==null) node.setAttribute(key,value);
  }
  for(const child of children.flat()) if(child!==null && child!==undefined) node.append(child instanceof Node?child:String(child));
  return node;
}
export const app=document.querySelector('#app');
export function notify(text) {
  const node=document.querySelector('#notice');
  node.textContent=text;node.hidden=false;
  clearTimeout(notify.timer);notify.timer=setTimeout(()=>node.hidden=true,7000);
}
export function heading(title,description) {
  app.replaceChildren(el('h1',{},title));
  if(description) app.append(el('p',{},description));
}
export function money(value) {
  return value==null?'Consultar precio':new Intl.NumberFormat('es-NI',{style:'currency',currency:'USD'}).format(value);
}
export function label(value) {
  const names={IdMarca:'Marca',IdModelo:'Modelo',IdVehiculo:'Vehículo',IdCliente:'Cliente',IdProveedor:'Proveedor',IdTipoCosto:'Tipo de costo',NombreUsuario:'Correo de acceso',Activo:'Activo',Activa:'Activa'};
  return names[value]||value.replace(/([a-záéíóú])([A-Z])/g,'$1 $2').replace(/^Id/,'Código ');
}
export function table(rows,actions) {
  if(!rows.length) return el('p',{class:'empty'},'No hay registros para mostrar.');
  const keys=Object.keys(rows[0]);
  return el('div',{class:'table-wrap'},el('table',{},
    el('thead',{},el('tr',{},...keys.map(k=>el('th',{},label(k))),...(actions?[el('th',{},'Acciones')]:[]))),
    el('tbody',{},...rows.map(row=>el('tr',{},...keys.map(k=>el('td',{},typeof row[k]==='boolean'?(row[k]?'Sí':'No'):row[k]??'—')),...(actions?[el('td',{},actions(row))]:[]))))));
}
