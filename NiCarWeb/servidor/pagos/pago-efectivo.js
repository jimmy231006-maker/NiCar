import { Pago } from './pago.js';
import { validaciones } from '../validaciones.js';

const denominacionesCentavos = [
  100000n, 50000n, 20000n, 10000n, 5000n, 2000n, 1000n, 500n, 100n, 50n, 25n
];

export class PagoEfectivo extends Pago {
  obtenerDetalle() {
    const detalle = super.obtenerDetalle();
    // Se redondea al cuarto de córdoba más cercano y se conserva el ajuste.
    const cobrado = ((this.totalCordobas + 12n) / 25n) * 25n;
    const recibido = validaciones.validarPago(this.datos, cobrado);
    let restante = recibido - cobrado;
    const desglose = [];
    for (const denominacion of denominacionesCentavos) {
      const cantidad = restante / denominacion;
      if (cantidad > 0n) {
        desglose.push({ denominacion: Number(denominacion) / 100, cantidad: Number(cantidad) });
        restante %= denominacion;
      }
    }
    return {
      ...detalle,
      MontoCobradoNIO: Number(cobrado) / 100,
      RedondeoEfectivoNIO: Number(cobrado - this.totalCordobas) / 100,
      RecibidoNIO: Number(recibido) / 100,
      CambioNIO: Number(recibido - cobrado) / 100,
      DetalleCambio: desglose
    };
  }
}
