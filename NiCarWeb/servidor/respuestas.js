export function rechazar(message, status = 400) {
  const problema = new Error(message);
  problema.status = status;
  throw problema;
}
export function responderJson(respuesta, datos, status = 200) {
  respuesta.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  respuesta.end(JSON.stringify(datos));
}
export async function leerFormulario(solicitud) {
  let texto = '';
  for await (const parte of solicitud) {
    texto += parte;
    if (Buffer.byteLength(texto) > 32768) {
      rechazar('Formulario demasiado grande.', 413);
    }
  }
  try {
    return JSON.parse(texto || '{}');
  } catch {
    rechazar('Formulario inválido.');
  }
}
export function exigirRol(usuario, roles) {
  if (!usuario) {
    rechazar('Iniciá sesión para continuar.', 401);
  }
  if (!roles.includes(usuario.Rol)) {
    rechazar('No tenés permiso para esta acción.', 403);
  }
}
export const personal = [
  'SuperAdministrador',
  'Administrador',
  'Vendedor',
  'Recepcionista'
];
export const administradores = ['SuperAdministrador', 'Administrador'];
export function responderError(respuesta, problema) {
  const messages = {
    23505: 'Ese registro u horario ya existe.',
    23503: 'El registro está relacionado o la selección ya no existe.',
    23514: 'Los datos no cumplen las reglas del sistema.',
    P1800: 'Debés tener al menos 18 años.',
    P1801: 'La fecha o la hora ya pasó.',
    P1802: 'Se requiere una cuenta de cliente activa y mayor de edad.',
    P1810: 'No hay vendedor disponible para ese horario. Elegí otro.',
    P1811: 'Las citas son de lunes a sábado, entre las 8:00 y las 16:15.',
    P1901: 'La marca tiene modelos relacionados y no se puede desactivar.',
    P1902: 'El vendedor tiene citas futuras. Deben atenderse o reasignarse antes de desactivarlo.'
  };
  if (!problema.status && !messages[problema.code]) {
    console.error('Error del servidor', problema.code || problema.name);
  }
  responderJson(
    respuesta,
    {
      error:
        messages[problema.code] ||
        (problema.status ? problema.message : 'No se pudo completar la operación.')
    },
    problema.status || (messages[problema.code] ? 400 : 500)
  );
}
