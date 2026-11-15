import { crearElemento } from './elementos.js';

export function crearCargaFotografia(entradas) {
  const destino = entradas.map(entrada => entrada.querySelector('[name="ImagenUrl"]'))
    .find(Boolean);
  const mensaje = crearElemento('p', { role: 'status' });
  const archivo = crearElemento('input', {
    type: 'file',
    accept: 'image/jpeg,image/png,image/webp',
    'aria-label': 'Seleccionar fotografía desde el equipo'
  });
  archivo.addEventListener('change', async () => {
    const foto = archivo.files[0];
    if (!foto) return;
    mensaje.textContent = 'Subiendo fotografía…';
    archivo.disabled = true;
    try {
      const respuesta = await fetch('/api/imagenes', {
        method: 'POST',
        headers: { 'Content-Type': foto.type },
        body: foto
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error);
      destino.value = datos.ruta;
      mensaje.textContent = 'Fotografía lista para guardar con el vehículo.';
    } catch (problema) {
      mensaje.textContent = problema.message;
    } finally {
      archivo.disabled = false;
    }
  });
  return crearElemento('div', {},
    crearElemento('label', {}, 'Fotografía desde tu equipo'),
    archivo,
    crearElemento('small', {}, 'JPG, PNG o WebP. Máximo 3 MB.'),
    mensaje
  );
}
