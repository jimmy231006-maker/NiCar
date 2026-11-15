import { adaptarFormularioVehiculo } from './formulario-vehiculo.js';
import { crearCargaFotografia } from './fotografias.js';
import { adaptarFormularioPago, mensajeVenta } from './pagos.js';
import {
  contenido,
  crearElemento,
  mostrarTitulo,
  tabla,
  mostrarAviso,
  obtenerEtiqueta
} from './elementos.js';
import { crearCampo, abrirFormularioModal } from './formularios.js';
import { consultarApi, estado } from './conexion-api.js';
import { crearSelectorVehiculo } from './ficha-venta.js';
const titulos = {
  Marca: 'Marcas',
  Modelo: 'Modelos',
  Vehiculo: 'Inventario',
  Cliente: 'Clientes',
  Proveedor: 'Proveedores',
  Financiera: 'Financieras',
  ContratoColaborador: 'Contratos de colaboradores',
  PagoColaborador: 'Pagos de colaboradores',
  CuotaCredito: 'Tabla del banco (solo consulta)',
  ContratoVenta: 'Contratos de venta',
  PagoVenta: 'Pagos de ventas',
  TipoCosto: 'Tipos de costo',
  CostoVehiculo: 'Costos',
  AdquisicionVehiculo: 'Adquisiciones',
  Venta: 'Ventas'
};
const referencias = {
  IdMarca: 'Marca',
  IdModelo: 'Modelo',
  IdVehiculo: 'Vehiculo',
  IdCliente: 'Cliente',
  IdProveedor: 'Proveedor',
  IdFinanciera: 'Financiera',
  IdUsuario: 'Colaborador',
  IdContrato: 'ContratoColaborador',
  IdTipoCosto: 'TipoCosto',
  IdVendedor: 'Vendedor'
  , IdVenta: 'Venta'
};
function crearAccionesRegistro(modulo, fila) {
  return [
    ...(modulo.editable
      ? [crearElemento('button', { onClick: () => editarRegistro(modulo, fila) }, 'Editar')]
      : []),
    ...(modulo.deletable
      ? [crearElemento(
          'button',
          {
            class: 'boton-secundario',
            onClick: async () => {
              if (!confirm('¿Cambiar el estado de este registro?')) return;
              try {
                await consultarApi(
                  '/administracion/' + modulo.table + '/' + Object.values(fila)[0],
                  'DELETE',
                  {}
                );
                await mostrarAdministracion(modulo.table);
              } catch (problema) {
                mostrarAviso(problema.message);
              }
            }
          },
          fila.Activo === false ? 'Activar'
            : fila.Estado === 'Anulado' ? 'Anulado'
              : 'Cambiar estado'
        )]
      : [])
  ];
}

