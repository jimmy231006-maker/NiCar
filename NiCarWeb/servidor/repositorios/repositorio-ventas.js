import { RepositorioPostgres } from './repositorio-postgres.js';
import { rechazar } from '../respuestas.js';

export class RepositorioVentas extends RepositorioPostgres {
  constructor(baseDatos) {
    super(baseDatos, 'Venta');
  }

  // Una venta emitida conserva su comprobante. Se permite crear y consultar.
  async guardar(datos, codigo = null) {
    if (codigo !== null) {
      rechazar('Las ventas registradas conservan su comprobante.');
    }
    return super.guardar(datos);
  }

  async cambiarEstado() {
    rechazar('La anulación de una venta requiere un proceso contable.');
  }
}
