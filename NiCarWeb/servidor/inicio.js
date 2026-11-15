import { atenderCitas } from './citas.js';
import { atenderImagenes } from './imagenes.js';
import { atenderComisiones } from './comisiones.js';
import { atenderAuditoria } from './auditoria.js';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { conexion, prepararBaseDatos } from './base-datos.js';
import { responderJson, rechazar, responderError } from './respuestas.js';
import { obtenerSesion } from './sesion.js';
import { atenderAutenticacion } from './autenticacion.js';
import { atenderCatalogo } from './catalogo.js';
import { atenderAdministracion } from './administracion.js';
import { atenderUsuarios } from './usuarios.js';
import { atenderListas } from './listas.js';
import { atenderKardex } from './kardex.js';
import { atenderCreditos } from './creditos.js';
const carpetaPublica = resolve('publico');
const tiposContenido = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json'
};
const solicitudesPorOrigen = new Map();
function limitarSolicitudes(solicitud) {
  const clave = solicitud.socket.remoteAddress;
  const ahora = Date.now();
  const registro = solicitudesPorOrigen.get(clave);
  if (!registro || registro.until < ahora) {
    solicitudesPorOrigen.set(clave, { count: 1, until: ahora + 60000 });
  } else if (++registro.count > 120) {
    rechazar('Demasiadas solicitudes. Esperá un minuto.', 429);
  }
  if (solicitudesPorOrigen.size > 10000) {
    for (const [clave, valor] of solicitudesPorOrigen) {
      if (valor.until < ahora) {
        solicitudesPorOrigen.delete(clave);
      }
    }
  }
}
const servidor = createServer(async (solicitud, respuesta) => {
  respuesta.setHeader('X-Content-Type-Options', 'nosniff');
  respuesta.setHeader('Referrer-Policy', 'same-origin');
  respuesta.setHeader('X-Frame-Options', 'DENY');
  respuesta.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' https: http:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; form-action 'self'"
  );
  try {
    const ruta = new URL(solicitud.url, 'http://localhost').pathname;
    if (ruta.startsWith('/imagenes/')) {
      if (await atenderImagenes(solicitud, respuesta, ruta, null)) return;
      rechazar('Imagen no encontrada.', 404);
    }
    if (ruta.startsWith('/api/')) {
      limitarSolicitudes(solicitud);
      if (!['GET', 'HEAD'].includes(solicitud.method)) {
        const esperado = process.env.APP_ORIGIN;
        const origen = solicitud.headers.origin;
        if (!esperado || origen !== esperado) {
          rechazar('Origen de solicitud no autorizado.', 403);
        }
        if (ruta !== '/api/imagenes' && !solicitud.headers['content-type']?.startsWith('application/json')) {
          rechazar('Usá un formulario JSON.', 415);
        }
      }
      if (ruta === '/api/health') {
        await conexion.query('SELECT 1');
        responderJson(respuesta, { ok: true });
        return;
      }
      const usuario = await obtenerSesion(solicitud);
      if (
        usuario?.DebeCambiarContrasena &&
        ![
          '/api/sesion',
          '/api/autenticacion/contrasena',
          '/api/autenticacion/salir'
        ].includes(ruta)
      ) {
        rechazar('Cambiá tu contraseña temporal para continuar.', 403);
      }
      for (const atenderRuta of [
        atenderAutenticacion,
        atenderCitas,
        atenderCatalogo,
        atenderAdministracion,
        atenderUsuarios,
        atenderListas,
        atenderComisiones,
        atenderAuditoria,
        atenderImagenes,
        atenderKardex,
        atenderCreditos
      ]) {
        if (await atenderRuta(solicitud, respuesta, ruta, usuario)) {
          return;
        }
      }
      rechazar('Ruta no encontrada.', 404);
    }
    if (!['GET', 'HEAD'].includes(solicitud.method)) {
      rechazar('Método no permitido.', 405);
    }
    const archivo = resolve(
      carpetaPublica,
      '.' + decodeURIComponent(ruta === '/' ? '/inicio.html' : ruta)
    );
    if (
      !archivo.startsWith(carpetaPublica + '/') &&
      !archivo.startsWith(carpetaPublica + '\\')
    ) {
      rechazar('Ruta inválida.', 404);
    }
    const contenidoArchivo = await readFile(archivo);
    respuesta.writeHead(200, {
      'Content-Type': tiposContenido[extname(archivo)] || 'application/octet-stream'
    });
    respuesta.end(solicitud.method === 'HEAD' ? undefined : contenidoArchivo);
  } catch (problema) {
    if (problema.code === 'ENOENT') {
      ((problema.status = 404), (problema.message = 'Archivo no encontrado.'));
    }
    responderError(respuesta, problema);
  }
});
if (process.env.DATABASE_URL) {
  await prepararBaseDatos();
}
servidor.listen(Number(process.env.PORT || 3000), '0.0.0.0', () =>
  console.log('NiCar disponible en puerto ' + (process.env.PORT || 3000))
);
