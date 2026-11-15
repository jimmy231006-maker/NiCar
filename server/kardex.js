import { pool } from './db.js';
import { requireRole,json,admins } from './http.js';
export async function kardex(req,res,path,user) {
  if(path!=='/api/kardex' || req.method!=='GET') return false;
  requireRole(user,[...admins,'Bodega']);
  const result=await pool.query(`SELECT * FROM (
    SELECT a."FechaAdquisicion" AS "Fecha",'Entrada' AS "Movimiento",
      'Compra #'||a."IdAdquisicion" AS "Referencia",v."IdentificadorUnico" AS "Vehiculo",
      a."PrecioCompra" AS "Monto",a."Moneda"
    FROM nicar."AdquisicionVehiculo" a JOIN nicar."Vehiculo" v USING ("IdVehiculo")
    UNION ALL
    SELECT s."FechaVenta",'Salida',s."NumeroComprobante",v."IdentificadorUnico",s."Total",s."Moneda"
    FROM nicar."Venta" s JOIN nicar."Vehiculo" v USING ("IdVehiculo")
    WHERE s."Activa"
  ) movimientos ORDER BY "Fecha" DESC LIMIT 1000`);
  json(res,result.rows);
  return true;
}
