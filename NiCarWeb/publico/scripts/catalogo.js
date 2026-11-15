import { crearSelectorMarcas } from './marcas.js';
import {
  contenido,
  crearElemento,
  mostrarTitulo,
  formatearPrecio,
  mostrarAviso
} from './elementos.js';
import { consultarApi, estado } from './conexion-api.js';
import { crearCampo, crearFormulario } from './formularios.js';
import { validarTelefono, fechaDeHoy } from './validaciones.js';
export async function mostrarCatalogo() {
  estado.vehiculos = await consultarApi('/catalogo');
  const cuadricula = crearElemento('div', { class: 'cuadricula' });
  const busqueda = crearElemento('input', {
    type: 'search',
    placeholder: 'Buscar por marca, modelo o año',
    'aria-label': 'Buscar vehículos'
  });
  let marcaSeleccionada = '';
  const actualizarResultados = () => {
    const consulta = busqueda.value.trim().toLocaleLowerCase('es');
    const filas = estado.vehiculos.filter((registro) =>
      (!marcaSeleccionada || registro.Marca === marcaSeleccionada) &&
      (registro.Marca + ' ' + registro.Modelo + ' ' + registro.Anio)
        .toLocaleLowerCase('es')
        .includes(consulta)
    );
    cuadricula.replaceChildren(
      ...filas.map((vehiculo) =>
        crearElemento(
          'article',
          { class: 'vehiculo' },
          crearFotografia(vehiculo),
          crearElemento(
            'div',
            { class: 'contenido-vehiculo' },
            crearElemento(
              'h2',
              {},
              vehiculo.Anio + ' ' + vehiculo.Marca + ' ' + vehiculo.Modelo
            ),
            crearElemento('p', {}, vehiculo.Ubicacion || 'Nicaragua'),
            crearElemento(
              'p',
              {},
              vehiculo.Condicion + ' · ' +
                (vehiculo.Condicion === 'Nuevo' ? 'Sin placa' : vehiculo.Kilometraje + ' km')
            ),
            crearElemento(
              'strong',
              { class: 'precio' },
              formatearPrecio(vehiculo.PrecioOferta)
            ),
            crearElemento(
              'a',
              { class: 'boton', href: '#vehiculo/' + vehiculo.IdVehiculo },
              'Ver vehículo'
            )
          )
        )
      )
    );
    if (!filas.length) {
      cuadricula.append(
        crearElemento(
          'p',
          { class: 'sin-registros' },
          consulta
            ? 'No encontramos vehículos con esa búsqueda.'
            : 'El inventario disponible aparecerá aquí.'
        )
      );
    }
  };
  busqueda.oninput = actualizarResultados;
  const selectorMarcas = await crearSelectorMarcas(marca => {
    marcaSeleccionada = marca;
    actualizarResultados();
  });
  const hero = crearElemento(
    'section',
    { class: 'presentacion' },
    crearElemento('p', { class: 'subtitulo' }, 'Vehículos en Nicaragua'),
    crearElemento('h1', {}, 'Tu próximo camino empieza aquí.'),
    crearElemento(
      'p',
      {},
      'Explorá el catálogo y agendá una visita para conocer el vehículo en persona.'
    ),
    crearElemento('div', { class: 'busqueda' }, selectorMarcas, busqueda)
  );
  contenido.replaceChildren(hero, cuadricula);
  actualizarResultados();
}
function crearFotografia(vehiculo) {
  const elemento = crearElemento('div', { class: 'fotografia' });
  if (vehiculo.ImagenUrl && /^https?:\/\//.test(vehiculo.ImagenUrl)) {
    const imagen = crearElemento('img', {
      src: vehiculo.ImagenUrl,
      alt: vehiculo.Marca + ' ' + vehiculo.Modelo,
      loading: 'lazy'
    });
    imagen.onerror = () => elemento.replaceChildren('NiCar');
    elemento.append(imagen);
  } else {
    elemento.textContent = 'NiCar';
  }
  return elemento;
}
export async function mostrarVehiculo(codigo) {
  if (!estado.vehiculos.length) {
    estado.vehiculos = await consultarApi('/catalogo');
  }
  const vehiculo = estado.vehiculos.find(
    (registro) => String(registro.IdVehiculo) === codigo
  );
  if (!vehiculo) {
    throw new Error('El vehículo ya no está disponible.');
  }
  mostrarTitulo(vehiculo.Anio + ' ' + vehiculo.Marca + ' ' + vehiculo.Modelo);
  contenido.prepend(crearElemento('a', { href: '#catalogo' }, 'Volver al catálogo'));
  const especificaciones = Object.entries(vehiculo.Caracteristicas || {});
  const panel = crearElemento(
    'section',
    { class: 'tarjeta' },
    crearElemento('strong', { class: 'precio' }, formatearPrecio(vehiculo.PrecioOferta)),
    crearElemento('p', {}, vehiculo.Ubicacion || 'Nicaragua'),
    crearElemento(
      'div',
      { class: 'caracteristicas' },
      ...especificaciones.map(([clave,valor]) =>
        crearElemento(
          'div',
          {},
          crearElemento('small', {}, clave),
          String(valor ?? '-')
        )
      )
    )
  );
  panel.append(crearElemento('p', {}, vehiculo.Descripcion || ''),crearElemento('p', {}, vehiculo.Observaciones || ''));
  if (vehiculo.FotoReferencia) {
    panel.append(crearElemento('p', {}, 'Foto de referencia · ' + (vehiculo.AutorImagen || ''),
      crearElemento('a', { href:vehiculo.FuenteImagen,target:'_blank',rel:'noopener noreferrer' }, ' Ver fuente y licencia')));
  }
  if (estado.usuario?.Rol === 'Cliente') {
    panel.append(
      crearFormulario(
        [
          crearCampo('Telefono', {
            required: true,
            max: 8,
            value:estado.usuario.Telefono,
            type: 'tel',
            label: 'Teléfono de contacto'
          }),
          crearCampo('Inicio', {
            required: true,
            type: 'datetime-local',
            min: fechaDeHoy() + 'T00:00',
            step: 900,
            label: 'Fecha y hora de Nicaragua'
          })
        ],
        async (datos) => {
          validarTelefono(datos.Telefono);
          await consultarApi('/citas', 'POST', {
            ...datos,
            IdVehiculo: Number(codigo)
          });
          mostrarAviso('Visita agendada. Podés verla en Mis citas.');
          location.hash = '#citas';
        },
        'Agendar visita'
      )
    );
    panel.append(
      crearElemento(
        'p',
        {},
        'Lunes a sábado, de 8:00 a 17:00. Turnos de 45 minutos y hasta 12 citas por vendedor.'
      )
    );
  } else if (!estado.usuario) {
    panel.append(
      crearElemento(
        'a',
        {
          class: 'boton',
          href: '#ingresar',
          onClick: () => sessionStorage.setItem('nicar-return', '#vehiculo/' + codigo)
        },
        'Iniciar sesión para agendar'
      )
    );
  }
  contenido.append(
    crearElemento('div', { class: 'detalle' }, crearFotografia(vehiculo), panel)
  );
}
