import { app,el,heading,notify } from './dom.js';
import { field,form } from './forms.js';
import { api,refreshUser,state } from './api.js';
import { name,email,password,birthFromCedula } from './validation.js';
export async function authPage(mode) {
  heading(mode==='register'?'Crear cuenta':mode==='password'?'Cambiar contraseña':'Iniciar sesión');
  const specs=mode==='register'?
    [field('Nombre',{required:true,max:100,label:'Nombre completo'}),field('Correo',{type:'email',required:true,max:50}),
      field('Cedula',{required:true,max:16,label:'Cédula nicaragüense'}),field('Contrasena',{type:'password',required:true,max:100,label:'Contraseña (mínimo 12 caracteres)'}),
      field('Confirmacion',{type:'password',required:true,label:'Confirmar contraseña'})]:
    mode==='password'?[field('Actual',{type:'password',required:true,label:'Contraseña actual'}),field('Nueva',{type:'password',required:true,max:100,label:'Nueva contraseña (mínimo 12 caracteres)'})]:
      [field('Correo',{type:'email',required:true,max:50}),field('Contrasena',{type:'password',required:true,max:100,label:'Contraseña'})];
  const card=el('section',{class:'card auth'},form(specs,async data=>{
    if(mode==='register') {
      name(data.Nombre);email(data.Correo);password(data.Contrasena);
      const groups=await fetch('/js/codigos.json').then(r=>r.json());
      if(birthFromCedula(data.Cedula,groups).age<18) throw new Error('Debés tener 18 años cumplidos.');
    }
    await api('/auth/'+(mode==='password'?'password':mode==='register'?'register':'login'),'POST',data);
    await refreshUser();
    if(mode==='register') {notify('Cuenta creada. Iniciá sesión.');location.hash='#login';}
    else if(mode==='password') {notify('Contraseña actualizada. Iniciá sesión.');location.hash='#login';}
    else location.hash=state.user?.DebeCambiarContrasena?'#password':sessionStorage.getItem('nicar-return')||'#catalog';
  },mode==='register'?'Crear cuenta':mode==='password'?'Actualizar contraseña':'Ingresar'));
  if(mode==='login') card.append(el('p',{},el('a',{href:'#register'},'Crear cuenta de cliente')));
  if(mode==='register') card.prepend(el('p',{},'El registro y las visitas requieren 18 años cumplidos. La edad se calcula desde tu cédula.'));
  app.append(card);
}
