export class Vehiculo {
  #datos;

  constructor(datos) {
    if (new.target === Vehiculo) {
      throw new TypeError('Vehiculo es una clase padre abstracta.');
    }
    this.#datos = { ...datos };
  }

  get datos() {
    return { ...this.#datos };
  }

  describir() {
    const datos = this.#datos;
    const identificacion = [datos.Marca, datos.Modelo, datos.Version, datos.Anio]
      .filter(Boolean).join(' ');
    const matricula = datos.Condicion === 'Nuevo'
      ? 'Nuevo, sin placa; matrícula pendiente'
      : 'Usado, ' + datos.Kilometraje + ' km';
    return [matricula, identificacion].filter(Boolean).join(' · ');
  }

  obtenerCaracteristicas() {
    const datos = this.#datos;
    const motor = datos.Combustible === 'Eléctrico'
      ? 'Eléctrico'
      : datos.CilindrajeCc ? datos.CilindrajeCc + ' cm³' : 'Por confirmar';
    return {
      'Condición': datos.Condicion,
      'Kilometraje': datos.Kilometraje + ' km',
      'Matrícula': datos.EstadoMatricula || (datos.Placa ? 'Matriculado' : 'Pendiente'),
      'Combustible': datos.Combustible,
      'Motor': motor,
      'Potencia': datos.PotenciaKw ? datos.PotenciaKw + ' kW' : 'Por confirmar',
      'Transmisión': datos.Transmision,
      'Asientos': datos.NumeroAsientos ?? 'Por confirmar',
      'Color': datos.ColorExterior
    };
  }

  obtenerFicha() {
    return {
      ...this.#datos,
      Descripcion: this.describir(),
      Caracteristicas: this.obtenerCaracteristicas()
    };
  }
}
