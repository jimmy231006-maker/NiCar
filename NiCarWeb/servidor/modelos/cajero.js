import { Empleado } from './empleado.js';

export class Cajero extends Empleado {
  constructor(nombre, correo) {
    super(nombre, correo, 'Caja');
  }
}
