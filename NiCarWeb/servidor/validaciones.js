import { readFile } from 'node:fs/promises';
import esquema from './esquema.js';
import { opciones, camposOcultos } from './campos.js';
import { Validaciones } from '../publico/clases/validaciones.js';

const codigos = JSON.parse(
  await readFile(new URL('../publico/scripts/codigos.json', import.meta.url))
);
const moneda = JSON.parse(
  await readFile(new URL('../publico/configuracion/moneda.json', import.meta.url))
);

export const validaciones = new Validaciones(
  codigos, esquema, opciones, camposOcultos, Number(moneda.tasaComercial)
);
export const validarDatos = validaciones.validarDatos.bind(validaciones);
export const obtenerCampos = tabla => validaciones.obtenerCampos(tabla)
  .filter(campo => !(tabla === 'Venta' && campo.name === 'TasaCambio'));
export const obtenerEdad = cedula => validaciones.obtenerNacimiento(cedula).age;
export { opciones };
export default esquema;
