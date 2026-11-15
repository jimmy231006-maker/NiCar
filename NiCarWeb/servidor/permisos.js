import { rechazar } from './respuestas.js';

const soloLectura = ['r'];
const crearConsultar = ['r', 'c'];
const completo = ['r', 'c', 'u', 'd'];
const sinBorrado = ['r', 'c', 'u'];

const permisos = {
  Marca: { SuperAdministrador: completo, Administrador: completo },
  Modelo: { SuperAdministrador: completo, Administrador: completo },
  Vehiculo: {
    SuperAdministrador: completo, Administrador: completo,
    Vendedor: soloLectura, Bodega: completo
  },
  Cliente: {
    SuperAdministrador: completo, Administrador: completo,
    Vendedor: sinBorrado, Recepcionista: soloLectura
  },
  Proveedor: { SuperAdministrador: completo, Administrador: completo },
  Financiera: { SuperAdministrador: completo, Administrador: completo },
  ContratoColaborador: { SuperAdministrador: completo, Administrador: completo },
  PagoColaborador: { SuperAdministrador: crearConsultar, Administrador: crearConsultar },
  CuotaCredito: {
    SuperAdministrador: soloLectura, Administrador: soloLectura,
    Vendedor: soloLectura, Cliente: soloLectura
  },
  ContratoVenta: {
    SuperAdministrador: completo, Administrador: completo,
    Vendedor: ['r', 'c', 'u']
  },
  PagoVenta: {
    SuperAdministrador: ['r', 'c', 'd'], Administrador: ['r', 'c', 'd'],
    Vendedor: crearConsultar
  },
  TipoCosto: { SuperAdministrador: completo, Administrador: completo },
  CostoVehiculo: { SuperAdministrador: completo, Administrador: completo },
  AdquisicionVehiculo: {
    SuperAdministrador: completo, Administrador: completo,
    Bodega: sinBorrado
  },
  Venta: { SuperAdministrador: crearConsultar, Administrador: crearConsultar, Vendedor: crearConsultar }
};

export function accionesModulo(rol, modulo) {
  return [...(permisos[modulo]?.[rol] || [])];
}

export function exigirAccionModulo(usuario, modulo, accion) {
  if (!usuario) rechazar('Iniciá sesión para continuar.', 401);
  if (!accionesModulo(usuario.Rol, modulo).includes(accion)) {
    rechazar('Tu rol no tiene permiso para esta operación en este módulo.', 403);
  }
}

export function puedeConsultarModulo(rol, modulo) {
  return accionesModulo(rol, modulo).includes('r');
}

export function puedeEditarModulo(rol, modulo, accion) {
  return accionesModulo(rol, modulo).includes(accion);
}
