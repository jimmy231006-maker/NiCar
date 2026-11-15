import { crearEmpleado } from './modelos/crear-empleado.js';
import { validaciones } from './validaciones.js';
import { conexion } from './base-datos.js';
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
  if (!/^\/api\/usuarios(?:\/\d+)?$/.test(ruta)) {
    return false;
  }
  exigirRol(usuario, administradores);
  const roles =
    usuario.Rol === 'SuperAdministrador'
      ? ['Administrador', 'Vendedor', 'Recepcionista', 'Bodega', 'Cliente']
      : ['Vendedor', 'Recepcionista', 'Bodega', 'Cliente'];
  if (solicitud.method === 'GET') {
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
  } else if (solicitud.method === 'POST' && ruta === '/api/usuarios') {
    const datos = await leerFormulario(solicitud);
    validarNombre(datos.Nombre);
    validarCorreo(datos.Correo);
    validarContrasena(datos.Contrasena);
    if (
      datos.Nombre.length > 100 ||
      datos.Correo.length > 50 ||
      !roles.filter((r) => r !== 'Cliente').includes(datos.Rol)
    ) {
      rechazar('Revisá el nombre, correo y rol.');
    }
    const empleado = crearEmpleado(datos.Nombre, datos.Correo, datos.Rol);
    const perfil = empleado.obtenerDatos();
    const clave = await crearCredenciales(datos.Contrasena);
    await conexion.query(
      `INSERT INTO nicar."Usuario" ("NombreUsuario","NombreCompleto","Rol","HashContrasena","Salt")
      VALUES ($1,$2,$3,$4,$5)`,
      [
        perfil.NombreUsuario,
        perfil.NombreCompleto,
        perfil.Rol,
        clave.HashContrasena,
        clave.Salt
      ]
    );
    responderJson(
      respuesta,
      { message: 'Cuenta creada. Debe cambiar la contraseña al ingresar.' },
      201
    );
  } else if (solicitud.method === 'PUT') {
    const codigo = Number(ruta.split('/').pop());
    const datos = await leerFormulario(solicitud);
    if (Number(datos.PorcentajeComision) !== 5) rechazar('La comisión es fija en 5%.');
    const porcentaje = 5;
    const resultado = await conexion.query(
      'UPDATE nicar."Usuario" SET "PorcentajeComision"=$1 WHERE "IdUsuario"=$2 AND "Rol"=ANY($3) RETURNING "IdUsuario"',
      [porcentaje, codigo, roles]
    );
    if (!resultado.rows.length) rechazar('Cuenta no encontrada o sin permiso.', 404);
    responderJson(respuesta, { message: 'Porcentaje de comisión actualizado.' });
  } else if (solicitud.method === 'DELETE') {
    const codigo = Number(ruta.split('/').pop());
    if (codigo === usuario.IdUsuario) {
      rechazar('No podés desactivar tu propia cuenta.');
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
