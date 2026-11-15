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
        c."MotivoCancelacion",
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

  async crear(datos, usuario = null) {
    if (usuario?.Rol !== 'Cliente') {
      rechazar('Inici� sesi�n con una cuenta de cliente para agendar.', 401);
    }
    validaciones.validarCita(datos);
    const vehiculo = await this.#baseDatos.query(
      `SELECT "Activo","Estado" FROM nicar."Vehiculo"
       WHERE "IdVehiculo"=$1 FOR SHARE`,
      [Number(datos.IdVehiculo)]
    );
    if (!vehiculo.rows[0]?.Activo || vehiculo.rows[0].Estado !== 'Disponible') {
      rechazar('El veh�culo ya no est� disponible.');
    }
    const cuenta = await this.#baseDatos.query(
      `SELECT "NombreCompleto","TipoDocumento","NumeroDocumento","EdadDeclarada","Telefono"
       FROM nicar."Usuario" u
       JOIN nicar."Cliente" c ON c."IdCliente"=u."IdCliente"
       WHERE u."IdUsuario"=$1 AND u."Rol"='Cliente' AND u."Activo" AND c."Activo"`,
      [usuario.IdUsuario]
    );
    if (!cuenta.rows[0]) rechazar('La cuenta de cliente no est� activa.', 403);
    let identificacion;
    try {
      identificacion = validaciones.validarIdentificacion(
        cuenta.rows[0].TipoDocumento,
        cuenta.rows[0].NumeroDocumento,
        cuenta.rows[0].EdadDeclarada
      );
    } catch {
      rechazar('Para agendar se requiere una cuenta de cliente activa y mayor de edad.', 403);
    }
    validaciones.validarTelefono(datos.Telefono);
    const resultado = await this.#baseDatos.query(
      `INSERT INTO nicar."Cita"
       ("IdVehiculo","Nombre","Telefono","Inicio","IdUsuario","FechaNacimientoReserva","Cupo")
       VALUES ($1,$2,$3,$4,$5,$6,1) RETURNING "IdCita","Inicio","IdVendedor"`,
      [Number(datos.IdVehiculo),cuenta.rows[0].NombreCompleto,datos.Telefono,
        datos.Inicio.replace('T',' '),usuario.IdUsuario,
        identificacion.birth]
    );
    return resultado.rows[0];
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

  async avisosCliente(usuario) {
    const resultado = await this.#baseDatos.query(
      `SELECT "IdCita", "Inicio", "MotivoCancelacion"
       FROM nicar."Cita"
       WHERE "IdUsuario"=$1 AND "Estado"='Cancelada'
         AND NOT "AvisoClienteLeido" AND "CanceladaPor" IS NOT NULL
       ORDER BY "Inicio" DESC`,
      [usuario.IdUsuario]
    );
    return resultado.rows;
  }

  async marcarAvisoLeido(codigo, usuario) {
    await this.#baseDatos.query(
      `UPDATE nicar."Cita" SET "AvisoClienteLeido"=true,"AvisoLeidoEn"=now()
       WHERE "IdCita"=$1 AND "IdUsuario"=$2 AND "Estado"='Cancelada'`,
      [codigo, usuario.IdUsuario]
    );
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
    if (cita.Estado !== 'Pendiente') rechazar('La cita ya est� cerrada.');
    if (cancelar) {
      const esAdministrador = administradores.includes(usuario.Rol);
      if (esAdministrador && !String(datos.MotivoCancelacion || '').trim()) {
        rechazar('Indic� el motivo de la cancelaci�n.');
      }
      if (!esAdministrador && usuario.Rol !== 'Cliente') {
        rechazar('Solo administraci�n puede cancelar la cita de un cliente.');
      }
      const motivo = esAdministrador
        ? String(datos.MotivoCancelacion).trim()
        : 'Cancelada por el cliente.';
      if (motivo.length > 500) rechazar('El motivo no puede superar 500 caracteres.');
      await this.#baseDatos.query(
        `UPDATE nicar."Cita" SET "Estado"='Cancelada',"MotivoCancelacion"=$1,
         "CanceladaPor"=$2,"AvisoClienteLeido"=$3,"AvisoLeidoEn"=NULL WHERE "IdCita"=$4`,
        [motivo, usuario.IdUsuario, !esAdministrador, codigo]
      );
    } else if (datos.Estado === 'Atendida' && personal.includes(usuario.Rol)) {
      if (new Date(cita.Inicio+'-06:00').getTime()>Date.now()) rechazar('La visita todav�a no comienza.');
      await this.#baseDatos.query('UPDATE nicar."Cita" SET "Estado"=\'Atendida\' WHERE "IdCita"=$1',[codigo]);
    } else {
      validaciones.validarCita({ ...datos,IdVehiculo:cita.IdVehiculo });
      await this.#baseDatos.query('UPDATE nicar."Cita" SET "Inicio"=$1,"Telefono"=$2 WHERE "IdCita"=$3',
        [datos.Inicio,datos.Telefono,codigo]);
    }
  }
}

