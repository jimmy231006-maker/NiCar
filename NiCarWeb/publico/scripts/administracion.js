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
export async function mostrarAdministracion(seleccionado) {
  estado.modulos = await consultarApi('/modulos');
  if (!estado.modulos.length) {
    throw new Error('Tu cuenta no tiene módulos administrativos.');
  }
  const modulo =
    estado.modulos.find((m) => m.table === seleccionado) || estado.modulos[0];
  mostrarTitulo(titulos[modulo.table]);
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
  contenido.append(
    tabla(
      filas,
      modulo.editable || modulo.deletable
        ? (fila) => [
            ...(modulo.editable
              ? [crearElemento('button', { onClick: () => editarRegistro(modulo, fila) }, 'Editar')]
              : []),
            ...(modulo.deletable ? [crearElemento(
              'button',
              {
                onClick: async () => {
                  if (!confirm('¿Cambiar el estado de este registro?')) {
                    return;
                  }
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
                  : 'Anular registro'
            )] : [])
          ]
        : null
    )
  );
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
