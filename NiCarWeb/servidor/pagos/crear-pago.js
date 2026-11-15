import { PagoEfectivo } from './pago-efectivo.js';
import { PagoTransferencia } from './pago-transferencia.js';
import { PagoTarjeta } from './pago-tarjeta.js';
import { PagoFinanciamiento } from './pago-financiamiento.js';
import { rechazar } from '../respuestas.js';

const medios = {
  Efectivo: PagoEfectivo,
  Transferencia: PagoTransferencia,
  Tarjeta: PagoTarjeta,
  Financiamiento: PagoFinanciamiento
};

export function crearPago(datos) {
  const MedioPago = medios[datos.MetodoPago];
  if (!MedioPago) {
    rechazar('Seleccioná un medio de pago.');
  }
  return new MedioPago(datos);
}
