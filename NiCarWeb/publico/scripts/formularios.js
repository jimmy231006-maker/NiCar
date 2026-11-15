import { crearElemento, obtenerEtiqueta, mostrarAviso } from './elementos.js';
function obtenerAyudaCampo(clave, opciones) {
  if (opciones.ayuda) return opciones.ayuda;
  if (opciones.choices) return 'Seleccioná una opción de la lista.';
  if (clave === 'Correo' || opciones.type === 'email') return 'Formato: nombre@dominio.com. No escribás espacios.';
  if (clave === 'Telefono' || opciones.type === 'tel') return '8 dígitos; debe comenzar con 5, 7 u 8.';
  if (clave === 'Cedula') return 'Formato: 001-010190-0001A (13 dígitos y una letra).';
  if (opciones.type === 'contrasena' && (opciones.minLength || clave === 'Contrasena' || clave === 'Nueva')) {
    return 'Usá entre 12 y 100 caracteres.';
  }
  if (opciones.type === 'date') return 'Elegí una fecha válida en el calendario.';
  if (opciones.type === 'datetime-local') return 'Elegí una fecha y hora disponibles.';
  if (opciones.type === 'number') {
    const minimo = opciones.min ?? 0;
    const maximo = opciones.max;
    return maximo == null ? `Ingresá un número igual o mayor que ${minimo}.`
      : `Ingresá un número entre ${minimo} y ${maximo}.`;
  }
  return opciones.required ? 'Este campo es obligatorio.' : '';
}
function activarAvisosDeCampo(formulario) {
  formulario.querySelectorAll('input, select, textarea').forEach(entrada => {
    entrada.addEventListener('invalid', () => entrada.setAttribute('aria-invalid', 'true'));
    entrada.addEventListener('input', () => {
      if (entrada.validity.valid) entrada.removeAttribute('aria-invalid');
    });
    entrada.addEventListener('change', () => {
      if (entrada.validity.valid) entrada.removeAttribute('aria-invalid');
    });
  });
}
export function crearCampo(clave, opciones = {}) {
  const ayuda = obtenerAyudaCampo(clave, opciones);
  const idAyuda = ayuda ? `${clave}-ayuda` : undefined;
  const entrada = opciones.choices
    ? crearElemento(
        'select',
        { name: clave, id: clave, required: opciones.required ? '' : undefined,
          'aria-describedby': idAyuda, title: ayuda || undefined },
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
        minlength: opciones.minLength,
        min: opciones.min,
        max: opciones.max,
        step: opciones.step || undefined,
        autocomplete: opciones.autocomplete,
        'aria-describedby': idAyuda,
        title: ayuda || undefined,
        placeholder: opciones.placeholder
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
    { class: 'campo-formulario' },
    crearElemento('label', { for: clave }, opciones.label || obtenerEtiqueta(clave)),
    entrada,
    ...(ayuda ? [crearElemento('small', { class: 'ayuda-campo', id: idAyuda }, ayuda)] : [])
  );
}
export function crearFormulario(obtenerCampos, guardar, texto = 'Guardar') {
  const problema = crearElemento('p', { class: 'error', role: 'alert', 'aria-live': 'assertive' });
  const boton = crearElemento('button', { type: 'submit' }, texto);
  const elemento = crearElemento('form', {}, obtenerCampos, problema, boton);
  activarAvisosDeCampo(elemento);
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
  activarAvisosDeCampo(elemento);
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