function crearInventario(filas, modelos, modulo) {
  const nombresModelo = new Map(modelos.map(modelo => [String(modelo.id), modelo.label]));
  const textoBuscar = crearElemento('input', {
    type: 'search',
    placeholder: 'Buscar por marca, modelo, año o código…',
    'aria-label': 'Buscar vehículos'
  });
  const filtroEstado = crearElemento('select', { 'aria-label': 'Filtrar por disponibilidad' },
    crearElemento('option', { value: '' }, 'Todos los estados'),
    crearElemento('option', { value: 'Disponible' }, 'Disponibles'),
    crearElemento('option', { value: 'Vendido' }, 'Vendidos')
  );
  const filtroCondicion = crearElemento('select', { 'aria-label': 'Filtrar por condición' },
    crearElemento('option', { value: '' }, 'Nuevos y usados'),
    crearElemento('option', { value: 'Nuevo' }, 'Nuevos'),
    crearElemento('option', { value: 'Usado' }, 'Usados')
  );
  const filtroTipo = crearElemento('select', { 'aria-label': 'Filtrar por tipo de vehículo' },
    crearElemento('option', { value: '' }, 'Carros y motos'),
    crearElemento('option', { value: 'carro' }, 'Carros'),
    crearElemento('option', { value: 'moto' }, 'Motocicletas')
  );
  const conteo = crearElemento('p', { class: 'inventario-conteo', 'aria-live': 'polite' });
  const tarjetas = crearElemento('div', { class: 'inventario-tarjetas' });
  const disponible = filas.filter(fila => fila.Estado === 'Disponible').length;
  const vendido = filas.filter(fila => fila.Estado === 'Vendido').length;
  const nuevos = filas.filter(fila => fila.Condicion === 'Nuevo').length;
  const resumen = crearElemento('section', { class: 'inventario-resumen', 'aria-label': 'Resumen del inventario' },
    crearElemento('article', { class: 'inventario-indicador' },
      crearElemento('span', {}, 'Unidades registradas'),
      crearElemento('strong', {}, String(filas.length))
    ),
    crearElemento('article', { class: 'inventario-indicador inventario-indicador-verde' },
      crearElemento('span', {}, 'Disponibles'),
      crearElemento('strong', {}, String(disponible))
    ),
    crearElemento('article', { class: 'inventario-indicador' },
      crearElemento('span', {}, 'Vendidos'),
      crearElemento('strong', {}, String(vendido))
    ),
    crearElemento('article', { class: 'inventario-indicador' },
      crearElemento('span', {}, 'Vehículos nuevos'),
      crearElemento('strong', {}, String(nuevos))
    )
  );
  const filtros = crearElemento('section', { class: 'inventario-filtros', 'aria-label': 'Buscar y filtrar inventario' },
    textoBuscar, filtroEstado, filtroCondicion, filtroTipo
  );
  const moneda = valor => valor == null
    ? 'Precio por confirmar'
    : new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'USD' }).format(Number(valor));
  const dibujar = () => {
    const busqueda = textoBuscar.value.trim().toLocaleLowerCase('es-NI');
    const resultado = filas.filter(fila => {
      const modelo = nombresModelo.get(String(fila.IdModelo)) || '';
      const coincideTexto = !busqueda || [
        modelo, fila.IdentificadorUnico, fila.VIN, fila.Anio, fila.ColorExterior,
        fila.TipoCarroceria, fila.Estado, fila.Condicion, fila.Ubicacion
      ].some(valor => String(valor ?? '').toLocaleLowerCase('es-NI').includes(busqueda));
      const coincideEstado = !filtroEstado.value || fila.Estado === filtroEstado.value;
      const coincideCondicion = !filtroCondicion.value || fila.Condicion === filtroCondicion.value;
      const esMoto = /moto|motocicleta/i.test(String(fila.TipoCarroceria || ''));
      const coincideTipo = !filtroTipo.value || (filtroTipo.value === 'moto' ? esMoto : !esMoto);
      return coincideTexto && coincideEstado && coincideCondicion && coincideTipo;
    });
    conteo.textContent = resultado.length === 1
      ? '1 vehículo encontrado'
      : resultado.length + ' vehículos encontrados';
    tarjetas.replaceChildren(...(resultado.length ? resultado.map(fila => {
      const modelo = nombresModelo.get(String(fila.IdModelo)) || 'Modelo sin nombre';
      const esDisponible = fila.Estado === 'Disponible';
      const foto = fila.ImagenUrl
        ? crearElemento('img', {
            src: fila.ImagenUrl,
            alt: modelo + ' ' + fila.Anio,
            loading: 'lazy',
            onError: evento => {
              evento.currentTarget.hidden = true;
              evento.currentTarget.parentElement.classList.add('sin-foto');
              evento.currentTarget.parentElement.append('Foto no disponible');
            }
          })
        : crearElemento('span', {}, 'Foto no disponible');
      const datos = [
        ['Condición', fila.Condicion || '—'],
        ['Kilometraje', Number(fila.Kilometraje || 0).toLocaleString('es-NI') + ' km'],
        ['Transmisión', fila.Transmision || '—'],
        ['Tipo', fila.TipoCarroceria || '—'],
        ...(fila.Placa ? [['Placa', fila.Placa]] : [['Matrícula', fila.EstadoMatricula || 'Pendiente']]),
        ...(fila.CilindrajeCc ? [['Cilindraje', Number(fila.CilindrajeCc).toLocaleString('es-NI') + ' cc']] : [])
      ];
      const insignias = crearElemento('div', { class: 'inventario-insignias' },
        crearElemento('span', { class: 'inventario-insignia ' + (esDisponible ? 'estado-disponible' : 'estado-vendido') },
          esDisponible ? 'Disponible' : fila.Estado || 'No disponible'
        ),
        crearElemento('span', { class: 'inventario-insignia' }, fila.Condicion || 'Condición pendiente')
      );
      return crearElemento('article', { class: 'inventario-tarjeta' },
        crearElemento('div', { class: 'inventario-foto' }, foto),
        crearElemento('div', { class: 'inventario-cuerpo' },
          insignias,
          crearElemento('p', { class: 'inventario-codigo' }, fila.IdentificadorUnico || 'Sin código'),
          crearElemento('h2', {}, String(fila.Anio || '') + ' ' + modelo),
          crearElemento('p', { class: 'inventario-color' }, fila.ColorExterior || 'Color por confirmar'),
          crearElemento('strong', { class: 'inventario-precio' }, moneda(fila.PrecioOferta)),
          crearElemento('dl', { class: 'inventario-detalles' },
            ...datos.flatMap(([etiqueta, valor]) => [
              crearElemento('dt', {}, etiqueta),
              crearElemento('dd', {}, String(valor))
            ])
          ),
          crearElemento('div', { class: 'inventario-acciones' }, crearAccionesRegistro(modulo, fila))
        )
      );
    }) : [crearElemento('p', { class: 'sin-registros' }, filas.length
      ? 'No hay vehículos que coincidan con esos filtros.'
      : 'El inventario todavía no tiene vehículos registrados.')]));
  };
  for (const control of [textoBuscar, filtroEstado, filtroCondicion, filtroTipo]) {
    control.addEventListener(control === textoBuscar ? 'input' : 'change', dibujar);
  }
  dibujar();
  return crearElemento('div', { class: 'inventario' }, resumen, filtros, conteo, tarjetas);
}

