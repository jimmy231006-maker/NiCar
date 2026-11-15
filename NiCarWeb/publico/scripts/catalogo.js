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
  const filtros = crearFiltros(estado.vehiculos);
  const actualizarResultados = () => dibujarResultados(cuadricula, estado.vehiculos, filtros);
  Object.values(filtros).forEach(control => control.addEventListener('input', actualizarResultados));
  Object.values(filtros).forEach(control => control.addEventListener('change', actualizarResultados));
  filtros.limpiar.addEventListener('click', () => {
    Object.values(filtros).filter(control => control instanceof HTMLInputElement || control instanceof HTMLSelectElement)
      .forEach(control => { control.value = ''; });
    actualizarResultados();
  });
  const hero = crearElemento(
    'section',
    { class: 'presentacion' },
    crearElemento('p', { class: 'subtitulo' }, 'Veh�culos en Nicaragua'),
    crearElemento('h1', {}, 'Tu pr�ximo camino empieza aqu�.'),
    crearElemento(
      'p',
      {},
      'Explor� el cat�logo y agend� una visita para conocer el veh�culo en persona.'
    ),
    crearElemento('div', { class: 'panel-filtros' },
      crearElemento('div', { class: 'filtros-busqueda' }, filtros.buscar, filtros.tipo, filtros.condicion, filtros.marca),
      crearElemento('details', { class: 'filtros-avanzados', open:true },
        crearElemento('summary', {}, 'M�s filtros'),
        crearElemento('div', { class: 'rejilla-filtros' },
          filtros.anioDesde, filtros.anioHasta, filtros.precioDesde, filtros.precioHasta,
          filtros.kmDesde, filtros.kmHasta, filtros.cilindrajeDesde, filtros.cilindrajeHasta,
          filtros.asientos, filtros.matricula, filtros.combustible, filtros.transmision,
          filtros.carroceria, filtros.traccion, filtros.color
        )
      ),
      crearElemento('div', { class: 'acciones-filtros' }, filtros.limpiar),
      crearElemento('p', { class: 'resultado-filtros', 'aria-live':'polite' })
    )
  );
  contenido.replaceChildren(hero, cuadricula);
  actualizarResultados();
}

function crearFiltros(vehiculos) {
  const texto = (etiqueta, placeholder = etiqueta) => crearElemento('input', {
    type:'search', placeholder, 'aria-label':etiqueta
  });
  const selector = (etiqueta, opciones) => crearElemento('select', { 'aria-label':etiqueta },
    crearElemento('option', { value:'' }, etiqueta),
    ...opciones.map(valor => crearElemento('option', { value:String(valor) }, String(valor)))
  );
  const rango = (etiqueta, tipo, maximo) => crearElemento('input', {
    type:tipo, min:tipo === 'number' ? '0' : undefined, max:maximo,
    placeholder:etiqueta, 'aria-label':etiqueta
  });
  const unicos = clave => [...new Set(vehiculos.map(v => v[clave]).filter(v => v !== null && v !== undefined && v !== ''))]
    .sort((a,b) => String(a).localeCompare(String(b),'es',{numeric:true}));
  return {
    buscar:texto('Buscar','Marca, modelo, a�o o palabra clave'),
    tipo:selector('Todos los tipos',['Carro','Camioneta','Moto']),
    condicion:selector('Nuevos y usados',['Nuevo','Usado']),
    marca:selector('Todas las marcas',unicos('Marca')),
    anioDesde:rango('A�o desde','number'), anioHasta:rango('A�o hasta','number'),
    precioDesde:rango('Precio m�nimo en USD','number'), precioHasta:rango('Precio m�ximo en USD','number'),
    kmDesde:rango('Kilometraje m�nimo','number'), kmHasta:rango('Kilometraje m�ximo','number'),
    cilindrajeDesde:rango('Cilindraje m�nimo (cc)','number'), cilindrajeHasta:rango('Cilindraje m�ximo (cc)','number'),
    asientos:selector('Todos los asientos',unicos('NumeroAsientos')),
    matricula:selector('Todos los estados de matr�cula',unicos('EstadoMatricula')),
    combustible:selector('Todos los combustibles',unicos('Combustible')),
    transmision:selector('Todas las transmisiones',unicos('Transmision')),
    carroceria:selector('Todas las carrocer�as',unicos('TipoCarroceria')),
    traccion:selector('Todas las tracciones',unicos('Traccion')),
    color:selector('Todos los colores',unicos('ColorExterior')),
    limpiar:crearElemento('button',{type:'button',class:'boton-secundario'},'Limpiar filtros')
  };
}

function tipoCoincide(vehiculo, tipo) {
  if (!tipo) return true;
  const categoria = vehiculo.TipoCarroceria === 'Motocicleta' ? 'Moto' :
    ['Pickup','Camioneta','SUV','Van'].includes(vehiculo.TipoCarroceria) ? 'Camioneta' : 'Carro';
  return categoria === tipo;
}

