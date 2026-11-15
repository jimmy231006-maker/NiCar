import { crearVehiculo } from './modelos/crear-vehiculo.js';
import { conexion, ejecutarTransaccion } from './base-datos.js';
import {
  rechazar,
  responderJson,
  leerFormulario,
  exigirRol,
  personal
} from './respuestas.js';
import { validaciones } from './validaciones.js';
export async function atenderCatalogo(solicitud, respuesta, ruta, usuario) {
  if (ruta === '/api/marcas' && solicitud.method === 'GET') {
    responderJson(respuesta, (await conexion.query(
      'SELECT "IdMarca","Nombre" FROM nicar."Marca" WHERE "Activo" ORDER BY "Nombre"'
    )).rows);
    return true;
  }
  if (ruta === '/api/catalogo' && solicitud.method === 'GET') {
    const resultado =
      await conexion.query(`SELECT v."IdVehiculo",v."Anio",v."Version",v."Condicion",v."EstadoMatricula",v."ColorExterior",v."Transmision",
      v."Traccion",v."Combustible",v."Kilometraje",v."TipoCarroceria",v."PrecioOferta",v."ImagenUrl",v."Ubicacion",v."NumeroPuertas",v."CilindrajeCc",v."PotenciaKw",v."NumeroAsientos",v."Observaciones",v."FuenteImagen",v."AutorImagen",v."LicenciaImagen",v."FotoReferencia",
      m."Nombre" AS "Modelo",b."Nombre" AS "Marca" FROM nicar."Vehiculo" v
      JOIN nicar."Modelo" m USING ("IdModelo") JOIN nicar."Marca" b USING ("IdMarca")
      WHERE v."Activo" AND v."Estado"='Disponible' AND m."Activo" AND b."Activo" ORDER BY v."FechaRegistro" DESC`);
    responderJson(respuesta, resultado.rows.map(datos => crearVehiculo(datos).obtenerFicha()));
    return true;
  }
  if (ruta !== '/api/citas') {
    return false;
  }
  if (solicitud.method !== 'POST') {
    return false;
  }
  exigirRol(usuario, ['Cliente']);
  const datos = await leerFormulario(solicitud);
  validaciones.validarCita(datos);
  const resultado = await ejecutarTransaccion(async (baseDatos) => {
    const { rows: filas } = await baseDatos.query(
      `SELECT v."IdVehiculo" FROM nicar."Vehiculo" v
      JOIN nicar."Modelo" m USING ("IdModelo") JOIN nicar."Marca" b USING ("IdMarca")
      WHERE v."IdVehiculo"=$1 AND v."Activo" AND v."Estado"='Disponible' AND m."Activo" AND b."Activo"
      FOR SHARE OF v,m,b`,
      [datos.IdVehiculo]
    );
    if (!filas.length) {
      rechazar('El vehículo ya no está disponible.');
    }
    return baseDatos.query(
      `INSERT INTO nicar."Cita" ("IdVehiculo","IdUsuario","Telefono","Inicio")
      VALUES ($1,$2,$3,$4) RETURNING "IdCita","Inicio"`,
      [datos.IdVehiculo, usuario.IdUsuario, datos.Telefono, datos.Inicio]
    );
  });
  responderJson(respuesta, resultado.rows[0], 201);
  return true;
}
