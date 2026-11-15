import { conexion } from './base-datos.js';
import { exigirRol, responderJson, administradores } from './respuestas.js';
export async function atenderKardex(solicitud, respuesta, ruta, usuario) {
  if (ruta !== '/api/kardex' || solicitud.method !== 'GET') {
    return false;
  }
  exigirRol(usuario, [...administradores, 'Bodega']);
  const resultado = await conexion.query(`SELECT * FROM (
    SELECT a."FechaAdquisicion" AS "Fecha",'Entrada' AS "Movimiento",
      'Compra #'||a."IdAdquisicion" AS "Referencia",v."IdentificadorUnico" AS "Vehiculo",
      a."PrecioCompra" AS "Monto",a."Moneda"
    FROM nicar."AdquisicionVehiculo" a JOIN nicar."Vehiculo" v USING ("IdVehiculo")
    UNION ALL
    SELECT s."FechaVenta",'Salida',s."NumeroComprobante",v."IdentificadorUnico",s."Total",s."Moneda"
    FROM nicar."Venta" s JOIN nicar."Vehiculo" v USING ("IdVehiculo")
    WHERE s."Activa"
  ) movimientos ORDER BY "Fecha" DESC LIMIT 1000`);
  responderJson(respuesta, resultado.rows);
  return true;
}
