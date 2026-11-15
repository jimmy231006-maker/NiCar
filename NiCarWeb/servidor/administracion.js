import { ServicioClientes } from './servicios/servicio-clientes.js';
import { crearPago } from './pagos/crear-pago.js';
import { ServicioComisiones } from './servicios/servicio-comisiones.js';
import { ServicioCreditos } from './servicios/servicio-creditos.js';
import { ServicioPagoColaborador } from './servicios/servicio-pago-colaborador.js';
import { validaciones } from './validaciones.js';
import { crearRepositorio } from './repositorios/crear-repositorio.js';
import { conexion, ejecutarTransaccion } from './base-datos.js';
import {
  responderJson,
  leerFormulario,
  rechazar,
  exigirRol,
  administradores,
  personal
} from './respuestas.js';
import {
  obtenerCampos,
  opciones,
  validarDatos,
  obtenerEdad
} from './validaciones.js';
import { fechaDeHoy } from '../publico/scripts/validaciones.js';
const permisosLectura = {
  Marca: administradores,
  Modelo: administradores,
  Vehiculo: [...administradores, 'Vendedor', 'Bodega'],
  Cliente: personal,
  Proveedor: administradores,
  Financiera: administradores,
  ContratoColaborador: administradores,
  PagoColaborador: administradores,
  CuotaCredito: administradores,
  ContratoVenta: [...administradores, 'Vendedor'],
  PagoVenta: [...administradores, 'Vendedor', 'Caja'],
  TipoCosto: administradores,
  CostoVehiculo: administradores,
  AdquisicionVehiculo: administradores,
  Venta: [...administradores, 'Vendedor', 'Caja']
};
import { validarRelaciones } from './relaciones.js';
import {
  accionesModulo,
  exigirAccionModulo,
  puedeConsultarModulo,
  puedeEditarModulo
} from './permisos.js';

