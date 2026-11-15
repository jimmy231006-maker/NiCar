import { validaciones } from '../validaciones.js';

export class ServicioCreditos {
  #baseDatos;

  constructor(baseDatos) { this.#baseDatos = baseDatos; }

  async crear(venta, condiciones) {
    const totalCentavos = validaciones.centavos(venta.PrecioVenta) - validaciones.centavos(venta.Descuento);
    const datos = validaciones.validarPlanCredito(condiciones, Number(totalCentavos) / 100);
    const resultado = await this.#baseDatos.query(
      `INSERT INTO nicar."Credito" ("IdVenta","IdFinanciera","NumeroContrato",
       "PrecioContadoUSD","PrimaUSD","CargosFinancierosUSD","MontoFinanciadoUSD",
       "TasaAnual","TasaMoraAnual","PlazoMeses","PagoMensualUSD",
       "TotalInteresesUSD","TotalContratoUSD","FechaPrimerPago")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING "IdCredito"`,
      [venta.IdVenta,condiciones.IdFinanciera,condiciones.ReferenciaPago,
        Number(datos.precio)/100,Number(datos.prima)/100,Number(datos.cargos)/100,
        Number(datos.principal)/100,datos.tasa,Number(condiciones.TasaMoraAnual),
        datos.plazo,Number(datos.cuota)/100,Number(datos.intereses)/100,
        Number(datos.totalContrato)/100,condiciones.FechaPrimerPago]
    );
    return { IdCredito:resultado.rows[0].IdCredito };
  }
}