function dibujarResultados(contenedor, vehiculos, filtros) {
  const leer = clave => filtros[clave].value.trim().toLocaleLowerCase('es');
  const desde = clave => leer(clave) ? Number(leer(clave)) : null;
  const consulta = leer('buscar');
  const filas = vehiculos.filter(v => {
    const texto = [v.Marca,v.Modelo,v.Version,v.Anio,v.TipoCarroceria,v.Condicion,
      v.ColorExterior,v.Combustible,v.Transmision,v.Traccion,v.Ubicacion].join(' ').toLocaleLowerCase('es');
    const precio = Number(v.PrecioOferta || 0);
    return (!consulta || texto.includes(consulta)) && tipoCoincide(v,filtros.tipo.value) &&
      (!leer('condicion') || v.Condicion === filtros.condicion.value) &&
      (!leer('marca') || v.Marca === filtros.marca.value) &&
      (!desde('anioDesde') || Number(v.Anio) >= desde('anioDesde')) &&
      (!desde('anioHasta') || Number(v.Anio) <= desde('anioHasta')) &&
      (!desde('precioDesde') || precio >= desde('precioDesde')) &&
      (!desde('precioHasta') || precio <= desde('precioHasta')) &&
      (!desde('kmDesde') || Number(v.Kilometraje) >= desde('kmDesde')) &&
      (!desde('kmHasta') || Number(v.Kilometraje) <= desde('kmHasta')) &&
      (!desde('cilindrajeDesde') || Number(v.CilindrajeCc) >= desde('cilindrajeDesde')) &&
      (!desde('cilindrajeHasta') || Number(v.CilindrajeCc) <= desde('cilindrajeHasta')) &&
      (!leer('asientos') || String(v.NumeroAsientos) === filtros.asientos.value) &&
      (!leer('matricula') || v.EstadoMatricula === filtros.matricula.value) &&
      (!leer('combustible') || v.Combustible === filtros.combustible.value) &&
      (!leer('transmision') || v.Transmision === filtros.transmision.value) &&
      (!leer('carroceria') || v.TipoCarroceria === filtros.carroceria.value) &&
      (!leer('traccion') || v.Traccion === filtros.traccion.value) &&
      (!leer('color') || v.ColorExterior === filtros.color.value);
  });
  contenedor.replaceChildren(...filas.map(crearTarjetaVehiculo));
  if (!filas.length) contenedor.append(crearElemento('p',{class:'sin-registros'},'No encontramos veh�culos con esos filtros.'));
  const resumen = filtros.buscar.closest('.panel-filtros')?.querySelector('.resultado-filtros');
  if (resumen) resumen.textContent = filas.length + (filas.length === 1 ? ' veh�culo encontrado.' : ' veh�culos encontrados.');
}

function crearTarjetaVehiculo(vehiculo) {
  return crearElemento('article',{class:'vehiculo'},crearFotografia(vehiculo),
    crearElemento('div',{class:'contenido-vehiculo'},
      crearElemento('h2',{},vehiculo.Anio+' '+vehiculo.Marca+' '+vehiculo.Modelo),
      crearElemento('p',{},vehiculo.Ubicacion||'Nicaragua'),
      crearElemento('p',{},vehiculo.Condicion+' � '+(vehiculo.Condicion==='Nuevo'?'Sin placa':vehiculo.Kilometraje+' km')),
      crearElemento('strong',{class:'precio'},formatearPrecio(vehiculo.PrecioOferta)),
      crearElemento('a',{class:'boton',href:'#vehiculo/'+vehiculo.IdVehiculo},'Ver veh�culo')
    )
  );
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
    throw new Error('El veh�culo ya no est� disponible.');
  }
  mostrarTitulo(vehiculo.Anio + ' ' + vehiculo.Marca + ' ' + vehiculo.Modelo);
  contenido.prepend(crearElemento('a', { href: '#catalogo' }, 'Volver al cat�logo'));
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
    panel.append(crearElemento('p', {}, 'Foto de referencia � ' + (vehiculo.AutorImagen || ''),
      crearElemento('a', { href:vehiculo.FuenteImagen,target:'_blank',rel:'noopener noreferrer' }, ' Ver fuente y licencia')));
  }
  if (estado.usuario?.Rol === 'Cliente') {
    panel.append(
      crearFormulario(
        [
          crearCampo('Telefono', {
            required: true,
            max: 8,
            value:estado.usuario?.Telefono || '',
            type: 'tel',
            label: 'Tel�fono de contacto'
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
          const cita = await consultarApi('/citas', 'POST', {
            ...datos,
            IdVehiculo: Number(codigo)
          });
          mostrarAviso('Visita agendada para el ' + cita.Inicio + '. C�digo de cita: ' + cita.IdCita + '.');
          if (estado.usuario?.Rol === 'Cliente') location.hash = '#citas';
        },
        'Agendar visita'
      )
    );
    panel.append(
      crearElemento(
        'p',
        {},
        'Lunes a s�bado, de 8:00 a 17:00. Turnos de 45 minutos y hasta 12 citas por vendedor.'
      )
    );
  } else if (!estado.usuario) {
    panel.append(crearAvisoRegistro(codigo));
  } else {
    panel.append(crearElemento('p',{class:'aviso-cita'},
      'Las citas las agenda el cliente desde su cuenta.'));
  }
  contenido.append(
    crearElemento('div', { class: 'detalle' }, crearFotografia(vehiculo), panel)
  );
}

function crearAvisoRegistro(codigo) {
  const volver = '#vehiculo/' + codigo;
  const guardarRetorno = () => sessionStorage.setItem('nicar-return',volver);
  const ingreso = crearElemento('a',{class:'boton',href:'#ingresar',onClick:guardarRetorno},'Iniciar sesi�n');
  const registro = crearElemento('a',{class:'boton',href:'#registro',onClick:guardarRetorno},'Crear cuenta de cliente');
  return crearElemento('div',{class:'aviso-cita'},
    crearElemento('strong',{},'Para agendar una visita necesit�s una cuenta de cliente.'),
    crearElemento('p',{},'Registrate o inici� sesi�n. Al volver a esta ficha podr�s reservar el horario.'),
    crearElemento('div',{class:'acciones-cita'},ingreso,registro)
  );
}

