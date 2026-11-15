import { Empleado } from './empleado.js';

export class Recepcionista extends Empleado {
  constructor(nombre, correo) {
    super(nombre, correo, 'Recepcionista');
  }
}
