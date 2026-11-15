import { conexion, ejecutarTransaccion } from './base-datos.js';
import { exigirRol, personal, responderJson, leerFormulario } from './respuestas.js';
import { ServicioCitas } from './servicios/servicio-citas.js';

export async function atenderCitas(solicitud, respuesta, ruta, usuario) {
  const coincidencia = /^\/api\/citas(?:\/(\d+)(\/cliente)?)?$/.exec(ruta);
  if (!coincidencia || (solicitud.method === 'POST' && !coincidencia[1])) return false;
  exigirRol(usuario,[...personal,'Cliente']);
  const [,codigo,cliente] = coincidencia;
  if (solicitud.method === 'GET' && cliente) {
    responderJson(respuesta,await new ServicioCitas(conexion).obtenerCliente(codigo,usuario));
  } else if (solicitud.method === 'GET' && !codigo) {
    responderJson(respuesta,await new ServicioCitas(conexion).listar(usuario));
  } else if (codigo && ['PUT','DELETE'].includes(solicitud.method)) {
    const datos = await leerFormulario(solicitud);
    await ejecutarTransaccion(baseDatos => new ServicioCitas(baseDatos)
      .actualizar(codigo,datos,usuario,solicitud.method==='DELETE'));
    responderJson(respuesta,{message:'Cita actualizada.'});
  } else return false;
  return true;
}
