import { crearElemento, obtenerEtiqueta, mostrarAviso } from './elementos.js';
export function crearCampo(clave, opciones = {}) {
  const entrada = opciones.choices
    ? crearElemento(
        'select',
        { name: clave, id: clave, required: opciones.required ? '' : undefined },
        crearElemento('option', { value: '' }, 'Seleccioná'),
        ...opciones.choices.map((elemento) =>
          crearElemento(
            'option',
            { value: typeof elemento === 'object' ? elemento.value : elemento,
              'data-plazo-minimo': typeof elemento === 'object' ? elemento.PlazoMinimoMeses : undefined,
              'data-plazo-maximo': typeof elemento === 'object' ? elemento.PlazoMaximoMeses : undefined },
            typeof elemento === 'object' ? elemento.label : elemento
          )
        )
      )
    : crearElemento('input', {
        id: clave,
        name: clave,
        type: opciones.type === 'contrasena' ? 'password' : opciones.type || 'text',
        required: opciones.required ? '' : undefined,
        maxlength: opciones.max,
        min: opciones.min,
        max: opciones.max,
        step: opciones.step || undefined,
        autocomplete: opciones.autocomplete
      });
  if (clave === 'Telefono') {
    entrada.type = 'tel';
    entrada.maxLength = 8;
    entrada.minLength = 8;
    entrada.pattern = '[578][0-9]{7}';
    entrada.inputMode = 'numeric';
    entrada.placeholder = '88881234';
    entrada.title = 'Ocho dígitos, comenzando con 5, 7 u 8.';
  }
  if (opciones.value != null) {
    entrada.value = opciones.value;
  }
  return crearElemento(
    'div',
    {},
    crearElemento('label', { for: clave }, opciones.label || obtenerEtiqueta(clave)),
    entrada
  );
}
export function crearFormulario(obtenerCampos, guardar, texto = 'Guardar') {
  const problema = crearElemento('p', { class: 'error', role: 'alert' });
  const boton = crearElemento('button', { type: 'submit' }, texto);
  const elemento = crearElemento('form', {}, obtenerCampos, problema, boton);
  elemento.addEventListener('submit', async (event) => {
    event.preventDefault();
    problema.textContent = '';
    boton.disabled = true;
    try {
      await guardar(Object.fromEntries(new FormData(elemento)));
    } catch (excepcion) {
      problema.textContent = excepcion.message;
    } finally {
      boton.disabled = false;
    }
  });
  return elemento;
}
export function abrirFormularioModal(titulo, obtenerCampos, guardar) {
  const ventana = document.querySelector('#ventana');
  document.querySelector('#titulo-modal').textContent = titulo;
  document.querySelector('#campos-modal').replaceChildren(...obtenerCampos);
  const elemento = document.querySelector('#formulario-modal');
  const problema = document.querySelector('#error-modal');
  problema.textContent = '';
  elemento.onsubmit = async (event) => {
    event.preventDefault();
    const boton = elemento.querySelector('button[type=submit]');
    boton.disabled = true;
    problema.textContent = '';
    try {
      const resultado = await guardar(Object.fromEntries(new FormData(elemento)));
      ventana.close();
      mostrarAviso(resultado?.mensaje || 'Guardado correctamente.');
    } catch (excepcion) {
      problema.textContent = excepcion.message;
    } finally {
      boton.disabled = false;
    }
  };
  document.querySelector('#cerrar-modal').onclick = () => ventana.close();
  ventana.showModal();
}
