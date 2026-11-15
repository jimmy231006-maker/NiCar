import test from 'node:test';
import assert from 'node:assert/strict';
import { crearCredenciales, verificarContrasena } from '../servidor/credenciales.js';
test('PBKDF2 compatible y verificación de clave incorrecta', async () => {
  const clave = await crearCredenciales('UnaClaveLarga123');
  assert.equal(await verificarContrasena('UnaClaveLarga123', clave), true);
  assert.equal(await verificarContrasena('otra', clave), false);
});
