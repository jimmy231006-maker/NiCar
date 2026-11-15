import { validaciones } from '../validaciones.js';
import { rechazar } from '../respuestas.js';

export class ServicioComisiones {
  #baseDatos;

  constructor(baseDatos) {
    this.#baseDatos = baseDatos;
  }

  async calcularParaVenta(codigoVendedor, totalCentavos) {
    const resultado = await this.#baseDatos.query(
      `SELECT "PorcentajeComision" FROM nicar."Usuario"
       WHERE "IdUsuario"=$1 AND "Activo" AND "Rol" IN
       ('Vendedor','Administrador','SuperAdministrador') FOR SHARE`,
      [codigoVendedor]
    );
    const vendedor = resultado.rows[0];
    if (!vendedor) {
      rechazar('Seleccioná un vendedor activo.');
    }
    const porcentaje = 5;
    const puntos = BigInt(Math.round(porcentaje * 100));
    const comision = (totalCentavos * puntos + 5000n) / 10000n;
    return {
      IdVendedor: Number(codigoVendedor),
      PorcentajeComision: porcentaje,
      ComisionUSD: Number(comision) / 100
    };
  }

  async consultarMes(mes, usuario) {
    const desde = validaciones.validarMes(mes);
    const filtro = usuario.Rol === 'Vendedor' ? usuario.IdUsuario : null;
    const resultado = await this.#baseDatos.query(
      `SELECT u."IdUsuario",u."NombreCompleto" AS "Vendedor",
        count(v."IdVenta")::integer AS "Ventas",
        coalesce(sum(v."Total"),0) AS "TotalUSD",
        coalesce(sum(v."ComisionUSD"),0) AS "ComisionUSD"
       FROM nicar."Usuario" u LEFT JOIN nicar."Venta" v
         ON v."IdVendedor"=u."IdUsuario" AND v."Activa"
         AND v."FechaVenta">=$1::date AND v."FechaVenta"<$1::date+interval '1 month'
       WHERE u."Rol" IN ('Vendedor','Administrador','SuperAdministrador')
         AND ($2::integer IS NULL OR u."IdUsuario"=$2)
       GROUP BY u."IdUsuario",u."NombreCompleto" ORDER BY u."NombreCompleto"`,
      [desde, filtro]
    );
    return resultado.rows;
  }
}
