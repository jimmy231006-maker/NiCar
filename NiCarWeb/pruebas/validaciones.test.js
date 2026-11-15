import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  obtenerNacimiento,
  validarNombre,
  validarContrasena,
  validarTelefono
} from '../publico/scripts/validaciones.js';
import { Validaciones } from '../publico/clases/validaciones.js';
const codigos = JSON.parse(
  await readFile(new URL('../publico/scripts/codigos.json', import.meta.url))
);
test('edad desde la cédula y límite exacto del cumpleaños', () => {
  assert.equal(obtenerNacimiento('001-151108-0001A', codigos, '2026-11-14').age, 17);
  assert.equal(obtenerNacimiento('001-151108-0001A', codigos, '2026-11-15').age, 18);
});
test('rechaza fecha imposible y código territorial desconocido', () => {
  assert.throws(() => obtenerNacimiento('001-310200-0001A', codigos));
  assert.throws(() => obtenerNacimiento('999-010190-0001A', codigos));
});
test('nombres Unicode y contraseña mínima', () => {
  validarNombre('María López');
  validarNombre('Jean-Luc');
  assert.throws(() => validarNombre('12345'));
  assert.throws(() => validarContrasena('1234'));
  validarContrasena('UnaClaveDe12Caracteres');
});
test('teléfonos locales de ocho dígitos y prefijos permitidos', () => {
  for (const valor of ['58881234', '78881234', '88881234']) {
    validarTelefono(valor);
  }
  for (const valor of [
    '28881234',
    '68881234',
    '98881234',
    '8888123',
    '888812345',
    '+50588881234',
    '8888-1234',
    'abcdefgh',
    '8888 1234',
    ''
  ]) {
    assert.throws(() => validarTelefono(valor));
  }
});

test('el registro exige cédula válida y que la persona sea mayor de edad', () => {
  const reglas = new Validaciones(codigos);
  const persona = {
    Nombre: 'María López',
    Nombres: 'María',
    Apellidos: 'López',
    Telefono: '88881234',
    Correo: 'maria@example.com',
    Cedula: '001-151188-0001A',
    Contrasena: 'UnaClaveDe12Caracteres',
    Confirmacion: 'UnaClaveDe12Caracteres'
  };
  assert.equal(reglas.validarRegistro(persona).age >= 18, true);
  assert.throws(() => reglas.validarRegistro({ ...persona, Cedula: '' }));
  assert.throws(() => reglas.validarRegistro({ ...persona, Cedula: '001-151109-0001A' }));
});
