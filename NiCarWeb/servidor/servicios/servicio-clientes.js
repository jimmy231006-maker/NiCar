import { validaciones } from '../validaciones.js';
import { rechazar } from '../respuestas.js';

export class ServicioClientes {
  #baseDatos;

  constructor(baseDatos) {
    this.#baseDatos = baseDatos;
  }

  async registrar(datos) {
    const nacimiento = validaciones.obtenerNacimiento(datos.Cedula);
    const resultado = await this.#baseDatos.query(
      `INSERT INTO nicar."Cliente" ("TipoCliente","Nombres","Apellidos","TipoIdentificacion",
        "NumeroIdentificacion","Telefono","Correo","FechaRegistro","Activo")
       VALUES ('Natural',$1,$2,'Cedula',$3,$4,$5,now() AT TIME ZONE 'America/Managua',true)
       RETURNING "IdCliente"`,
      [datos.Nombres.trim(),datos.Apellidos.trim(),nacimiento.value,
        datos.Telefono,datos.Correo.trim().toLowerCase()]
    );
    return resultado.rows[0].IdCliente;
  }

  async sincronizarCuenta(cliente) {
    const resultado = await this.#baseDatos.query(
      'SELECT "IdUsuario" FROM nicar."Usuario" WHERE "IdCliente"=$1 FOR UPDATE',
      [cliente.IdCliente]
    );
    if (!resultado.rows.length) return;
    if (cliente.TipoCliente !== 'Natural' || cliente.TipoIdentificacion !== 'Cedula') {
      rechazar('La ficha vinculada a una cuenta personal requiere cédula y nombres.');
    }
    const nacimiento = validaciones.obtenerNacimiento(cliente.NumeroIdentificacion);
    if (nacimiento.age < 18) rechazar('La cuenta de cliente requiere mayoría de edad.');
    await this.#baseDatos.query(
      `UPDATE nicar."Usuario" SET "NombreCompleto"=$1,"NombreUsuario"=$2,
       "Cedula"=$3,"Nacimiento"=$4,"Activo"=$5 WHERE "IdCliente"=$6`,
      [[cliente.Nombres,cliente.Apellidos].join(' '),cliente.Correo,
        nacimiento.value,nacimiento.birth,cliente.Activo,cliente.IdCliente]
    );
  }
}
