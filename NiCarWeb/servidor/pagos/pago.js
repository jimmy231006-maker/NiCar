import { IPago } from '../interfaces/IPago.js';
import { validaciones } from '../validaciones.js';
import { TasaCambio } from './tasa-cambio.js';

export class Pago extends IPago {
  #totalCordobas;
  #tasa;
  #datos;

  constructor(datos) {
    super();
    if (new.target === Pago) {
      throw new TypeError('Pago es la clase padre de los medios de pago.');
    }
    this.#datos = { ...datos };
     this.#tasa = TasaCambio.comercial();
    const precio = validaciones.centavos(datos.PrecioVenta);
    const descuento = validaciones.centavos(datos.Descuento);
    this.#totalCordobas = this.#tasa.convertirACordobas(precio - descuento, datos.Moneda);
  }

  get datos() {
    return { ...this.#datos };
  }

  get totalCordobas() {
    return this.#totalCordobas;
  }

  obtenerDetalle() {
    const total = Number(this.#totalCordobas) / 100;
    return {
      TasaCambio: this.#tasa.valor,
      TotalNIO: total,
      MontoCobradoNIO: total,
      RedondeoEfectivoNIO: 0,
      RecibidoNIO: null,
      CambioNIO: 0,
      DetalleCambio: null
    };
  }
}
