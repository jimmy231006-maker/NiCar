import { randomBytes, pbkdf2, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derivarClave = promisify(pbkdf2);
export const resumirToken = (valor) => createHash('sha256').update(valor).digest('hex');
export const crearToken = () => randomBytes(32).toString('hex');
export async function crearCredenciales(
  contrasena,
  sal = randomBytes(16).toString('base64')
) {
  const resumen = await derivarClave(
    contrasena,
    Buffer.from(sal, 'base64'),
    210000,
    32,
    'sha256'
  );
  return { Salt: sal, HashContrasena: resumen.toString('base64') };
}
export async function verificarContrasena(contrasena, usuario) {
  const { HashContrasena } = await crearCredenciales(contrasena, usuario.Salt);
  const esperado = Buffer.from(usuario.HashContrasena, 'base64');
  const calculado = Buffer.from(HashContrasena, 'base64');
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}
export function guardarCookie(respuesta, token, segundos = 1800) {
  respuesta.setHeader(
    'Set-Cookie',
    `nicar=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${segundos}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );
}
