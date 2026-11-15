import { Vehiculo } from './vehiculo.js';

export class Motocicleta extends Vehiculo {
  describir() {
    return 'Motocicleta ' + super.describir();
  }

  obtenerCaracteristicas() {
    return {
      ...super.obtenerCaracteristicas(),
      'Tipo': 'Motocicleta'
    };
  }
}
