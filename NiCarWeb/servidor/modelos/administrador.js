import { Empleado } from './empleado.js';

export class Administrador extends Empleado {
  constructor(nombre, correo) {
    super(nombre, correo, 'Administrador');
  }
}
