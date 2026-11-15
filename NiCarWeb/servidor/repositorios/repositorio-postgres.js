import { IRepositorio } from '../interfaces/IRepositorio.js';
import esquema from '../esquema.js';
import { rechazar } from '../respuestas.js';

export class RepositorioPostgres extends IRepositorio {
  #baseDatos;
  #tabla;
  #clavePrimaria;
  #columnas;

  constructor(baseDatos, tabla) {
    super();
    if (!esquema[tabla]) {
      rechazar('La entidad solicitada no existe.');
    }
    this.#baseDatos = baseDatos;
    this.#tabla = tabla;
    this.#clavePrimaria = esquema[tabla][0].name;
    this.#columnas = esquema[tabla].filter(campo => !campo.generated).map(campo => campo.name);
  }

  async listar() {
    const resultado = await this.#baseDatos.query(
      `SELECT * FROM nicar."${this.#tabla}"
       ORDER BY "${this.#clavePrimaria}" DESC LIMIT 1000`
    );
    return resultado.rows;
  }

  async buscar(codigo, bloquear = false) {
    const bloqueo = bloquear ? ' FOR UPDATE' : '';
    const resultado = await this.#baseDatos.query(
      `SELECT * FROM nicar."${this.#tabla}"
       WHERE "${this.#clavePrimaria}"=$1${bloqueo}`,
      [codigo]
    );
    return resultado.rows[0] || null;
  }

  async guardar(datos, codigo = null) {
    const columnas = Object.keys(datos);
    if (!columnas.length || columnas.some(columna => !this.#columnas.includes(columna))) {
      rechazar('El formulario contiene campos no permitidos.');
    }
    const valores = columnas.map(columna =>
      columna === 'DetalleCambio' && datos[columna] !== null
        ? JSON.stringify(datos[columna]) : datos[columna]
    );
    let resultado;
    if (codigo !== null) {
      const asignaciones = columnas.map((columna, indice) => `"${columna}"=$${indice + 1}`);
      resultado = await this.#baseDatos.query(
        `UPDATE nicar."${this.#tabla}" SET ${asignaciones.join(',')}
         WHERE "${this.#clavePrimaria}"=$${valores.length + 1} RETURNING *`,
        [...valores, codigo]
      );
    } else {
      const nombres = columnas.map(columna => '"' + columna + '"').join(',');
      const parametros = columnas.map((_, indice) => '$' + (indice + 1)).join(',');
      resultado = await this.#baseDatos.query(
        `INSERT INTO nicar."${this.#tabla}" (${nombres})
         VALUES (${parametros}) RETURNING *`,
        valores
      );
    }
    if (!resultado.rows[0]) {
      rechazar('Registro no encontrado.', 404);
    }
    return resultado.rows[0];
  }

  async cambiarEstado(codigo) {
    const campo = this.#tabla === 'Venta' ? 'Activa' : 'Activo';
    if (!this.#columnas.includes(campo)) {
      if (!this.#columnas.includes('Estado')) rechazar('Esta entidad conserva su historial.');
      const resultado = await this.#baseDatos.query(
        `UPDATE nicar."${this.#tabla}" SET "Estado"='Anulado'
         WHERE "${this.#clavePrimaria}"=$1 AND "Estado"<>'Anulado' RETURNING *`,
        [codigo]
      );
      if (!resultado.rows[0]) rechazar('Registro no encontrado o ya anulado.', 404);
      return resultado.rows[0];
    }
    const resultado = await this.#baseDatos.query(
      `UPDATE nicar."${this.#tabla}" SET "${campo}"=NOT "${campo}"
       WHERE "${this.#clavePrimaria}"=$1 RETURNING *`,
      [codigo]
    );
    if (!resultado.rows[0]) {
      rechazar('Registro no encontrado.', 404);
    }
    return resultado.rows[0];
  }
}
