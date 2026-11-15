import test from 'node:test';
import assert from 'node:assert/strict';
import { validarDatos } from '../servidor/validaciones.js';
import { exigirRol } from '../servidor/respuestas.js';
test('marcas y modelos requieren letras, modelos alfanuméricos válidos', () => {
  assert.throws(() => validarDatos('Marca', { Nombre: '123' }, true));
  assert.throws(() => validarDatos('Modelo', { Nombre: '123', IdMarca: 1 }, true));
  assert.equal(
    validarDatos('Modelo', { Nombre: 'RAV4', IdMarca: 1 }, true).Nombre,
    'RAV4'
  );
});
test('se rechazan correos y nombres personales inválidos', () => {
  assert.throws(() =>
    validarDatos(
      'Cliente',
      {
        TipoCliente: 'Natural',
        TipoIdentificacion: 'Cedula',
        NumeroIdentificacion: '0010101900001A',
        Nombres: '123',
        Apellidos: 'López'
      },
      true
    )
  );
});
test('clientes no tienen permisos administrativos', () => {
  assert.throws(() => exigirRol({ Rol: 'Cliente' }, ['Administrador']), { status: 403 });
  assert.throws(() => exigirRol(null, ['Cliente']), { status: 401 });
});
test('las fechas imposibles y futuras son rechazadas', () => {
  assert.throws(() =>
    validarDatos(
      'AdquisicionVehiculo',
      {
        IdVehiculo: 1,
        IdProveedor: 1,
        FechaAdquisicion: '2026-02-31',
        PrecioCompra: 1,
        Moneda: 'USD',
        TasaCambio: 36
      },
      true
    )
  );
});
test('compras y costos usan la tasa comercial definida para el negocio', () => {
  const adquisicion = validarDatos('AdquisicionVehiculo', {
    IdVehiculo: 1, IdProveedor: 1, FechaAdquisicion: '2026-01-15',
    PrecioCompra: 1000, Moneda: 'USD'
  }, true);
  assert.equal(adquisicion.TasaCambio, 36.6);
  const costo = validarDatos('CostoVehiculo', {
    IdVehiculo: 1, IdTipoCosto: 1, Descripcion: 'Mantenimiento',
    FechaCosto: '2026-01-15', Monto: 1000, Moneda: 'NIO'
  }, true);
  assert.equal(costo.TasaCambio, 1);
  assert.equal(costo.MontoNIO, 1000);
});
