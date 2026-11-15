import { Vendedor } from './vendedor.js';
import { Administrador } from './administrador.js';
import { SuperAdministrador } from './superadministrador.js';
import { Recepcionista } from './recepcionista.js';
import { EncargadoBodega } from './encargado-bodega.js';
import { rechazar } from '../respuestas.js';

const perfiles = {
  Vendedor,
  Administrador,
  SuperAdministrador,
  Recepcionista,
  Bodega: EncargadoBodega
};

export function crearEmpleado(nombre, correo, rol) {
  const Perfil = perfiles[rol];
  if (!Perfil) {
    rechazar('Seleccioná un perfil de empleado válido.');
  }
  return new Perfil(nombre, correo);
}
