import { randomUUID } from 'node:crypto';
import { conexion } from './base-datos.js';
import { exigirRol, administradores, rechazar, responderJson } from './respuestas.js';
import { validaciones } from './validaciones.js';

function detectarTipo(contenido) {
  if (contenido.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return 'image/jpeg';
  if (contenido.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return 'image/png';
  }
  if (contenido.toString('ascii', 0, 4) === 'RIFF' &&
      contenido.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export async function atenderImagenes(solicitud, respuesta, ruta, usuario) {
  const coincidencia = /^\/imagenes\/([0-9a-f-]{36})$/.exec(ruta);
  if (coincidencia && solicitud.method === 'GET') {
    const resultado = await conexion.query(
      'SELECT "Contenido","Tipo" FROM nicar."ImagenVehiculo" WHERE "IdImagen"=$1',
      [coincidencia[1]]
    );
    const imagen = resultado.rows[0];
    if (!imagen) rechazar('Imagen no encontrada.', 404);
    respuesta.writeHead(200, {
      'Content-Type': imagen.Tipo,
      'Cache-Control': 'public, max-age=86400',
      'Content-Length': imagen.Contenido.length
    });
    respuesta.end(imagen.Contenido);
    return true;
  }
  if (ruta !== '/api/imagenes' || solicitud.method !== 'POST') return false;
  exigirRol(usuario, administradores);
  const partes = [];
  let tamano = 0;
  for await (const parte of solicitud) {
    tamano += parte.length;
    if (tamano > 3145728) rechazar('La fotografía supera los 3 MB.', 413);
    partes.push(parte);
  }
  const contenido = Buffer.concat(partes);
  const tipo = solicitud.headers['content-type'];
  validaciones.validarImagen(tipo, detectarTipo(contenido), tamano);
  const codigo = randomUUID();
  await conexion.query(
    'INSERT INTO nicar."ImagenVehiculo" ("IdImagen","Contenido","Tipo","IdUsuario") VALUES ($1,$2,$3,$4)',
    [codigo, contenido, tipo, usuario.IdUsuario]
  );
  responderJson(respuesta, { ruta: '/imagenes/' + codigo }, 201);
  return true;
}
