import { conexion } from './base-datos.js';
import { exigirRol, responderJson, administradores } from './respuestas.js';
import { validaciones } from './validaciones.js';
import { ServicioComisiones } from './servicios/servicio-comisiones.js';

export async function atenderComisiones(solicitud, respuesta, ruta, usuario) {
  if (ruta !== '/api/comisiones' || solicitud.method !== 'GET') {
    return false;
  }
  exigirRol(usuario, [...administradores, 'Vendedor']);
  const consulta = new URL(solicitud.url, 'http://localhost').searchParams;
  const mes = consulta.get('mes') || validaciones.fechaDeHoy().slice(0, 7);
  const servicio = new ServicioComisiones(conexion);
  responderJson(respuesta, await servicio.consultarMes(mes, usuario));
  return true;
}
