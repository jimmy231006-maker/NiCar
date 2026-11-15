export class IPago {
  constructor() {
    if (new.target === IPago) {
      throw new TypeError('IPago define un contrato y no se puede instanciar.');
    }
  }

  obtenerDetalle() {
    throw new Error('La clase de pago debe implementar obtenerDetalle.');
  }
}
