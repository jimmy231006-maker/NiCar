import { pool } from './db.js';
import { tokenHash } from './credentials.js';
export async function session(req) {
  const token = /(?:^|;\s*)nicar=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
  if (!token) return null;
  const result = await pool.query(`SELECT u."IdUsuario",u."NombreCompleto",u."NombreUsuario",u."Rol",
    u."DebeCambiarContrasena",u."Cedula",u."Nacimiento"
    FROM nicar."SesionWeb" s JOIN nicar."Usuario" u USING ("IdUsuario")
    WHERE s."Token"=$1 AND s."Expira">now() AND u."Activo"`, [tokenHash(token)]);
  return result.rows[0] || null;
}
