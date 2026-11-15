import { pool, transaction } from './db.js';
import { fail, json, body } from './http.js';
import { credential, verify, newToken, tokenHash, cookie } from './credentials.js';
import { name, email, password, birthFromCedula } from '../public/js/validation.js';
import { readFile } from 'node:fs/promises';
const codes = JSON.parse(await readFile(new URL('../public/js/codigos.json', import.meta.url)));
const dummy = await credential(newToken());
export async function auth(req, res, path, user) {
  if (path === '/api/me' && req.method === 'GET') { json(res, user); return true; }
  if (!path.startsWith('/api/auth/') || req.method !== 'POST') return false;
  const data = await body(req);
  if (path.endsWith('/register')) {
    name(data.Nombre); email(data.Correo); password(data.Contrasena);
    if (data.Nombre.length > 100 || data.Correo.length > 50) fail('El nombre o correo es demasiado largo.');
    if (data.Confirmacion !== data.Contrasena) fail('Las contraseñas no coinciden.');
    const birth = birthFromCedula(data.Cedula, codes);
    if (birth.age < 18) fail('Debés tener 18 años cumplidos para registrarte.');
    const key = await credential(data.Contrasena);
    await pool.query(`INSERT INTO nicar."Usuario"
      ("NombreUsuario","NombreCompleto","Cedula","Nacimiento","Rol","HashContrasena","Salt","DebeCambiarContrasena")
      VALUES ($1,$2,$3,$4,'Cliente',$5,$6,false)`,
      [data.Correo.trim().toLowerCase(),data.Nombre.trim(),birth.value,birth.birth,key.HashContrasena,key.Salt]);
    json(res, { message:'Cuenta creada. Iniciá sesión.' }, 201);
  } else if (path.endsWith('/login')) {
    email(data.Correo);
    if (typeof data.Contrasena !== 'string' || data.Contrasena.length > 100) fail('Revisá tus credenciales.');
    const result = await transaction(async db => {
      const { rows } = await db.query(`SELECT *, "BloqueadoHasta" > (now() AT TIME ZONE 'UTC') AS blocked
        FROM nicar."Usuario" WHERE "NombreUsuario"=$1 FOR UPDATE`, [data.Correo.trim().toLowerCase()]);
      const account = rows[0];
      const valid = await verify(data.Contrasena, account || dummy);
      if (!account || !account.Activo || account.blocked || !valid) {
        if (account?.Activo && !account.blocked) {
          const attempts = account.BloqueadoHasta ? 1 : account.IntentosFallidos + 1;
          await db.query(`UPDATE nicar."Usuario" SET "IntentosFallidos"=$1,
            "BloqueadoHasta"=CASE WHEN $1>=5 THEN (now() AT TIME ZONE 'UTC')+interval '15 minutes' END
            WHERE "IdUsuario"=$2`, [attempts,account.IdUsuario]);
        }
        await db.query(`INSERT INTO nicar."LogAcceso" ("NombreIngresado","Evento") VALUES ($1,'Acceso fallido')`, [data.Correo.trim()]);
        return null;
      }
      await db.query(`UPDATE nicar."Usuario" SET "IntentosFallidos"=0,"BloqueadoHasta"=NULL WHERE "IdUsuario"=$1`, [account.IdUsuario]);
      await db.query(`INSERT INTO nicar."LogAcceso" ("IdUsuario","NombreIngresado","Evento") VALUES ($1,$2,'Inicio de sesión')`, [account.IdUsuario,account.NombreUsuario]);
      const token = newToken();
      await db.query(`DELETE FROM nicar."SesionWeb" WHERE "Expira"<now()`);
      await db.query(`INSERT INTO nicar."SesionWeb" VALUES ($1,$2,now()+interval '30 minutes')`, [tokenHash(token),account.IdUsuario]);
      return token;
    });
    if (!result) fail('Acceso denegado. Revisá tus datos o intentá después de 15 minutos.', 401);
    cookie(res,result); json(res,{ message:'Sesión iniciada.' });
  } else if (path.endsWith('/logout')) {
    const token = /nicar=([a-f0-9]{64})/.exec(req.headers.cookie || '')?.[1];
    if (token) await pool.query(`DELETE FROM nicar."SesionWeb" WHERE "Token"=$1`, [tokenHash(token)]);
    cookie(res,'',0); json(res,{ message:'Sesión cerrada.' });
  } else if (path.endsWith('/password')) {
    if (!user) fail('Iniciá sesión.',401);
    password(data.Nueva);
    const { rows } = await pool.query(`SELECT * FROM nicar."Usuario" WHERE "IdUsuario"=$1`, [user.IdUsuario]);
    if (!await verify(String(data.Actual || ''),rows[0])) fail('La contraseña actual no coincide.');
    const key = await credential(data.Nueva);
    await transaction(async db => {
      await db.query(`UPDATE nicar."Usuario" SET "HashContrasena"=$1,"Salt"=$2,"DebeCambiarContrasena"=false WHERE "IdUsuario"=$3`,[key.HashContrasena,key.Salt,user.IdUsuario]);
      await db.query(`DELETE FROM nicar."SesionWeb" WHERE "IdUsuario"=$1`,[user.IdUsuario]);
    });
    cookie(res,'',0); json(res,{ message:'Contraseña actualizada. Volvé a iniciar sesión.' });
  } else return false;
  return true;
}
