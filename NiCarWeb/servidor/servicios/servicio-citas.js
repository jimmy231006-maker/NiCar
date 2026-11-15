import { validaciones } from '../validaciones.js';
import { rechazar, administradores, personal } from '../respuestas.js';

export class ServicioCitas {
  #baseDatos;
  constructor(baseDatos) {
    this.#baseDatos = baseDatos;
  }

  #puedeGestionar(usuario, cita) {
    return administradores.includes(usuario.Rol) || usuario.Rol === 'Recepcionista' ||
      (usuario.Rol === 'Vendedor' && cita.IdVendedor === usuario.IdUsuario);
  }

  async listar(usuario) {
    const cliente = usuario.Rol === 'Cliente' ? usuario.IdUsuario : null;
    const vendedor = usuario.Rol === 'Vendedor' ? usuario.IdUsuario : null;
    const resultado = await this.#baseDatos.query(
      `SELECT c."IdCita",c."Nombre",c."Telefono",c."Inicio",c."Fin",c."Estado",
        u."NombreCompleto" AS "Vendedor",
        concat(b."Nombre",' ',m."Nombre",' ',v."Anio") AS "Vehiculo"
       FROM nicar."Cita" c JOIN nicar."Vehiculo" v USING ("IdVehiculo")
       JOIN nicar."Modelo" m USING ("IdModelo") JOIN nicar."Marca" b USING ("IdMarca")
       LEFT JOIN nicar."Usuario" u ON u."IdUsuario"=c."IdVendedor"
       WHERE ($1::integer IS NULL OR c."IdUsuario"=$1)
         AND ($2::integer IS NULL OR c."IdVendedor"=$2) ORDER BY c."Inicio"`,
      [cliente,vendedor]
    );
    return resultado.rows;
  }

  async obtenerCliente(codigo, usuario) {
    const resultado = await this.#baseDatos.query(
      `SELECT c.*,u."IdCliente",v."PrecioOferta" FROM nicar."Cita" c
       JOIN nicar."Usuario" u ON u."IdUsuario"=c."IdUsuario"
       JOIN nicar."Vehiculo" v USING ("IdVehiculo") WHERE c."IdCita"=$1`,
      [codigo]
    );
    const cita = resultado.rows[0];
    if (!cita || !this.#puedeGestionar(usuario,cita)) rechazar('Cita no encontrada.',404);
    if (!cita.IdCliente) rechazar('El personal debe vincular la ficha de este cliente.');
    return {
      IdCliente:cita.IdCliente,IdVehiculo:cita.IdVehiculo,
      IdVendedor:cita.IdVendedor,PrecioVenta:cita.PrecioOferta,
      Descuento:0,Moneda:'USD'
    };
  }

  async actualizar(codigo, datos, usuario, cancelar = false) {
    const resultado = await this.#baseDatos.query(
      'SELECT * FROM nicar."Cita" WHERE "IdCita"=$1 FOR UPDATE',[codigo]
    );
    const cita = resultado.rows[0];
    const clientePropio = usuario.Rol === 'Cliente' && cita?.IdUsuario === usuario.IdUsuario;
    if (!cita || (!clientePropio && !this.#puedeGestionar(usuario,cita))) {
      rechazar('Cita no encontrada.',404);
    }
    if (cita.Estado !== 'Pendiente') rechazar('La cita ya está cerrada.');
    if (cancelar) {
      await this.#baseDatos.query('UPDATE nicar."Cita" SET "Estado"=\'Cancelada\' WHERE "IdCita"=$1',[codigo]);
    } else if (datos.Estado === 'Atendida' && personal.includes(usuario.Rol)) {
      if (new Date(cita.Inicio+'-06:00').getTime()>Date.now()) rechazar('La visita todavía no comienza.');
      await this.#baseDatos.query('UPDATE nicar."Cita" SET "Estado"=\'Atendida\' WHERE "IdCita"=$1',[codigo]);
    } else {
      validaciones.validarCita({ ...datos,IdVehiculo:cita.IdVehiculo });
      await this.#baseDatos.query('UPDATE nicar."Cita" SET "Inicio"=$1,"Telefono"=$2 WHERE "IdCita"=$3',
        [datos.Inicio,datos.Telefono,codigo]);
    }
  }
}
