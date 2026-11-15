import { Persona } from './persona.js';

export class Empleado extends Persona {
  #rol;

  constructor(nombre, correo, rol) {
    super(nombre, correo);
    this.#rol = rol;
  }

  obtenerDatos() {
    return {
      ...super.obtenerDatos(),
      Rol: this.#rol
    };
  }
}
