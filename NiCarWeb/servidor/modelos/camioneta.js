import { Automovil } from './automovil.js';

export class Camioneta extends Automovil {
  describir() {
    const datos = this.datos;
    return [datos.TipoCarroceria, datos.Marca, datos.Modelo, datos.Anio]
      .filter(Boolean).join(' ');
  }
}
