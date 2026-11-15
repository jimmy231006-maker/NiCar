import { Vehiculo } from './vehiculo.js';

export class Automovil extends Vehiculo {
  describir() {
    return 'Automóvil ' + super.describir();
  }

  obtenerCaracteristicas() {
    return {
      ...super.obtenerCaracteristicas(),
      'Carrocería': this.datos.TipoCarroceria,
      'Puertas': this.datos.NumeroPuertas ?? 'Por confirmar',
      'Tracción': this.datos.Traccion
    };
  }
}
