import test from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../server/validation.js';
import { requireRole } from '../server/http.js';
test('marcas y modelos requieren letras, modelos alfanuméricos válidos',()=>{
  assert.throws(()=>validate('Marca',{Nombre:'123'},true));
  assert.throws(()=>validate('Modelo',{Nombre:'123',IdMarca:1},true));
  assert.equal(validate('Modelo',{Nombre:'RAV4',IdMarca:1},true).Nombre,'RAV4');
});
test('se rechazan correos y nombres personales inválidos',()=>{
  assert.throws(()=>validate('Cliente',{
    TipoCliente:'Natural',TipoIdentificacion:'Cedula',
    NumeroIdentificacion:'0010101900001A',Nombres:'123',Apellidos:'López'
  },true));
});
test('clientes no tienen permisos administrativos',()=>{
  assert.throws(()=>requireRole({Rol:'Cliente'},['Administrador']),{status:403});
  assert.throws(()=>requireRole(null,['Cliente']),{status:401});
});
test('las fechas imposibles y futuras son rechazadas',()=>{
  assert.throws(()=>validate('AdquisicionVehiculo',{
    IdVehiculo:1,IdProveedor:1,FechaAdquisicion:'2026-02-31',PrecioCompra:1,Moneda:'USD',TasaCambio:36
  },true));
});
