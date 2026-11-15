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
  TipoCosto: administradores,
  CostoVehiculo: administradores,
  AdquisicionVehiculo: administradores,
  Venta: [...administradores, 'Vendedor']
};
import { validarRelaciones } from './relaciones.js';

export async function atenderAdministracion(solicitud, respuesta, ruta, usuario) {
  if (ruta === '/api/modulos' && solicitud.method === 'GET') {
    if (!usuario) {
      rechazar('Iniciá sesión.', 401);
    }
    responderJson(
      respuesta,
      Object.entries(permisosLectura)
        .filter(([, roles]) => roles.includes(usuario.Rol))
        .map(([tabla]) => ({
          table: tabla,
          fields: obtenerCampos(tabla).filter(
            (registro) => !['Activo', 'Activa'].includes(registro.name) &&
              !(registro.name === 'IdVendedor' && usuario.Rol === 'Vendedor')
          ),
          options: opciones,
          writable: (tabla === 'Cliente'
            ? personal
            : tabla === 'Venta'
              ? [...administradores, 'Vendedor']
              : administradores
          ).includes(usuario.Rol),
          editable: !['Venta','PagoColaborador'].includes(tabla)
        }))
    );
    return true;
  }
  const coincidencia = /^\/api\/administracion\/([A-Za-z]+)(?:\/(\d+))?$/.exec(ruta);
  if (!coincidencia || !permisosLectura[coincidencia[1]]) {
    return false;
  }
  const [, tabla, codigo] = coincidencia;
  exigirRol(usuario, permisosLectura[tabla]);
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
    responderJson(respuesta, await repositorio.listar());
    return true;
  }
  exigirRol(
    usuario,
    tabla === 'Cliente'
      ? personal
      : tabla === 'Venta'
        ? [...administradores, 'Vendedor']
        : administradores
  );
  if (solicitud.method === 'DELETE') {
    if (!codigo || tabla === 'Venta') {
      rechazar('Esta operación requiere conservar el historial.');
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
  const resultado = await ejecutarTransaccion(async (baseDatos) => {
    const repositorioTransaccion = crearRepositorio(baseDatos, tabla);
    if (codigo) {
      const registro = await repositorioTransaccion.buscar(codigo, true);
      if (!registro) {
        rechazar('Registro no encontrado.', 404);
      }
    } else {
      if (['Cliente', 'Proveedor', 'Vehiculo'].includes(tabla)) {
        datos.FechaRegistro = fechaDeHoy() + 'T12:00:00';
      }
      if (tabla === 'Vehiculo') datos.Estado = 'Disponible';
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
