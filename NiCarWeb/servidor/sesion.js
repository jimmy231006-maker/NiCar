import { conexion } from './base-datos.js';
import { resumirToken } from './credenciales.js';
export async function obtenerSesion(solicitud) {
  const token = /(?:^|;\s*)nicar=([a-f0-9]{64})(?:;|$)/.exec(
    solicitud.headers.cookie || ''
  )?.[1];
  if (!token) {
    return null;
  }
  const resultado = await conexion.query(
    `SELECT u."IdUsuario",u."NombreCompleto",u."NombreUsuario",u."Rol",
    u."DebeCambiarContrasena",u."Cedula",u."Nacimiento",u."IdCliente",c."Nombres",c."Apellidos",c."Telefono"
    FROM nicar."SesionWeb" s JOIN nicar."Usuario" u USING ("IdUsuario")
    LEFT JOIN nicar."Cliente" c ON c."IdCliente"=u."IdCliente"
    WHERE s."Token"=$1 AND s."Expira">now() AND u."Activo"`,
    [resumirToken(token)]
  );
  return resultado.rows[0] || null;
}
