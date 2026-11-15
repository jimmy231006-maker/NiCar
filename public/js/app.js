import { app,el,notify,heading,table } from './dom.js';
import { api,state,refreshUser } from './api.js';
import { catalogPage,vehiclePage } from './catalog-ui.js';
import { authPage } from './auth-ui.js';
import { adminPage,appointmentsPage,usersPage,logsPage } from './admin-ui.js';
function menu() {
  const nav=document.querySelector('#navigation'),account=document.querySelector('#account');
  nav.replaceChildren(el('a',{href:'#catalog'},'Catálogo'));account.replaceChildren();
  if(state.user) {
    nav.append(el('a',{href:'#appointments'},state.user.Rol==='Cliente'?'Mis citas':'Agenda'));
    if(state.user.Rol!=='Cliente') nav.append(el('a',{href:'#admin'},'Administración'));
    if(['SuperAdministrador','Administrador','Bodega'].includes(state.user.Rol)) nav.append(el('a',{href:'#kardex'},'Kardex'));
    if(['SuperAdministrador','Administrador'].includes(state.user.Rol)) nav.append(el('a',{href:'#users'},'Cuentas'));
    if(state.user.Rol==='SuperAdministrador') nav.append(el('a',{href:'#logs'},'Auditoría'));
    account.append(el('span',{},state.user.NombreCompleto),el('a',{href:'#password'},'Contraseña'),
      el('button',{onClick:async()=>{try{await api('/auth/logout','POST',{});sessionStorage.removeItem('nicar-return');await refreshUser();location.hash='#catalog';await route();}catch(e){notify(e.message);}}},'Salir'));
  } else account.append(el('a',{href:'#login'},'Ingresar'),el('a',{href:'#register'},'Registrarme'));
}
let generation=0;
async function route() {
  const current=++generation;
  app.replaceChildren(el('p',{},'Cargando…'));
  try {
    await refreshUser();menu();
    const [path,id]=location.hash.slice(1).split('/');
    if(state.user?.DebeCambiarContrasena && path!=='password') {location.hash='#password';return;}
    if(current!==generation) return;
    if(path==='vehicle') await vehiclePage(id);
    else if(['login','register','password'].includes(path)) await authPage(path);
    else if(path==='admin') await adminPage(id);
    else if(path==='appointments') await appointmentsPage();
    else if(path==='users') await usersPage();
    else if(path==='logs') await logsPage();
    else if(path==='kardex') {heading('Kardex');app.append(table(await api('/kardex')));}
    else await catalogPage();
  } catch(error) {app.replaceChildren(el('h1',{},'No se pudo abrir esta página'),el('p',{role:'alert'},error.message),el('a',{href:'#catalog'},'Volver al catálogo'));}
}
window.addEventListener('hashchange',route);
await route();
