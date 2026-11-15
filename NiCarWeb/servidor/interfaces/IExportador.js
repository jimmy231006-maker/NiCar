export class IExportador {
  constructor() {
    if (new.target === IExportador) {
      throw new TypeError('IExportador define un contrato.');
    }
  }

  exportar(registros) {
    throw new Error('La clase hija debe implementar exportar.');
  }
}
