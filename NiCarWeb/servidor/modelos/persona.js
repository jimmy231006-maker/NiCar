export class Persona {
  #nombre;
  #correo;

  constructor(nombre, correo) {
    if (new.target === Persona) {
      throw new TypeError('Persona es una clase padre abstracta.');
    }
    this.#nombre = nombre.trim();
    this.#correo = correo.trim().toLowerCase();
  }

  get nombre() {
    return this.#nombre;
  }

  get correo() {
    return this.#correo;
  }

  obtenerDatos() {
    return {
      NombreCompleto: this.#nombre,
      NombreUsuario: this.#correo
    };
  }
}
