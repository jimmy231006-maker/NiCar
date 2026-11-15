export const personPattern = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;
export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Managua', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
}
export function birthFromCedula(input, groups, current = today()) {
  const value = String(input || '').replaceAll('-', '').trim().toUpperCase();
  if (!/^[0-9]{13}[A-HJ-NP-Y]$/.test(value)) throw new Error('Revisá el formato de la cédula.');
  if (value.slice(0,3) !== '888' && !Object.values(groups).flat().includes(value.slice(0,3)))
    throw new Error('Código municipal no reconocido.');
  const yearNow = Number(current.slice(0,4));
  let year = Math.floor(yearNow / 100) * 100 + Number(value.slice(7,9));
  if (year > yearNow) year -= 100;
  const month = value.slice(5,7), day = value.slice(3,5);
  const birth = `${year}-${month}-${day}`;
  const parsed = new Date(birth + 'T12:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== birth || birth > current)
    throw new Error('La cédula contiene una fecha inválida.');
  const age = yearNow - year - (current.slice(5) < birth.slice(5) ? 1 : 0);
  return { value, birth, age };
}
export function name(value) {
  if (!personPattern.test(String(value || '').trim())) throw new Error('El nombre solo admite letras, espacios, guiones y apóstrofes.');
}
export function email(value) {
  if (typeof value !== 'string' || value.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw new Error('Ingresá un correo electrónico válido.');
}
export function phone(value) {
  if (!/^\+?[0-9]{8,15}$/.test(String(value || ''))) throw new Error('El teléfono debe tener de 8 a 15 dígitos.');
}
export function password(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 100)
    throw new Error('La contraseña debe tener entre 12 y 100 caracteres.');
}
