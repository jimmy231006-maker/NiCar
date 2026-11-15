import { Pago } from './pago.js';
import { validaciones } from '../validaciones.js';

export class PagoTarjeta extends Pago {
  obtenerDetalle() {
    validaciones.validarPago(this.datos, this.totalCordobas);
    return super.obtenerDetalle();
  }
}
