export function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
export function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
export async function body(req) {
  let text = '';
  for await (const part of req) {
    text += part;
    if (Buffer.byteLength(text) > 32768) fail('Formulario demasiado grande.', 413);
  }
  try { return JSON.parse(text || '{}'); }
  catch { fail('Formulario inválido.'); }
}
export function requireRole(user, roles) {
  if (!user) fail('Iniciá sesión para continuar.', 401);
  if (!roles.includes(user.Rol)) fail('No tenés permiso para esta acción.', 403);
}
export const staff = ['SuperAdministrador','Administrador','Vendedor','Recepcionista'];
export const admins = ['SuperAdministrador','Administrador'];
export function errorResponse(res, error) {
  const messages = {
    '23505': 'Ese registro u horario ya existe.',
    '23503': 'El registro está relacionado o la selección ya no existe.',
    '23514': 'Los datos no cumplen las reglas del sistema.',
    P1800: 'Debés tener al menos 18 años.',
    P1801: 'La fecha o la hora ya pasó.',
    P1802: 'Se requiere una cuenta de cliente activa y mayor de edad.',
    P1810: 'Ese día ya tiene diez citas. Elegí otra fecha.'
  };
  if (!error.status && !messages[error.code]) console.error('Error del servidor', error.code || error.name);
  json(res, { error: messages[error.code] || (error.status ? error.message : 'No se pudo completar la operación.') }, error.status || (messages[error.code] ? 400 : 500));
}
