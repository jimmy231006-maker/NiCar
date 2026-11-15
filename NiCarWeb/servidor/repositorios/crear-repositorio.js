import { RepositorioPostgres } from './repositorio-postgres.js';
import { RepositorioVentas } from './repositorio-ventas.js';

// El controlador utiliza el mismo contrato aunque cambie la implementación.
export function crearRepositorio(baseDatos, tabla) {
  if (tabla === 'Venta') {
    return new RepositorioVentas(baseDatos);
  }
  return new RepositorioPostgres(baseDatos, tabla);
}
