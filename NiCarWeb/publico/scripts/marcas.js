import { crearElemento } from './elementos.js';

export async function crearSelectorMarcas(alCambiar) {
  const respuesta = await fetch('/api/marcas');
  if (!respuesta.ok) throw new Error('No se pudo cargar el catálogo de marcas.');
  const marcas = await respuesta.json();
  const selector = crearElemento('select', { 'aria-label':'Marca del vehículo' },
    crearElemento('option', { value:'' }, 'Todas las marcas'),
    ...marcas.map(marca => crearElemento('option', { value:marca.Nombre },marca.Nombre))
  );
  selector.addEventListener('change', () => alCambiar(selector.value));
  return selector;
}
