import { Validaciones } from '../clases/validaciones.js';

const validaciones = new Validaciones();

// Estos enlaces conservan el mismo punto de entrada para todos los formularios.
export const fechaDeHoy = validaciones.fechaDeHoy.bind(validaciones);
export const obtenerNacimiento = validaciones.obtenerNacimiento.bind(validaciones);
export const validarIdentificacion = validaciones.validarIdentificacion.bind(validaciones);
export const validarNombre = validaciones.validarNombre.bind(validaciones);
export const validarCorreo = validaciones.validarCorreo.bind(validaciones);
export const validarTelefono = validaciones.validarTelefono.bind(validaciones);
export const validarContrasena = validaciones.validarContrasena.bind(validaciones);
