import { app,el,heading,money,notify } from './dom.js';
import { api,state } from './api.js';
import { field,form } from './forms.js';
import { phone,today } from './validation.js';
export async function catalogPage() {
  state.cars=await api('/catalog');
  const grid=el('div',{class:'grid'});
  const search=el('input',{type:'search',placeholder:'Buscar por marca, modelo o año','aria-label':'Buscar vehículos'});
  const draw=()=>{
    const q=search.value.trim().toLocaleLowerCase('es');
    const rows=state.cars.filter(c=>(c.Marca+' '+c.Modelo+' '+c.Anio).toLocaleLowerCase('es').includes(q));
    grid.replaceChildren(...rows.map(car=>el('article',{class:'car'},photo(car),
      el('div',{class:'car-content'},el('h2',{},car.Anio+' '+car.Marca+' '+car.Modelo),
        el('p',{},car.Ubicacion||'Nicaragua'),el('p',{},car.Kilometraje+' km · '+car.Transmision),
        el('strong',{class:'price'},money(car.PrecioOferta)),el('a',{class:'button',href:'#vehicle/'+car.IdVehiculo},'Ver vehículo')))));
    if(!rows.length) grid.append(el('p',{class:'empty'},q?'No encontramos vehículos con esa búsqueda.':'El inventario disponible aparecerá aquí.'));
  };
  search.oninput=draw;
  const hero=el('section',{class:'hero'},el('p',{class:'eyebrow'},'Vehículos en Nicaragua'),
    el('h1',{},'Tu próximo camino empieza aquí.'),
    el('p',{},'Explorá el catálogo y agendá una visita para conocer el vehículo en persona.'),
    el('div',{class:'search'},search));
  app.replaceChildren(hero,grid);draw();
}
function photo(car) {
  const node=el('div',{class:'photo'});
  if(car.ImagenUrl && /^https?:\/\//.test(car.ImagenUrl)) {
    const img=el('img',{src:car.ImagenUrl,alt:car.Marca+' '+car.Modelo,loading:'lazy'});
    img.onerror=()=>node.replaceChildren('NiCar');node.append(img);
  } else node.textContent='NiCar';
  return node;
}
export async function vehiclePage(id) {
  if(!state.cars.length) state.cars=await api('/catalog');
  const car=state.cars.find(c=>String(c.IdVehiculo)===id);
  if(!car) throw new Error('El vehículo ya no está disponible.');
  heading(car.Anio+' '+car.Marca+' '+car.Modelo);
  app.prepend(el('a',{href:'#catalog'},'Volver al catálogo'));
  const specs=['Kilometraje','Transmision','Combustible','TipoCarroceria','Traccion','ColorExterior'];
  const panel=el('section',{class:'card'},el('strong',{class:'price'},money(car.PrecioOferta)),
    el('p',{},car.Ubicacion||'Nicaragua'),el('div',{class:'specs'},...specs.map(k=>el('div',{},el('small',{},k),String(car[k]??'—')))));
  if(state.user?.Rol==='Cliente') {
    panel.append(form([field('Telefono',{required:true,max:16,type:'tel',label:'Teléfono de contacto'}),
      field('Inicio',{required:true,type:'datetime-local',min:today()+'T00:00',step:3600,label:'Fecha y hora de Nicaragua'})],async data=>{
        phone(data.Telefono);await api('/appointments','POST',{...data,IdVehiculo:Number(id)});
        notify('Visita agendada. Podés verla en Mis citas.');location.hash='#appointments';
      },'Agendar visita'));
    panel.append(el('p',{},'Hasta diez visitas por día. Los horarios comienzan a la hora en punto.'));
  } else if(!state.user) panel.append(el('a',{class:'button',href:'#login',onClick:()=>sessionStorage.setItem('nicar-return','#vehicle/'+id)},'Iniciar sesión para agendar'));
  app.append(el('div',{class:'detail'},photo(car),panel));
}
