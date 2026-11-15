import { Empleado } from './empleado.js';

export class Vendedor extends Empleado {
  constructor(nombre, correo) {
    super(nombre, correo, 'Vendedor');
  }
}
