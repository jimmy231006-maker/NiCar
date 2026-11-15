import { crearElemento } from './elementos.js';

export function crearFichaVenta(vehiculo) {
  const elementos = [
    crearElemento('h3', {}, 'Información del vehículo para el cliente'),
    crearElemento('p', {}, vehiculo.Descripcion),
    crearElemento('p', {}, 'Condición: ' + vehiculo.Condicion),
    crearElemento('p', {}, 'Kilometraje: ' + vehiculo.Kilometraje + ' km'),
    crearElemento('p', {}, 'Matrícula: ' + vehiculo.EstadoMatricula)
  ];
  const lista = crearElemento('dl', { class: 'lista-caracteristicas' });
  for (const [nombre, valor] of Object.entries(vehiculo.Caracteristicas || {})) {
    lista.append(crearElemento('dt', {}, nombre), crearElemento('dd', {}, String(valor)));
  }
  elementos.push(lista);
  if (vehiculo.Observaciones) {
    elementos.push(crearElemento('p', {}, 'Descripción y estado: ' + vehiculo.Observaciones));
  }
  if (vehiculo.FotoReferencia) {
    elementos.push(crearElemento('p', {},
      'Imagen de referencia; la fotografía no garantiza que corresponda a esta unidad.'));
  }
  return crearElemento('aside', { class: 'resumen-vehiculo', 'aria-live': 'polite' }, ...elementos);
}

export function crearSelectorVehiculo(entrada, vehiculos) {
  const grupo = entrada.parentElement;
  const selector = entrada;
  const resumen = crearElemento('div', { class: 'resumen-vehiculo', 'aria-live': 'polite' });
  const actualizar = () => {
    const vehiculo = vehiculos.find(item => String(item.IdVehiculo) === selector.value);
    resumen.replaceChildren(...(vehiculo ? [crearFichaVenta(vehiculo)] : []));
  };
  selector.addEventListener('change', actualizar);
  grupo.append(resumen);
  actualizar();
}
