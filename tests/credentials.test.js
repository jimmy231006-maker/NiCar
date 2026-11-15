import test from 'node:test';
import assert from 'node:assert/strict';
import { credential,verify } from '../server/credentials.js';
test('PBKDF2 compatible y verificación de clave incorrecta',async()=>{
  const key=await credential('UnaClaveLarga123');
  assert.equal(await verify('UnaClaveLarga123',key),true);
  assert.equal(await verify('otra',key),false);
});
