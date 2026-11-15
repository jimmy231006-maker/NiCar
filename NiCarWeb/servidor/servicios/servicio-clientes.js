import { validaciones } from '../validaciones.js';
import { rechazar } from '../respuestas.js';

export class ServicioClientes {
  #baseDatos;

  constructor(baseDatos) {
    this.#baseDatos = baseDatos;
  }

  async registrar(datos) {
    const identificacion = validaciones.validarIdentificacion(
      datos.TipoIdentificacion, datos.NumeroIdentificacion, datos.EdadDeclarada
    );
    const resultado = await this.#baseDatos.query(
      `INSERT INTO nicar."Cliente" ("TipoCliente","Nombres","Apellidos","TipoIdentificacion",
        "NumeroIdentificacion","EdadDeclarada","Telefono","Correo","FechaRegistro","Activo")
       VALUES ('Natural',$1,$2,$3,$4,$5,$6,$7,now() AT TIME ZONE 'America/Managua',true)
       RETURNING "IdCliente"`,
      [datos.Nombres.trim(),datos.Apellidos.trim(),identificacion.tipo,identificacion.value,
        identificacion.age,datos.Telefono,datos.Correo.trim().toLowerCase()]
    );
    return resultado.rows[0].IdCliente;
  }

  async sincronizarCuenta(cliente) {
    const resultado = await this.#baseDatos.query(
      'SELECT "IdUsuario" FROM nicar."Usuario" WHERE "IdCliente"=$1 FOR UPDATE',
      [cliente.IdCliente]
    );
    if (!resultado.rows.length) return;
    if (cliente.TipoCliente !== 'Natural') rechazar('La cuenta personal requiere un cliente natural.');
    const identificacion = validaciones.validarIdentificacion(
      cliente.TipoIdentificacion, cliente.NumeroIdentificacion, cliente.EdadDeclarada
    );
    await this.#baseDatos.query(
      `UPDATE nicar."Usuario" SET "NombreCompleto"=$1,"NombreUsuario"=$2,
       "TipoDocumento"=$3,"NumeroDocumento"=$4,"EdadDeclarada"=$5,
       "Cedula"=$6,"Nacimiento"=$7,"Activo"=$8 WHERE "IdCliente"=$9`,
      [[cliente.Nombres,cliente.Apellidos].join(' '),cliente.Correo,
        identificacion.tipo,identificacion.value,identificacion.age,
        identificacion.tipo === 'Cedula' ? identificacion.value : null,
        identificacion.birth,cliente.Activo,cliente.IdCliente]
    );
  }
}
