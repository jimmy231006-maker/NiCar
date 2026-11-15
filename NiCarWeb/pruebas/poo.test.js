import test from 'node:test';
import assert from 'node:assert/strict';
import { IRepositorio } from '../servidor/interfaces/IRepositorio.js';
import { RepositorioPostgres } from '../servidor/repositorios/repositorio-postgres.js';
import { RepositorioVentas } from '../servidor/repositorios/repositorio-ventas.js';
import { Persona } from '../servidor/modelos/persona.js';
import { Cliente } from '../servidor/modelos/cliente.js';
import { Empleado } from '../servidor/modelos/empleado.js';
import { Validaciones } from '../publico/clases/validaciones.js';
import { crearPago } from '../servidor/pagos/crear-pago.js';
import { crearVehiculo } from '../servidor/modelos/crear-vehiculo.js';
import { AmortizadorFrances } from '../publico/clases/amortizador-frances.js';

test('los contratos y clases abstractas no se instancian directamente', () => {
  assert.throws(() => new IRepositorio(), TypeError);
  assert.throws(() => new Persona('Ana López', 'ana@example.com'), TypeError);
});

test('las clases hijas heredan y sobrescriben obtenerDatos', () => {
  const personas = [
    new Cliente('Ana López', 'ANA@example.com', '0010101900001A', '1990-01-01'),
    new Empleado('Jimmy', 'jimmy@example.com', 'Administrador')
  ];
  const perfiles = personas.map(persona => persona.obtenerDatos());
  assert.ok(personas.every(persona => persona instanceof Persona));
  assert.deepEqual(perfiles.map(perfil => perfil.Rol), ['Cliente', 'Administrador']);
  assert.equal(perfiles[0].NombreUsuario, 'ana@example.com');
  assert.equal(perfiles[1].Cedula, undefined);
});

test('los campos privados no se modifican a través de los datos devueltos', () => {
  const cliente = new Cliente('Ana López', 'ana@example.com', '0010101900001A', '1990-01-01');
  const copia = cliente.obtenerDatos();
  copia.NombreCompleto = 'Otro nombre';
  assert.equal(cliente.nombre, 'Ana López');
  assert.equal(cliente.obtenerDatos().NombreCompleto, 'Ana López');
  assert.equal(Object.keys(cliente).length, 0);
});

test('repositorios polimórficos guardan mediante el mismo contrato', async () => {
  const consultas = [];
  const baseDatos = {
    async query(texto, parametros) {
      consultas.push({ texto, parametros });
      return { rows: [{ IdMarca: 1, Nombre: 'Toyota' }] };
    }
  };
  const repositorios = [
    new RepositorioPostgres(baseDatos, 'Marca'),
    new RepositorioVentas(baseDatos)
  ];
  assert.ok(repositorios.every(repositorio => repositorio instanceof IRepositorio));
  await repositorios[0].guardar({ Nombre: 'Toyota', Activo: true });
  assert.match(consultas[0].texto, /VALUES \(\$1,\$2\)/);
  assert.deepEqual(consultas[0].parametros, ['Toyota', true]);
  await assert.rejects(() => repositorios[1].guardar({}, 1));
  assert.equal(consultas.length, 1);
});

test('el repositorio rechaza entidades y campos ajenos al esquema', async () => {
  const baseDatos = { query() { throw new Error('No debe ejecutarse SQL.'); } };
  assert.throws(() => new RepositorioPostgres(baseDatos, 'UsuarioInexistente'));
  const repositorio = new RepositorioPostgres(baseDatos, 'Marca');
  await assert.rejects(() => repositorio.guardar({ 'Nombre"; DROP TABLE': 'x' }));
});

test('la clase Validaciones concentra las reglas sin exponer sus datos', () => {
  const validaciones = new Validaciones();
  validaciones.validarTelefono('88881234');
  assert.throws(() => validaciones.validarTelefono('28881234'), { status: 400 });
  assert.equal(Object.keys(validaciones).length, 0);
});

test('las ventas al cliente usan el tipo de cambio oficial vigente', () => {
  const pago = crearPago({
    PrecioVenta: 100,
    Descuento: 0,
    Moneda: 'USD',
    MetodoPago: 'Transferencia',
    ReferenciaPago: 'TRANSFER-1001'
  });
  const detalle = pago.obtenerDetalle();
  assert.equal(detalle.TasaCambio, 36.6243);
  assert.equal(detalle.TotalNIO, 3662.43);
});

test('la ficha distingue vehículos nuevos sin placa y usados por kilometraje', () => {
  const nuevo = crearVehiculo({
    Condicion: 'Nuevo', Marca: 'Toyota', Modelo: 'Corolla', Anio: 2026,
    Kilometraje: 0, EstadoMatricula: 'Pendiente'
  }).obtenerFicha();
  const usado = crearVehiculo({
    Condicion: 'Usado', Marca: 'Honda', Modelo: 'Civic', Anio: 2020,
    Kilometraje: 56000, EstadoMatricula: 'Matriculado'
  }).obtenerFicha();
  assert.match(nuevo.Descripcion, /Nuevo, sin placa/);
  assert.equal(nuevo.Caracteristicas['Kilometraje'], '0 km');
  assert.equal(usado.Caracteristicas['Kilometraje'], '56000 km');
});

test('el reporte de pago exige fecha, importe y referencia del banco', () => {
  const validaciones = new Validaciones();
  assert.equal(validaciones.validarPagoCredito({FechaPago:validaciones.fechaDeHoy(),MontoUSD:'125.50',Referencia:'TRX-10005'}),12550n);
  assert.throws(() => validaciones.validarPagoCredito({FechaPago:'9999-12-31',MontoUSD:'125.50',Referencia:'TRX-10005'}),{status:400});
});