export async function atenderAdministracion(solicitud, respuesta, ruta, usuario) {
  if (ruta === '/api/modulos' && solicitud.method === 'GET') {
    if (!usuario) {
      rechazar('Iniciá sesión.', 401);
    }
    responderJson(
      respuesta,
      Object.entries(permisosLectura)
        .filter(([tabla]) => puedeConsultarModulo(usuario.Rol, tabla))
        .map(([tabla]) => ({
          table: tabla,
          fields: [...obtenerCampos(tabla), ...(tabla === 'ContratoVenta'
            ? [{ name:'Estado', type:'character varying', required:true, max:20 }]
            : [])].filter(
            (registro) => !['Activo', 'Activa'].includes(registro.name) &&
              !(registro.name === 'IdVendedor' && usuario.Rol === 'Vendedor')
          ),
          options: {
            ...opciones,
            ...(tabla === 'PagoVenta' ? { MetodoPago: ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque'] } : {}),
            ...(tabla === 'ContratoVenta' ? { Estado: ['Borrador', 'Firmado'] } : {})
          },
          actions: accionesModulo(usuario.Rol, tabla),
          writable: accionesModulo(usuario.Rol, tabla).some(accion => ['c', 'u'].includes(accion)),
          editable: puedeEditarModulo(usuario.Rol, tabla, 'u'),
          deletable: puedeEditarModulo(usuario.Rol, tabla, 'd')
        }))
    );
    return true;
  }
  const coincidencia = /^\/api\/administracion\/([A-Za-z]+)(?:\/(\d+))?$/.exec(ruta);
  if (!coincidencia || !permisosLectura[coincidencia[1]]) {
    return false;
  }
  const [, tabla, codigo] = coincidencia;
  exigirAccionModulo(usuario, tabla, 'r');
  if (tabla === 'PagoColaborador') {
    if (solicitud.method === 'GET') {
      const filas = await conexion.query(
        'SELECT p.*,u."NombreCompleto" AS "Colaborador",c."NumeroContrato" FROM nicar."PagoColaborador" p JOIN nicar."Usuario" u USING ("IdUsuario") JOIN nicar."ContratoColaborador" c USING ("IdContrato") ORDER BY p."FechaPago" DESC'
      );
      responderJson(respuesta,filas.rows);
      return true;
    }
    if (solicitud.method === 'POST') {
      const entrada = await leerFormulario(solicitud);
      const pago = await ejecutarTransaccion(db => new ServicioPagoColaborador(db).registrar(entrada,usuario));
      responderJson(respuesta,{ ...pago, message:'Pago guardado. El desembolso se efectúa fuera de NiCar.' },201);
      return true;
    }
    rechazar('Los pagos registrados no se editan ni se borran; conservá el historial.',405);
  }
  const repositorio = crearRepositorio(conexion, tabla);
  if (solicitud.method === 'GET') {
    if (usuario.Rol === 'Vendedor' && tabla === 'Cliente') {
      const filas = await conexion.query(
        `SELECT DISTINCT c.* FROM nicar."Cliente" c
         JOIN nicar."Usuario" u ON u."IdCliente"=c."IdCliente"
         WHERE EXISTS (SELECT 1 FROM nicar."Venta" v WHERE v."IdCliente"=c."IdCliente" AND v."IdVendedor"=$1)
            OR EXISTS (SELECT 1 FROM nicar."Cita" ci WHERE ci."IdUsuario"=u."IdUsuario" AND ci."IdVendedor"=$1)
         ORDER BY c."IdCliente" DESC LIMIT 1000`, [usuario.IdUsuario]
      );
      responderJson(respuesta, filas.rows);
    } else if (usuario.Rol === 'Vendedor' && ['Venta','ContratoVenta','PagoVenta'].includes(tabla)) {
      const consultas = {
        Venta: `SELECT * FROM nicar."Venta" WHERE "IdVendedor"=$1 ORDER BY "IdVenta" DESC LIMIT 1000`,
        ContratoVenta: `SELECT c.* FROM nicar."ContratoVenta" c JOIN nicar."Venta" v USING ("IdVenta") WHERE v."IdVendedor"=$1 ORDER BY c."IdContratoVenta" DESC LIMIT 1000`,
        PagoVenta: `SELECT p.* FROM nicar."PagoVenta" p JOIN nicar."Venta" v USING ("IdVenta") WHERE v."IdVendedor"=$1 ORDER BY p."IdPagoVenta" DESC LIMIT 1000`
      };
      const filas = await conexion.query(consultas[tabla], [usuario.IdUsuario]);
      responderJson(respuesta, filas.rows);
    } else {
      responderJson(respuesta, await repositorio.listar());
    }
    return true;
  }
  const accionPorMetodo = { POST: 'c', PUT: 'u', DELETE: 'd' };
  const accion = accionPorMetodo[solicitud.method];
  if (!accion) return false;
  exigirAccionModulo(usuario, tabla, accion);
  if (tabla === 'CuotaCredito') {
    rechazar('La tabla de amortización bancaria es de consulta y no se modifica desde este módulo.', 405);
  }
  if (tabla === 'PagoVenta' && solicitud.method === 'PUT') {
    rechazar('Los pagos de una venta se anulan conservando su historial.');
  }
  if (tabla === 'ContratoVenta' && solicitud.method === 'PUT' && codigo) {
    const contrato = await repositorio.buscar(codigo);
    if (contrato?.Estado === 'Firmado') rechazar('Un contrato firmado conserva el documento original.');
  }
  if (solicitud.method === 'DELETE') {
    if (!codigo || tabla === 'Venta') {
      rechazar('Esta operación requiere conservar el historial.');
    }
    if (['PagoVenta','ContratoVenta'].includes(tabla) && !administradores.includes(usuario.Rol)) {
      rechazar('Solo administración puede anular contratos o pagos de ventas.', 403);
    }
    await repositorio.cambiarEstado(codigo);
    responderJson(respuesta, { message: 'Estado actualizado.' });
    return true;
  }
  if (!['POST', 'PUT'].includes(solicitud.method)) {
    return false;
  }
  if (
    (solicitud.method === 'PUT' && !codigo) ||
    (solicitud.method === 'POST' && codigo)
  ) {
    rechazar('Ruta inválida.');
  }
  if (tabla === 'Venta' && solicitud.method === 'PUT') {
    rechazar('Las ventas registradas conservan su comprobante.');
  }
  const formulario = await leerFormulario(solicitud);
  const condicionesCredito = tabla === 'Venta' && formulario.MetodoPago === 'Financiamiento'
    ? Object.fromEntries(['IdFinanciera','ReferenciaPago','MontoPrimaUSD','CargosFinancierosUSD',
      'MontoFinanciadoUSD','PagoMensualUSD','TotalInteresesUSD','TotalContratoUSD',
      'TasaAnual','TasaMoraAnual','PlazoMeses','FechaPrimerPago'].map(clave => [clave,formulario[clave]]))
    : null;
  for (const clave of ['IdFinanciera','MontoPrimaUSD','CargosFinancierosUSD','TasaAnual',
    'MontoFinanciadoUSD','PagoMensualUSD','TotalInteresesUSD','TotalContratoUSD',
    'TasaMoraAnual','PlazoMeses','FechaPrimerPago']) delete formulario[clave];
  const datos = validarDatos(tabla, formulario, solicitud.method === 'POST');
  if (tabla === 'ContratoVenta') {
    datos.Estado = formulario.Estado || 'Borrador';
    if (!['Borrador','Firmado'].includes(datos.Estado)) rechazar('Seleccioná un estado válido para el contrato.');
  }
  if (['ContratoVenta','PagoVenta'].includes(tabla) && solicitud.method === 'POST') {
    datos.RegistradoPor = usuario.IdUsuario;
  }
  const resultado = await ejecutarTransaccion(async (baseDatos) => {
    const repositorioTransaccion = crearRepositorio(baseDatos, tabla);
    if (codigo) {
      const registro = await repositorioTransaccion.buscar(codigo, true);
      if (!registro) {
        rechazar('Registro no encontrado.', 404);
      }
      if (tabla === 'Cliente' && usuario.Rol === 'Vendedor') {
        const acceso = await baseDatos.query(
          `SELECT EXISTS (
             SELECT 1 FROM nicar."Venta" WHERE "IdCliente"=$1 AND "IdVendedor"=$2
             UNION ALL
             SELECT 1 FROM nicar."Cita" ci JOIN nicar."Usuario" u USING ("IdUsuario")
             WHERE u."IdCliente"=$1 AND ci."IdVendedor"=$2
           ) AS permitido`,
          [codigo, usuario.IdUsuario]
        );
        if (!acceso.rows[0]?.permitido) rechazar('Solo podés actualizar clientes que atendés.', 403);
      }
    } else {
      if (['Cliente', 'Proveedor', 'Vehiculo'].includes(tabla)) {
        datos.FechaRegistro = fechaDeHoy() + 'T12:00:00';
      }
      if (tabla === 'Vehiculo') datos.Estado = 'Disponible';
    }
    if (['ContratoVenta','PagoVenta'].includes(tabla)) {
      const ventaRelacionada = await baseDatos.query(
        `SELECT "IdVendedor",coalesce("Total","PrecioVenta"-"Descuento") AS "Total","Activa" FROM nicar."Venta"
         WHERE "IdVenta"=$1 FOR UPDATE`, [datos.IdVenta]
      );
      const venta = ventaRelacionada.rows[0];
      if (!venta?.Activa) rechazar('La venta relacionada no está activa.');
      if (usuario.Rol === 'Vendedor' && venta.IdVendedor !== usuario.IdUsuario) {
        rechazar('Solo podés gestionar contratos y pagos de tus propias ventas.', 403);
      }
      if (tabla === 'PagoVenta') {
        const acumulado = await baseDatos.query(
          `SELECT coalesce(sum(CASE WHEN "Moneda"='USD' THEN "Monto"
            ELSE "Monto"/"TasaCambio" END),0)::numeric AS total
           FROM nicar."PagoVenta" WHERE "IdVenta"=$1 AND "Estado"='Registrado'`,
          [datos.IdVenta]
        );
        const importeUSD = datos.Moneda === 'USD'
          ? Number(datos.Monto)
          : Number(datos.Monto) / Number(datos.TasaCambio || 36.60);
        if (Number(acumulado.rows[0].total) + importeUSD > Number(venta.Total) + 0.005) {
          rechazar('El pago superaría el total de la venta.');
        }
        if (datos.MetodoPago !== 'Efectivo' && !String(datos.Referencia || '').trim()) {
          rechazar('Transferencias, tarjetas y cheques requieren referencia.');
        }
        if (!['Efectivo','Transferencia','Tarjeta','Cheque'].includes(datos.MetodoPago)) {
          rechazar('Seleccioná una forma de pago válida para este registro.');
        }
        datos.TasaCambio = datos.TasaCambio || 36.60;
      }
    }
    if (tabla === 'Vehiculo') {
      datos.EstadoMatricula = datos.Placa ? 'Matriculado' : 'Pendiente';
    }
    await validarRelaciones(baseDatos, datos, tabla)
    if (condicionesCredito) {
      const financiera = await baseDatos.query(
        'SELECT "PlazoMinimoMeses","PlazoMaximoMeses" FROM nicar."Financiera" WHERE "IdFinanciera"=$1 AND "Activo" FOR SHARE',
        [condicionesCredito.IdFinanciera]
      );
      if (!financiera.rows[0]) rechazar('Seleccioná una financiera activa.');
      Object.assign(condicionesCredito, financiera.rows[0]);
      const precioFinanciado = Number(validaciones.centavos(datos.PrecioVenta) -
        validaciones.centavos(datos.Descuento)) / 100;
      validaciones.validarPlanCredito(condicionesCredito, precioFinanciado);
    }
    if (tabla === 'Venta') {
      const vehiculo = await baseDatos.query(
        'SELECT * FROM nicar."Vehiculo" WHERE "IdVehiculo"=$1 FOR UPDATE',
        [datos.IdVehiculo]
      );
      if (vehiculo.rows[0].Estado !== 'Disponible') {
        rechazar('El vehículo ya no está disponible.');
      }
      const cliente = await baseDatos.query(
        'SELECT * FROM nicar."Cliente" WHERE "IdCliente"=$1',
        [datos.IdCliente]
      );
      if (cliente.rows[0].TipoCliente === 'Natural') {
        if (cliente.rows[0].TipoIdentificacion !== 'Cedula') {
          rechazar(
            'Verificá la mayoría de edad del cliente mediante su cédula antes de vender.'
          );
        }
        if (obtenerEdad(cliente.rows[0].NumeroIdentificacion) < 18) {
          rechazar('La venta directa requiere mayoría de edad.');
        }
      }
      const pago = crearPago(datos);
      Object.assign(datos, pago.obtenerDetalle());
      const codigoVendedor = usuario.Rol === 'Vendedor'
        ? usuario.IdUsuario : datos.IdVendedor || usuario.IdUsuario;
      const comisiones = new ServicioComisiones(baseDatos);
      const totalCentavos = validaciones.centavos(datos.PrecioVenta)
        - validaciones.centavos(datos.Descuento);
      Object.assign(datos, await comisiones.calcularParaVenta(codigoVendedor, totalCentavos));
      datos.NumeroComprobante = 'V-' + crypto.randomUUID().slice(0, 20);
      datos.FechaVenta = fechaDeHoy();
      datos.UsuarioRegistro = usuario.NombreUsuario;
      await baseDatos.query(
        'UPDATE nicar."Vehiculo" SET "Estado"=\'Vendido\' WHERE "IdVehiculo"=$1',
        [datos.IdVehiculo]
      );
    }
    const registroGuardado = await repositorioTransaccion.guardar(datos, codigo || null);
    if (condicionesCredito) {
      const plan = await new ServicioCreditos(baseDatos).crear(registroGuardado, condicionesCredito);
      registroGuardado.IdCredito = plan.IdCredito;
    }
    if (tabla === 'Cliente') {
      await new ServicioClientes(baseDatos).sincronizarCuenta(registroGuardado);
    }
    return registroGuardado;
  });
  responderJson(respuesta, resultado, solicitud.method === 'POST' ? 201 : 200);
  return true;
}
