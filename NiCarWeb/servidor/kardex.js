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
    UNION ALL
    SELECT v."FechaRegistro"::date,'Saldo inicial','Existencia de demostración',
      v."IdentificadorUnico",NULL::numeric,NULL::varchar
    FROM nicar."Vehiculo" v
    WHERE v."Activo" AND v."Estado"='Disponible'
      AND NOT EXISTS (
        SELECT 1 FROM nicar."AdquisicionVehiculo" a
        WHERE a."IdVehiculo"=v."IdVehiculo"
      )
      AND NOT EXISTS (
        SELECT 1 FROM nicar."Venta" s
        WHERE s."IdVehiculo"=v."IdVehiculo" AND s."Activa"
      )
  ) movimientos ORDER BY "Fecha" DESC LIMIT 1000`);
  responderJson(respuesta, resultado.rows);
  return true;
}
