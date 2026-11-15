import { Persona } from './persona.js';

export class Cliente extends Persona {
  #cedula;
  #nacimiento;

  constructor(nombre, correo, cedula, nacimiento) {
    super(nombre, correo);
    this.#cedula = cedula;
    this.#nacimiento = nacimiento;
  }

  obtenerDatos() {
    return {
      ...super.obtenerDatos(),
      Rol: 'Cliente',
      Cedula: this.#cedula,
      Nacimiento: this.#nacimiento
    };
  }
}
