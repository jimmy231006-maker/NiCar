import { conexion, ejecutarTransaccion } from './base-datos.js';
import { exigirRol, personal, responderJson, leerFormulario } from './respuestas.js';
import { ServicioCitas } from './servicios/servicio-citas.js';

export async function atenderCitas(solicitud, respuesta, ruta, usuario) {
  if (ruta === '/api/citas' && solicitud.method === 'POST') {
    exigirRol(usuario, ['Cliente']);
    const datos = await leerFormulario(solicitud);
    const cita = await ejecutarTransaccion(baseDatos =>
      new ServicioCitas(baseDatos).crear(datos, usuario)
    );
    responderJson(respuesta, { ...cita, message: 'Cita presencial reservada.' }, 201);
    return true;
  }
  if (ruta === '/api/citas/avisos' && solicitud.method === 'GET') {
    exigirRol(usuario, ['Cliente']);
    responderJson(respuesta, await new ServicioCitas(conexion).avisosCliente(usuario));
    return true;
  }
  const aviso = /^\/api\/citas\/avisos\/(\d+)$/.exec(ruta);
  if (aviso && solicitud.method === 'PUT') {
    exigirRol(usuario, ['Cliente']);
    await new ServicioCitas(conexion).marcarAvisoLeido(aviso[1], usuario);
    responderJson(respuesta, { message: 'Aviso le�do.' });
    return true;
  }
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