export async function mostrarAdministracion(seleccionado) {
  estado.modulos = await consultarApi('/modulos');
  if (!estado.modulos.length) {
    throw new Error('Tu cuenta no tiene módulos administrativos.');
  }
  const modulo =
    estado.modulos.find((m) => m.table === seleccionado) || estado.modulos[0];
  mostrarTitulo(titulos[modulo.table], modulo.table === 'Vehiculo' ? 'Controlá las unidades, su estado y sus características desde una vista rápida.' : undefined);
  const selector = crearElemento(
    'select',
    { 'aria-label': 'Módulo' },
    ...estado.modulos.map((m) =>
      crearElemento('option', { value: m.table }, titulos[m.table])
    )
  );
  selector.value = modulo.table;
  selector.onchange = () => (location.hash = '#administracion/' + selector.value);
  const barraAcciones = crearElemento('div', { class: 'barra-acciones' }, selector);
  if (modulo.writable) {
    barraAcciones.append(
      crearElemento('button', { onClick: () => editarRegistro(modulo) }, 'Agregar registro')
    );
  }
  contenido.append(barraAcciones);
  const filas = await consultarApi('/administracion/' + modulo.table);
  const cita = sessionStorage.getItem('nicar-venta-cita');
  if (modulo.table === 'Venta' && cita) {
    sessionStorage.removeItem('nicar-venta-cita');
    const datos = await consultarApi('/citas/' + cita + '/cliente');
    await editarRegistro(modulo, {}, datos);
  }
  if (modulo.table === 'Vehiculo') {
    const modelos = await consultarApi('/listas/Modelo');
    contenido.append(crearInventario(filas, modelos, modulo));
  } else {
    contenido.append(tabla(filas, modulo.editable || modulo.deletable
      ? fila => crearAccionesRegistro(modulo, fila)
      : null));
  }
}
async function editarRegistro(modulo, fila = {}, iniciales = {}) {
  try {
    const opcionesRelacion = {};
    for (const columna of modulo.fields.filter(
      (registro) => referencias[registro.name]
    )) {
      const referencia = referencias[columna.name];
      // Las listas de referencia se consultan en un endpoint autorizado por el servidor.
      opcionesRelacion[columna.name] = (await consultarApi('/listas/' + referencia)).map(
        (r) => ({ value: r.id, label: r.label })
      );
    }
    const entradas = modulo.fields.map((columna) => {
      const type =
        columna.type === 'date'
          ? 'date'
          : ['integer', 'smallint', 'bigint', 'numeric'].includes(columna.type)
            ? 'number'
            : 'text';
      return crearCampo(columna.name, {
        type,
        required: columna.required,
        choices: opcionesRelacion[columna.name] || modulo.options[columna.name],
        max: columna.max,
        value: iniciales[columna.name] ?? fila[columna.name] ?? (['DeduccionINSSNIO','RetencionIRNIO','AhorroAutorizadoNIO','OtrasDeduccionesNIO'].includes(columna.name) ? '0' : undefined),
        min: type === 'number' ? 0 : undefined,
        step:
          columna.type === 'numeric'
            ? columna.name === 'TasaCambio'
              ? '0.000001'
              : '0.01'
            : undefined
      });
    });
    if (modulo.table === 'Vehiculo') {
      adaptarFormularioVehiculo(entradas);
      entradas.push(crearCargaFotografia(entradas));
    }
    if (modulo.table === 'Venta') {
      const vehiculos = await consultarApi('/catalogo');
      const campoVehiculo = entradas.find(entrada => entrada.querySelector('[name="IdVehiculo"]'));
      crearSelectorVehiculo(campoVehiculo.querySelector('[name="IdVehiculo"]'), vehiculos);
      const financieras = await consultarApi('/listas/Financiera');
      entradas.push(
        crearCampo('IdFinanciera', { choices: financieras, label: 'Financiera externa' }),
        crearCampo('MontoPrimaUSD', { type: 'number', min: 0, step: '0.01', value: '0' }),
        crearCampo('CargosFinancierosUSD', { type: 'number', min: 0, step: '0.01', value: '0' }),
        crearCampo('MontoFinanciadoUSD', { type: 'number', min: 0.01, step: '0.01', label: 'Monto financiado según contrato' }),
        crearCampo('PagoMensualUSD', { type: 'number', min: 0.01, step: '0.01', label: 'Cuota mensual según contrato' }),
        crearCampo('TotalInteresesUSD', { type: 'number', min: 0, step: '0.01', label: 'Intereses totales según contrato' }),
        crearCampo('TotalContratoUSD', { type: 'number', min: 0.01, step: '0.01', label: 'Total del crédito según contrato' }),
        crearCampo('TasaAnual', { type: 'number', min: 0, max: 100, step: '0.0001' }),
        crearCampo('TasaMoraAnual', { type: 'number', min: 0, max: 100, step: '0.0001' }),
        crearCampo('PlazoMeses', { type: 'number', min: 1, max: 84, step: 1 }),
        crearCampo('FechaPrimerPago', { type: 'date', min: new Date().toISOString().slice(0, 10) })
      );
      const financiera = entradas.find(campo => campo.querySelector('[name="IdFinanciera"]'))
        .querySelector('[name="IdFinanciera"]');
      const plazo = entradas.find(campo => campo.querySelector('[name="PlazoMeses"]'))
        .querySelector('[name="PlazoMeses"]');
      financiera.addEventListener('change', () => {
        const opcion = financiera.selectedOptions[0];
        plazo.min = opcion.dataset.plazoMinimo || '1';
        plazo.max = opcion.dataset.plazoMaximo || '84';
        if (plazo.value && (Number(plazo.value) < Number(plazo.min) || Number(plazo.value) > Number(plazo.max))) plazo.value = '';
      });
      entradas.push(adaptarFormularioPago(entradas));
    }
    if (modulo.table === 'ContratoVenta') {
      entradas.push(crearCampo('Estado', {
        required:true,
        choices:modulo.options.Estado,
        value:iniciales.Estado ?? fila.Estado ?? 'Borrador',
        label:'Estado del contrato'
      }));
    }
    abrirFormularioModal(
      (Object.keys(fila).length ? 'Editar ' : 'Agregar ') +
        (titulos[modulo.table] || modulo.table),
      entradas,
      async (datos) => {
        const codigo = Object.values(fila)[0];
        const resultado = await consultarApi(
          '/administracion/' + modulo.table + (codigo ? '/' + codigo : ''),
          codigo ? 'PUT' : 'POST',
          datos
        );
        await mostrarAdministracion(modulo.table);
        return { mensaje:modulo.table === 'Venta' ? mensajeVenta(resultado) : 'Guardado correctamente.' };
      }
    );
  } catch (problema) {
    mostrarAviso(problema.message);
  }
}
