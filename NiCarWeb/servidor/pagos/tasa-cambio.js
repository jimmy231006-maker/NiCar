import { validaciones } from '../validaciones.js';
import { readFile } from 'node:fs/promises';

const configuracion = JSON.parse(
  await readFile(new URL('../../publico/configuracion/moneda.json', import.meta.url))
);

export class TasaCambio {
  #unidades;

  constructor(valor) {
    this.#unidades = validaciones.validarTasa(valor);
  }

  static comercial() {
    return new TasaCambio(configuracion.tasaComercial);
  }

  static oficial() {
    return new TasaCambio(configuracion.tasaOficial.valor);
  }

  get valor() {
    return Number(this.#unidades) / 1000000;
  }

  convertirACordobas(centavos, moneda) {
    if (moneda === 'NIO') return centavos;
    return (centavos * this.#unidades + 500000n) / 1000000n;
  }
}
