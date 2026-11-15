import { el,label,notify } from './dom.js';
export function field(key,options={}) {
  const input=options.choices?el('select',{name:key,id:key,required:options.required?'':undefined},
    el('option',{value:''},'Seleccioná'),...options.choices.map(x=>el('option',{value:typeof x==='object'?x.value:x},typeof x==='object'?x.label:x))):
    el('input',{id:key,name:key,type:options.type||'text',required:options.required?'':undefined,
      maxlength:options.max,min:options.min,step:options.step||undefined,autocomplete:options.autocomplete});
  if(key==='Telefono') {
    input.type='tel';
    input.maxLength=8;
    input.minLength=8;
    input.pattern='[578][0-9]{7}';
    input.inputMode='numeric';
    input.placeholder='88881234';
    input.title='Ocho dígitos, comenzando con 5, 7 u 8.';
  }
  if(options.value!=null) input.value=options.value;
  return el('div',{},el('label',{for:key},options.label||label(key)),input);
}
export function form(fields,submit,text='Guardar') {
  const error=el('p',{class:'error',role:'alert'});
  const button=el('button',{type:'submit'},text);
  const node=el('form',{},fields,error,button);
  node.addEventListener('submit',async event=>{
    event.preventDefault();error.textContent='';button.disabled=true;
    try { await submit(Object.fromEntries(new FormData(node))); }
    catch(e) { error.textContent=e.message; }
    finally { button.disabled=false; }
  });
  return node;
}
export function modal(title,fields,submit) {
  const dialog=document.querySelector('#dialog');
  document.querySelector('#modal-title').textContent=title;
  document.querySelector('#modal-fields').replaceChildren(...fields);
  const node=document.querySelector('#modal-form');
  const error=document.querySelector('#modal-error');
  error.textContent='';
  node.onsubmit=async event=>{
    event.preventDefault();
    const button=node.querySelector('button[type=submit]');button.disabled=true;error.textContent='';
    try { await submit(Object.fromEntries(new FormData(node)));dialog.close();notify('Guardado correctamente.'); }
    catch(e) { error.textContent=e.message; }
    finally { button.disabled=false; }
  };
  document.querySelector('#close-modal').onclick=()=>dialog.close();
  dialog.showModal();
}
