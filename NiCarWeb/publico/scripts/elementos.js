import configuracionMoneda from '../configuracion/moneda.json' with { type: 'json' };

export const tasaCambioComercial = Number(configuracionMoneda.tasaComercial);
export function crearElemento(etiqueta, atributos = {}, ...hijos) {
  const elemento = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos)) {
    if (clave.startsWith('on')) {
      elemento.addEventListener(clave.slice(2).toLowerCase(), valor);
    } else if (clave === 'class') {
      elemento.className = valor;
    } else if (valor !== undefined && valor !== null) {
      elemento.setAttribute(clave, valor);
    }
  }
  for (const hijo of hijos.flat()) {
    if (hijo !== null && hijo !== undefined) {
      elemento.append(hijo instanceof Node ? hijo : String(hijo));
    }
  }
  return elemento;
}
export const contenido = document.querySelector('#contenido');
export function mostrarAviso(texto) {
  const elemento = document.querySelector('#aviso');
  elemento.textContent = texto;
  elemento.hidden = false;
  clearTimeout(mostrarAviso.timer);
  mostrarAviso.timer = setTimeout(() => (elemento.hidden = true), 7000);
}
export function mostrarTitulo(titulo, descripcion) {
  contenido.replaceChildren(crearElemento('h1', {}, titulo));
  if (descripcion) {
    contenido.append(crearElemento('p', {}, descripcion));
  }
}
export function formatearPrecio(valor) {
  if (valor == null) return 'Consultar precio';
  const cordobas = new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' })
    .format(Number(valor) * tasaCambioComercial);
  const dolares = new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'USD' })
    .format(valor);
  return cordobas + ' · ' + dolares;
}
export function obtenerEtiqueta(valor) {
  const etiquetas = {
    IdMarca: 'Marca',
    IdModelo: 'Modelo',
    IdVehiculo: 'Vehículo',
    IdCliente: 'Cliente',
    IdProveedor: 'Proveedor',
    IdTipoCosto: 'Tipo de costo',
    NombreUsuario: 'Correo de acceso',
    Activo: 'Activo',
    Activa: 'Activa'
  };
  return (
    etiquetas[valor] ||
    valor.replace(/([a-záéíóú])([A-Z])/g, '$1 $2').replace(/^Id/, 'Código ')
  );
}
export function tabla(filas, acciones) {
  if (!filas.length) {
    return crearElemento(
      'p',
      { class: 'sin-registros' },
      'No hay registros para mostrar.'
    );
  }
  const claves = Object.keys(filas[0]);
  return crearElemento(
    'div',
    { class: 'contenedor-tabla' },
    crearElemento(
      'table',
      {},
      crearElemento(
        'thead',
        {},
        crearElemento(
          'tr',
          {},
          ...claves.map((clave) => crearElemento('th', {}, obtenerEtiqueta(clave))),
          ...(acciones ? [crearElemento('th', {}, 'Acciones')] : [])
        )
      ),
      crearElemento(
        'tbody',
        {},
        ...filas.map((fila) =>
          crearElemento(
            'tr',
            {},
            ...claves.map((clave) =>
              crearElemento(
                'td',
                {},
                typeof fila[clave] === 'boolean'
                  ? fila[clave]
                    ? 'Sí'
                    : 'No'
                  : (fila[clave] ?? '—')
              )
            ),
            ...(acciones ? [crearElemento('td', {}, acciones(fila))] : [])
          )
        )
      )
    )
  );
}
