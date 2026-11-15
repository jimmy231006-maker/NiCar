import { Persona } from './persona.js';

export class Cliente extends Persona {
  #identificacion;

  constructor(nombre, correo, identificacion) {
    super(nombre, correo);
    this.#identificacion = { ...identificacion };
  }

  obtenerDatos() {
    return {
      ...super.obtenerDatos(),
      Rol: 'Cliente',
      TipoDocumento: this.#identificacion.tipo,
      NumeroDocumento: this.#identificacion.value,
      EdadDeclarada: this.#identificacion.age,
      Cedula: this.#identificacion.tipo === 'Cedula' ? this.#identificacion.value : null,
      Nacimiento: this.#identificacion.birth
    };
  }
}
