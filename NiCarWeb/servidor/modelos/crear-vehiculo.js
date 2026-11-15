import { Automovil } from './automovil.js';
import { Camioneta } from './camioneta.js';
import { Motocicleta } from './motocicleta.js';

export function crearVehiculo(datos) {
  if (datos.TipoCarroceria === 'Motocicleta') {
    return new Motocicleta(datos);
  }
  if (['Camioneta', 'Pickup', 'SUV', 'Van'].includes(datos.TipoCarroceria)) {
    return new Camioneta(datos);
  }
  return new Automovil(datos);
}
