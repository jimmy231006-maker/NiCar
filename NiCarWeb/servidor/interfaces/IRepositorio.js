/**
 * Contrato de persistencia para las entidades de NiCar.
 * JavaScript no tiene la palabra reservada interface.
 * Esta clase abstracta define las operaciones que implementan sus clases hijas.
 */
export class IRepositorio {
  constructor() {
    if (new.target === IRepositorio) {
      throw new TypeError('IRepositorio es un contrato y no se puede instanciar.');
    }
  }

  async listar() {
    throw new Error('La clase hija debe implementar listar.');
  }

  async buscar(codigo, bloquear = false) {
    throw new Error('La clase hija debe implementar buscar.');
  }

  async guardar(datos, codigo = null) {
    throw new Error('La clase hija debe implementar guardar.');
  }

  async cambiarEstado(codigo) {
    throw new Error('La clase hija debe implementar cambiarEstado.');
  }
}
