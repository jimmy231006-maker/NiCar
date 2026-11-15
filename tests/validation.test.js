import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { birthFromCedula,name,password } from '../public/js/validation.js';
const codes=JSON.parse(await readFile(new URL('../public/js/codigos.json',import.meta.url)));
test('edad desde la cédula y límite exacto del cumpleaños',()=>{
  assert.equal(birthFromCedula('001-151108-0001A',codes,'2026-11-14').age,17);
  assert.equal(birthFromCedula('001-151108-0001A',codes,'2026-11-15').age,18);
});
test('rechaza fecha imposible y código territorial desconocido',()=>{
  assert.throws(()=>birthFromCedula('001-310200-0001A',codes));
  assert.throws(()=>birthFromCedula('999-010190-0001A',codes));
});
test('nombres Unicode y contraseña mínima',()=>{
  name('María López');name("Jean-Luc");
  assert.throws(()=>name('12345'));
  assert.throws(()=>password('1234'));
  password('UnaClaveDe12Caracteres');
});
