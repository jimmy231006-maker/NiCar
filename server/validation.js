import schema from './schema.json' with { type: 'json' };
import { name, email, phone, birthFromCedula, today } from '../public/js/validation.js';
import { readFile } from 'node:fs/promises';
import { fail } from './http.js';
const codes = JSON.parse(await readFile(new URL('../public/js/codigos.json',import.meta.url)));
export const options = {
  TipoCliente:['Natural','Juridica'],TipoIdentificacion:['Cedula','RUC','Pasaporte','Otro'],
  TipoProveedor:['Empresa','Persona'],Moneda:['USD','NIO'],MetodoPago:['Efectivo','Transferencia','Tarjeta','Financiamiento'],
  Transmision:['Automática','Manual','CVT'],Traccion:['4x2','4x4','AWD','FWD','RWD'],
  Combustible:['Gasolina','Diésel','Híbrido','Eléctrico','Híbrido enchufable'],
  TipoCarroceria:['Sedán','SUV','Pickup','Hatchback','Camioneta','Coupe','Van']
};
export const hidden = ['FechaRegistro','Estado','EstadoMatricula','UsuarioRegistro','NumeroComprobante','FechaVenta','MontoNIO'];
export function fields(table) { return schema[table].filter(c=>!c.generated && !hidden.includes(c.name)); }
export function validate(table,input,creating) {
  const data = {};
  for (const column of fields(table)) {
    const key = column.name;
    if (key === 'Activo' || key === 'Activa') {
      if (creating) data[key] = true;
      continue;
    }
    let value = input[key];
    if (typeof value === 'string') value=value.trim();
    if (value === '' || value == null) {
      if (column.required && !column.default) fail('Completá '+key+'.');
      data[key]=null; continue;
    }
    if (column.type === 'boolean') {
      if (typeof value !== 'boolean') fail('Revisá '+key+'.');
    } else if (['integer','bigint','smallint','numeric'].includes(column.type)) {
      if (!Number.isFinite(Number(value)) || Number(value)<0 || Number(value)>999999999999) fail('Revisá '+key+'.');
      value=Number(value);
      if (column.type !== 'numeric' && !Number.isSafeInteger(value)) fail('Ingresá un número entero en '+key+'.');
      if (key.startsWith('Id') && value<1) fail('Seleccioná '+key+'.');
      if (column.type === 'numeric' && !/^\d+(\.\d{1,6})?$/.test(String(value))) fail('Revisá la precisión de '+key+'.');
      if (key !== 'TasaCambio' && column.type === 'numeric' && Math.abs(value*100-Math.round(value*100))>0.0001) fail('Usá hasta dos decimales en '+key+'.');
    } else if (column.type === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value>today() || !Number.isFinite(Date.parse(value)) ||
          new Date(value).toISOString().slice(0,10)!==value) fail('Ingresá una fecha válida hasta hoy.');
    } else {
      if (typeof value !== 'string' || value.length>(column.max||500) || /[\u0000-\u001f]/.test(value)) fail('Revisá '+key+'.');
    }
    if (options[key] && !options[key].includes(value)) fail('Seleccioná una opción válida en '+key+'.');
    if (['Nombre','NombreProveedor','Pais','PaisOrigen','Ciudad','RazonSocial','ColorExterior','ColorInterior','Ubicacion'].includes(key) &&
        !/\p{L}/u.test(value)) fail(key+' debe contener letras.');
    if (['Nombres','Apellidos','Contacto'].includes(key)) name(value);
    if (key === 'Correo') email(value);
    if (key === 'Telefono') phone(value);
    data[key]=value;
  }
  if (table==='Vehiculo') {
    if (data.Anio<1950 || data.Anio>new Date().getFullYear()+1) fail('Revisá el año del vehículo.');
    if (data.VIN && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(data.VIN)) fail('El VIN requiere 17 caracteres y excluye I, O y Q.');
    for (const k of ['VIN','NumeroChasis','Placa','IdentificadorUnico']) if(data[k]) data[k]=data[k].toUpperCase();
    if (data.ImagenUrl && !/^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(data.ImagenUrl)) fail('La imagen requiere una URL HTTP o HTTPS.');
  }
  if (table==='Cliente') {
    if(data.TipoCliente==='Natural') {
      name(data.Nombres); name(data.Apellidos);
      if(data.RazonSocial) fail('La persona natural usa nombres y apellidos.');
    } else if (!data.RazonSocial || data.Nombres || data.Apellidos || data.TipoIdentificacion!=='RUC') fail('La empresa requiere razón social y RUC.');
    if(data.TipoIdentificacion==='Cedula') {
      const b=birthFromCedula(data.NumeroIdentificacion,codes);
      if(b.age<16) fail('Revisá la edad de la cédula.');
      data.NumeroIdentificacion=b.value;
    }
  }
  if(table==='Proveedor' && data.TipoProveedor==='Persona') name(data.NombreProveedor);
  if(['AdquisicionVehiculo','CostoVehiculo'].includes(table)) {
    if(data[table==='CostoVehiculo'?'Monto':'PrecioCompra']<=0 || data.TasaCambio<=0) fail('Monto y tasa deben ser positivos.');
    if(data.Moneda==='NIO') data.TasaCambio=1;
    if(table==='CostoVehiculo') data.MontoNIO=Math.round(data.Monto*data.TasaCambio*100)/100;
  }
  if(table==='Venta' && (data.PrecioVenta<=0 || data.Descuento>data.PrecioVenta)) fail('Revisá precio y descuento.');
  return data;
}
export function ageOfCedula(value) { return birthFromCedula(value,codes).age; }
export default schema;
