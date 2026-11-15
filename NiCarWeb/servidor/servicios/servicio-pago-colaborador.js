import { validaciones } from '../validaciones.js';
import { CalculosNomina } from '../../publico/clases/CalculosNomina.js';
import { TasaCambio } from '../pagos/tasa-cambio.js';
import { rechazar } from '../respuestas.js';

export class ServicioPagoColaborador {
  #baseDatos;
  #calculos;
  constructor(baseDatos, calculos = new CalculosNomina()) { this.#baseDatos = baseDatos; this.#calculos = calculos; }

  async registrar(entrada, usuario) {
    const datos = validaciones.validarDatos('PagoColaborador', entrada, true);
    const contrato = await this.#baseDatos.query(
      `SELECT c."IdUsuario",c."SalarioBaseNIO",u."Rol" FROM nicar."ContratoColaborador" c
       JOIN nicar."Usuario" u USING ("IdUsuario")
       WHERE c."IdContrato"=$1 AND c."IdUsuario"=$2 AND c."Activo" AND c."Estado"='Activo'
         AND u."Activo" FOR UPDATE OF c,u`, [datos.IdContrato, datos.IdUsuario]);
    const persona = contrato.rows[0];
    if (!persona || ['Cliente','Bodega'].includes(persona.Rol)) rechazar('Seleccioná un colaborador con contrato activo.');
    const salario = validaciones.centavos(persona.SalarioBaseNIO);
    let bruto = salario, comisionUSD = null, tasa = 1;
    if (datos.TipoPago === 'Comision') {
      if (persona.Rol !== 'Vendedor') rechazar('La comisión de ventas corresponde a vendedores.');
      const fechaPeriodo = validaciones.validarMes(datos.Periodo);
      const ventas = await this.#baseDatos.query(
        `SELECT coalesce(sum("ComisionUSD"),0)::numeric AS "Ganado" FROM nicar."Venta" WHERE "IdVendedor"=$1 AND "Activa" AND "FechaVenta">=$2::date AND "FechaVenta"<$2::date+interval '1 month'`, [datos.IdUsuario, fechaPeriodo]);
      const pagos = await this.#baseDatos.query(
        `SELECT coalesce(sum("ComisionUSD"),0)::numeric AS "Pagado" FROM nicar."PagoColaborador" WHERE "IdUsuario"=$1 AND "TipoPago"='Comision' AND "Periodo"=$2 AND "Estado"='Registrado'`, [datos.IdUsuario, datos.Periodo]);
      const pendiente = validaciones.centavos(ventas.rows[0].Ganado) - validaciones.centavos(pagos.rows[0].Pagado);
      if (pendiente <= 0n) rechazar('No hay comisión pendiente para ese mes.');
      comisionUSD = Number(pendiente) / 100;
      const cambio = TasaCambio.oficial(); tasa = cambio.valor; bruto = cambio.convertirACordobas(pendiente, 'USD');
    }
    const ahorro = validaciones.centavos(datos.AhorroAutorizadoNIO || '0');
    const otras = validaciones.centavos(datos.OtrasDeduccionesNIO || '0');
    const historial = await this.#baseDatos.query(
      `SELECT coalesce(sum("MontoBrutoNIO"-"DeduccionINSSNIO"-"AhorroAutorizadoNIO") FILTER (WHERE "Periodo"<$2),0)::numeric AS "RentaAnterior", coalesce(sum("MontoBrutoNIO") FILTER (WHERE "Periodo"=$2),0)::numeric AS "BrutoMes", coalesce(sum("DeduccionINSSNIO") FILTER (WHERE "Periodo"=$2),0)::numeric AS "INSSMes", coalesce(sum("AhorroAutorizadoNIO") FILTER (WHERE "Periodo"=$2),0)::numeric AS "AhorroMes", coalesce(sum("RetencionIRNIO") FILTER (WHERE "Periodo"<=$2),0)::numeric AS "IRRetenido" FROM nicar."PagoColaborador" WHERE "IdUsuario"=$1 AND "Estado"='Registrado' AND left("Periodo",4)=left($2,4)`, [datos.IdUsuario, datos.Periodo]);
    const previo = historial.rows[0];
    const centavos = campo => validaciones.centavos(previo[campo] || '0');
    const brutoMes = centavos('BrutoMes') + bruto;
    const ahorroMes = centavos('AhorroMes') + ahorro;
    const inssMesTotal = this.#calculos.calcularINSSLaboral(Number(brutoMes) / 100);
    const inss = inssMesTotal - centavos('INSSMes');
    const baseIRMes = validaciones.validarBaseNomina(brutoMes, inssMesTotal, ahorroMes);
    const retencion = this.#calculos.calcularIRMensual({ periodo: datos.Periodo, rentaNetaMesCentavos: baseIRMes, rentaNetaAcumuladaCentavos: centavos('RentaAnterior'), irRetenidoAcumuladoCentavos: centavos('IRRetenido') }).retencionCentavos;
    const pago = validaciones.validarPagoColaborador(bruto, inss, retencion, ahorro, otras);
    const guardado = await this.#baseDatos.query(
      `INSERT INTO nicar."PagoColaborador" ("IdUsuario","IdContrato","TipoPago","Periodo","FechaPago","MontoBrutoNIO","DeduccionINSSNIO","AhorroAutorizadoNIO","RetencionIRNIO","OtrasDeduccionesNIO","MontoNetoNIO","ComisionUSD","TasaCambio","MetodoPagoColaborador","Referencia","RegistradoPor") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING "IdPagoColaborador","MontoBrutoNIO","DeduccionINSSNIO","AhorroAutorizadoNIO","RetencionIRNIO","MontoNetoNIO","ComisionUSD"`, [datos.IdUsuario, datos.IdContrato, datos.TipoPago, datos.Periodo, datos.FechaPago, Number(bruto)/100, Number(inss)/100, Number(ahorro)/100, Number(retencion)/100, Number(otras)/100, Number(pago.neto)/100, comisionUSD, tasa, datos.MetodoPagoColaborador, datos.Referencia, usuario.IdUsuario]);
    return guardado.rows[0];
  }
}
