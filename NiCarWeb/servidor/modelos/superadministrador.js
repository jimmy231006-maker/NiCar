import { Administrador } from './administrador.js';

export class SuperAdministrador extends Administrador {
  obtenerDatos() {
    return { ...super.obtenerDatos(), Rol: 'SuperAdministrador' };
  }
}
