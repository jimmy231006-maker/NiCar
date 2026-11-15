import { conexion } from './base-datos.js';
import { exigirRol, responderJson, personal, administradores } from './respuestas.js';
const configuracion = {
  Marca: ['IdMarca', '"Nombre"'],
  Modelo: ['IdModelo', '"Nombre"'],
  Vehiculo: ['IdVehiculo', 'concat("IdentificadorUnico",\' · \',"Anio")'],
  Cliente: ['IdCliente', 'coalesce("RazonSocial",concat("Nombres",\' \',"Apellidos"))'],
  Proveedor: ['IdProveedor', '"NombreProveedor"'],
  Financiera: ['IdFinanciera', '"Nombre"'],
  Venta: ['IdVenta', '"NumeroComprobante"'],
  TipoCosto: ['IdTipoCosto', '"Nombre"']
};
export async function atenderListas(solicitud, respuesta, ruta, usuario) {
  const tabla = ruta.split('/')[3];
  if (['Colaborador','ContratoColaborador'].includes(tabla) && solicitud.method === 'GET') {
    exigirRol(usuario, administradores);
    const sql = tabla === 'Colaborador'
      ? 'SELECT "IdUsuario" AS id,"NombreCompleto" AS label FROM nicar."Usuario" WHERE "Activo" AND "Rol"<>\'Cliente\' ORDER BY label'
      : 'SELECT "IdContrato" AS id,concat("NumeroContrato",\' · \',"Cargo") AS label FROM nicar."ContratoColaborador" WHERE "Activo" AND "Estado"=\'Activo\' ORDER BY label';
    responderJson(respuesta,(await conexion.query(sql)).rows);
    return true;
  }
  if (ruta === '/api/listas/Vendedor' && solicitud.method === 'GET') {
    exigirRol(usuario, administradores);
    const resultado = await conexion.query(
      'SELECT "IdUsuario" AS id,"NombreCompleto" AS label FROM nicar."Usuario" WHERE "Activo" AND "Rol"=\'Vendedor\' ORDER BY "NombreCompleto"'
    );
    responderJson(respuesta, resultado.rows);
    return true;
  }
  if (ruta === '/api/listas/Venta' && solicitud.method === 'GET') {
    exigirRol(usuario, [...administradores, 'Vendedor', 'Caja']);
    const filas = await conexion.query(
      `SELECT "IdVenta" AS id,"NumeroComprobante" || ' · USD ' ||
       to_char(coalesce("Total","PrecioVenta"-"Descuento"),'FM999,999,990.00') AS label
       FROM nicar."Venta" WHERE "Activa" AND ($1::integer IS NULL OR "IdVendedor"=$1)
       ORDER BY "IdVenta" DESC LIMIT 1000`,
      [usuario.Rol === 'Vendedor' ? usuario.IdUsuario : null]
    );
    responderJson(respuesta, filas.rows);
    return true;
  }
  if (!ruta.startsWith('/api/listas/') || !configuracion[tabla] || solicitud.method !== 'GET') return false;
  exigirRol(usuario, tabla === 'Financiera'
    ? [...administradores, 'Vendedor']
    : tabla === 'Vehiculo' || tabla === 'Modelo'
      ? [...personal, 'Bodega']
      : tabla === 'Cliente' ? personal : administradores);
  if (tabla === 'Financiera') {
    const resultado = await conexion.query(
      'SELECT "IdFinanciera" AS id,"Nombre" AS label,"PlazoMinimoMeses","PlazoMaximoMeses" FROM nicar."Financiera" WHERE "Activo" ORDER BY "Nombre"'
    );
    responderJson(respuesta, resultado.rows);
    return true;
  }
  const [clave, texto] = configuracion[tabla];
  const filas = await conexion.query(
    'SELECT "' + clave + '" AS id,' + texto + ' AS label FROM nicar."' + tabla + '" WHERE "Activo" ORDER BY label'
  );
  responderJson(respuesta, filas.rows);
  return true;
}
