import { Empleado } from './empleado.js';

export class EncargadoBodega extends Empleado {
  constructor(nombre, correo) {
    super(nombre, correo, 'Bodega');
  }
}
