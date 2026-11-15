import { randomBytes, pbkdf2, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(pbkdf2);
export const tokenHash = value => createHash('sha256').update(value).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
export async function credential(password, salt = randomBytes(16).toString('base64')) {
  const hash = await derive(password, Buffer.from(salt, 'base64'), 210000, 32, 'sha256');
  return { Salt: salt, HashContrasena: hash.toString('base64') };
}
export async function verify(password, user) {
  const { HashContrasena } = await credential(password, user.Salt);
  const expected = Buffer.from(user.HashContrasena, 'base64');
  const actual = Buffer.from(HashContrasena, 'base64');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function cookie(res, token, seconds = 1800) {
  res.setHeader('Set-Cookie', `nicar=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${seconds}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}
