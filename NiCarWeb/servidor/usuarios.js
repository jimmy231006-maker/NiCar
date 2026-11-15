import { crearEmpleado } from './modelos/crear-empleado.js';
import { validaciones } from './validaciones.js';
import { conexion, ejecutarTransaccion } from './base-datos.js';
import { Cliente } from './modelos/cliente.js';
import { ServicioClientes } from './servicios/servicio-clientes.js';
import {
  responderJson,
  leerFormulario,
  rechazar,
  exigirRol,
  administradores
} from './respuestas.js';
import {
  validarNombre,
  validarCorreo,
  validarContrasena
} from '../publico/scripts/validaciones.js';
import { crearCredenciales } from './credenciales.js';
export async function atenderUsuarios(solicitud, respuesta, ruta, usuario) {
  if (ruta === '/api/auditoria' && solicitud.method === 'GET') {
    exigirRol(usuario, ['SuperAdministrador']);
    responderJson(
      respuesta,
      (
        await conexion.query(
          'SELECT * FROM nicar."LogAcceso" ORDER BY "IdLog" DESC LIMIT 500'
        )
      ).rows
    );
    return true;
  }
  const rutaRestablecer = /^\/api\/usuarios\/(\d+)\/contrasena$/.exec(ruta);
  if (!/^\/api\/usuarios(?:\/\d+)?$/.test(ruta) && !rutaRestablecer) {
    return false;
  }
  if (ruta === '/api/usuarios' && solicitud.method === 'POST') {
    exigirRol(usuario, ['SuperAdministrador', 'Administrador', 'Vendedor']);
    const rolesAsignables = usuario.Rol === 'SuperAdministrador'
      ? ['Administrador', 'Vendedor', 'Caja', 'Recepcionista', 'Bodega', 'Cliente']
      : usuario.Rol === 'Administrador'
        ? ['Vendedor', 'Caja', 'Recepcionista', 'Bodega', 'Cliente']
        : ['Cliente'];
    const datos = await leerFormulario(solicitud);
    if (!rolesAsignables.includes(datos.Rol)) rechazar('Tu rol no puede asignar ese tipo de cuenta.', 403);
    validarCorreo(datos.Correo);
    validarContrasena(datos.Contrasena);
    const clave = await crearCredenciales(datos.Contrasena);
    if (datos.Rol === 'Cliente') {
      datos.Nombre = [datos.Nombres, datos.Apellidos].join(' ');
      const identificacion = validaciones.validarRegistro(datos);
      const perfil = new Cliente(datos.Nombre, datos.Correo, identificacion).obtenerDatos();
      await ejecutarTransaccion(async baseDatos => {
        const idCliente = await new ServicioClientes(baseDatos).registrar(datos);
        await baseDatos.query(
          `INSERT INTO nicar."Usuario" ("NombreUsuario","NombreCompleto","Rol","HashContrasena","Salt",
            "DebeCambiarContrasena","Cedula","Nacimiento","TipoDocumento","NumeroDocumento","EdadDeclarada","IdCliente")
           VALUES ($1,$2,'Cliente',$3,$4,true,$5,$6,$7,$8,$9,$10)`,
          [perfil.NombreUsuario,perfil.NombreCompleto,clave.HashContrasena,clave.Salt,
            perfil.Cedula,perfil.Nacimiento,perfil.TipoDocumento,perfil.NumeroDocumento,
            perfil.EdadDeclarada,idCliente]
        );
      });
    } else {
      validarNombre(datos.Nombre);
      const perfil = crearEmpleado(datos.Nombre, datos.Correo, datos.Rol).obtenerDatos();
      await conexion.query(
        `INSERT INTO nicar."Usuario" ("NombreUsuario","NombreCompleto","Rol","HashContrasena","Salt")
         VALUES ($1,$2,$3,$4,$5)`,
        [perfil.NombreUsuario,perfil.NombreCompleto,perfil.Rol,clave.HashContrasena,clave.Salt]
      );
    }
    responderJson(respuesta,{message:'Cuenta creada. Debe cambiar la contrase�a al ingresar.'},201);
    return true;
  }
  exigirRol(usuario, administradores);
  const roles =
    usuario.Rol === 'SuperAdministrador'
      ? ['Administrador', 'Vendedor', 'Caja', 'Recepcionista', 'Bodega']
      : ['Vendedor', 'Caja', 'Recepcionista', 'Bodega'];
  if (rutaRestablecer) {
    if (solicitud.method !== 'POST') return false;
    const codigo = Number(rutaRestablecer[1]);
    if (!Number.isSafeInteger(codigo) || codigo === usuario.IdUsuario) {
      rechazar('No pod�s restablecer tu propia cuenta desde administraci�n.');
    }
    const datos = await leerFormulario(solicitud);
    validarContrasena(datos.Contrasena);
    const destino = await conexion.query(
      'SELECT "Rol" FROM nicar."Usuario" WHERE "IdUsuario"=$1 AND "Rol"=ANY($2) AND "Activo"=true',
      [codigo, roles]
    );
    if (!destino.rows[0]) rechazar('Cuenta no encontrada o sin permiso.', 404);
    const clave = await crearCredenciales(datos.Contrasena);
    await conexion.query(
      `UPDATE nicar."Usuario" SET "HashContrasena"=$1,"Salt"=$2,
       "IntentosFallidos"=0,"BloqueadoHasta"=NULL,"DebeCambiarContrasena"=true
       WHERE "IdUsuario"=$3 AND "Rol"=ANY($4)`,
      [clave.HashContrasena, clave.Salt, codigo, roles]
    );
    await conexion.query('DELETE FROM nicar."SesionWeb" WHERE "IdUsuario"=$1', [codigo]);
    responderJson(respuesta, {
      message: 'Contrase�a restablecida. La persona debe cambiarla al iniciar sesi�n.'
    });
  } else if (solicitud.method === 'GET') {
    responderJson(
      respuesta,
      (
        await conexion.query(
          `SELECT "IdUsuario","NombreUsuario","NombreCompleto","Rol","Activo","IntentosFallidos","BloqueadoHasta","PorcentajeComision"
      FROM nicar."Usuario" WHERE "Rol"=ANY($1) ORDER BY "NombreCompleto"`,
          [
            usuario.Rol === 'SuperAdministrador'
              ? [...roles, 'SuperAdministrador']
              : roles
          ]
        )
      ).rows
    );
  } else if (solicitud.method === 'PUT') {
    const codigo = Number(ruta.split('/').pop());
    const datos = await leerFormulario(solicitud);
    if (!Number.isSafeInteger(codigo) || codigo === usuario.IdUsuario) {
      rechazar('No pod�s editar tu propia cuenta desde administraci�n.');
    }
    const destino = await conexion.query(
      'SELECT "Rol" FROM nicar."Usuario" WHERE "IdUsuario"=$1 AND "Rol"=ANY($2)',
      [codigo, roles]
    );
    if (!destino.rows[0]) rechazar('Cuenta no encontrada o sin permiso.', 404);
    const rolDestino = destino.rows[0].Rol;
    if (usuario.Rol !== 'SuperAdministrador' && rolDestino === 'Administrador') {
      rechazar('Solo el superadministrador puede modificar cuentas administrativas.', 403);
    }
    if (datos.Nombre !== undefined) {
      validarNombre(datos.Nombre);
      if (datos.Nombre.length > 100) rechazar('El nombre no puede superar 100 caracteres.');
    }
    if (datos.Correo !== undefined) {
      validarCorreo(datos.Correo);
      if (datos.Correo.length > 50) rechazar('El correo no puede superar 50 caracteres.');
    }
    if (datos.Rol !== undefined && (!roles.includes(datos.Rol) || datos.Rol === 'SuperAdministrador')) {
      rechazar('No pod�s asignar ese rol.');
    }
    if (datos.PorcentajeComision !== undefined && Number(datos.PorcentajeComision) !== 5) {
      rechazar('La comisi�n es fija en 5%.');
    }
    const campos = [];
    const valores = [];
    for (const [clave, columna] of [['Nombre','NombreCompleto'],['Correo','NombreUsuario'],['Rol','Rol']]) {
      if (datos[clave] !== undefined) {
        valores.push(String(datos[clave]).trim());
        campos.push(`"${columna}"=$${valores.length}`);
      }
    }
    if (!campos.length) rechazar('Indic� al menos un dato que quieras actualizar.');
    valores.push(codigo, roles);
    const resultado = await conexion.query(
      `UPDATE nicar."Usuario" SET ${campos.join(', ')}
       WHERE "IdUsuario"=$${valores.length - 1} AND "Rol"=ANY($${valores.length})
       RETURNING "IdUsuario"`, valores
    );
    if (!resultado.rows.length) rechazar('La cuenta cambi� o ya no est� disponible.', 409);
    responderJson(respuesta, { message: 'Datos de la cuenta actualizados.' });
  } else if (solicitud.method === 'DELETE') {
    const codigo = Number(ruta.split('/').pop());
    if (codigo === usuario.IdUsuario) {
      rechazar('No pod�s desactivar tu propia cuenta.');
    }
    await conexion.query(
      `UPDATE nicar."Usuario" SET "Activo"=NOT "Activo" WHERE "IdUsuario"=$1 AND "Rol"=ANY($2)`,
      [codigo, roles]
    );
    responderJson(respuesta, { message: 'Estado actualizado.' });
  } else {
    return false;
  }
  return true;
}

