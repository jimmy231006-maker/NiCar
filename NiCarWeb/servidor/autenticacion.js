import { ServicioClientes } from './servicios/servicio-clientes.js';
import { validaciones } from './validaciones.js';
import { Cliente } from './modelos/cliente.js';
import { conexion, ejecutarTransaccion } from './base-datos.js';
import { rechazar, responderJson, leerFormulario } from './respuestas.js';
import {
  crearCredenciales,
  verificarContrasena,
  crearToken,
  resumirToken,
  guardarCookie
} from './credenciales.js';
import {
  validarCorreo,
  validarContrasena
} from '../publico/scripts/validaciones.js';
function accountRestantes(cuenta) {
    if (!cuenta || cuenta.blocked) return 0;
    const intentos = cuenta.BloqueadoHasta ? 1 : cuenta.IntentosFallidos + 1;
    return Math.max(0,5-intentos);
  }
const credencialesFicticias = await crearCredenciales(crearToken());
export async function atenderAutenticacion(solicitud, respuesta, ruta, usuario) {
  if (ruta === '/api/sesion' && solicitud.method === 'GET') {
    responderJson(respuesta, usuario);
    return true;
  }
  if (!ruta.startsWith('/api/autenticacion/') || solicitud.method !== 'POST') {
    return false;
  }
  const datos = await leerFormulario(solicitud);
  if (ruta.endsWith('/registro')) {
    datos.Nombre = [datos.Nombres,datos.Apellidos].join(' ');
    const identificacion = validaciones.validarRegistro(datos);
    const cliente = new Cliente(datos.Nombre, datos.Correo, identificacion);
    const perfil = cliente.obtenerDatos();
    const clave = await crearCredenciales(datos.Contrasena);
    await ejecutarTransaccion(async baseDatos => {
      const idCliente = await new ServicioClientes(baseDatos).registrar(datos);
      await baseDatos.query(
      `INSERT INTO nicar."Usuario"
      ("NombreUsuario","NombreCompleto","Cedula","Nacimiento","TipoDocumento","NumeroDocumento","EdadDeclarada","Rol","HashContrasena","Salt","DebeCambiarContrasena","IdCliente")
      VALUES ($1,$2,$3,$4,$5,$6,$7,'Cliente',$8,$9,false,$10)`,
      [
        perfil.NombreUsuario,
        perfil.NombreCompleto,
        perfil.Cedula,
        perfil.Nacimiento,
        perfil.TipoDocumento,
        perfil.NumeroDocumento,
        perfil.EdadDeclarada,
        clave.HashContrasena,
        clave.Salt,
        idCliente
      ]
    );
    });
    responderJson(respuesta, { message: 'Cuenta creada. Inici� sesi�n.' }, 201);
  } else if (ruta.endsWith('/ingresar')) {
    validarCorreo(datos.Correo);
    if (typeof datos.Contrasena !== 'string' || datos.Contrasena.length > 100) {
      rechazar('Revis� tus credenciales.');
    }
    const resultado = await ejecutarTransaccion(async (baseDatos) => {
      const { rows: filas } = await baseDatos.query(
        `SELECT *, "BloqueadoHasta" > (now() AT TIME ZONE 'UTC') AS blocked
        FROM nicar."Usuario" WHERE "NombreUsuario"=$1 FOR UPDATE`,
        [datos.Correo.trim().toLowerCase()]
      );
      const cuenta = filas[0];
      const valido = await verificarContrasena(
        datos.Contrasena,
        cuenta || credencialesFicticias
      );
      const esSuperAdministrador = cuenta?.Rol === 'SuperAdministrador';
      const bloqueada = !esSuperAdministrador && Boolean(cuenta?.blocked);
      if (!cuenta || !cuenta.Activo || bloqueada || !valido) {
        if (cuenta?.Activo && !esSuperAdministrador && !bloqueada) {
          const intentos = cuenta.BloqueadoHasta ? 1 : cuenta.IntentosFallidos + 1;
          await baseDatos.query(
            `UPDATE nicar."Usuario" SET "IntentosFallidos"=$1,
            "BloqueadoHasta"=CASE WHEN $1>=5 THEN (now() AT TIME ZONE 'UTC')+interval '15 minutes' END
            WHERE "IdUsuario"=$2`,
            [intentos, cuenta.IdUsuario]
          );
        }
        await baseDatos.query(
          `INSERT INTO nicar."LogAcceso" ("NombreIngresado","Evento") VALUES ($1,'Acceso fallido')`,
          [datos.Correo.trim()]
        );
        const restantes = accountRestantes(cuenta);
        const mensaje = !cuenta ? 'El usuario no est� registrado.'
          : !cuenta.Activo ? 'La cuenta est� desactivada.'
          : esSuperAdministrador ? 'El usuario es correcto, pero la contrase�a no coincide.'
          : bloqueada ? 'La cuenta est� bloqueada. Esper� 15 minutos.'
          : restantes === 0 ? 'El usuario es correcto. Se agotaron los cinco intentos. Esper� 15 minutos.'
          : 'El usuario es correcto, pero la contrase�a no. Te quedan ' + restantes + ' intentos.';
        return { mensaje };
      }
      await baseDatos.query(
        `UPDATE nicar."Usuario" SET "IntentosFallidos"=0,"BloqueadoHasta"=NULL WHERE "IdUsuario"=$1`,
        [cuenta.IdUsuario]
      );
      await baseDatos.query(
        `INSERT INTO nicar."LogAcceso" ("IdUsuario","NombreIngresado","Evento") VALUES ($1,$2,'Inicio de sesi�n')`,
        [cuenta.IdUsuario, cuenta.NombreUsuario]
      );
      const token = crearToken();
      await baseDatos.query(`DELETE FROM nicar."SesionWeb" WHERE "Expira"<now()`);
      await baseDatos.query(
        `INSERT INTO nicar."SesionWeb" VALUES ($1,$2,now()+interval '30 minutes')`,
        [resumirToken(token), cuenta.IdUsuario]
      );
      return { token };
    });
    if (resultado.mensaje) {
      rechazar(resultado.mensaje,401);
    }
    guardarCookie(respuesta, resultado.token);
    responderJson(respuesta, { message: 'Sesi�n iniciada.' });
  } else if (ruta.endsWith('/salir')) {
    const token = /nicar=([a-f0-9]{64})/.exec(solicitud.headers.cookie || '')?.[1];
    if (token) {
      await conexion.query(`DELETE FROM nicar."SesionWeb" WHERE "Token"=$1`, [
        resumirToken(token)
      ]);
    }
    guardarCookie(respuesta, '', 0);
    responderJson(respuesta, { message: 'Sesi�n cerrada.' });
  } else if (ruta.endsWith('/contrasena')) {
    if (!usuario) {
      rechazar('Inici� sesi�n.', 401);
    }
    validarContrasena(datos.Nueva);
    const { rows: filas } = await conexion.query(
      `SELECT * FROM nicar."Usuario" WHERE "IdUsuario"=$1`,
      [usuario.IdUsuario]
    );
    if (!(await verificarContrasena(String(datos.Actual || ''), filas[0]))) {
      rechazar('La contrase�a actual no coincide.');
    }
    const clave = await crearCredenciales(datos.Nueva);
    await ejecutarTransaccion(async (baseDatos) => {
      await baseDatos.query(
        `UPDATE nicar."Usuario" SET "HashContrasena"=$1,"Salt"=$2,"DebeCambiarContrasena"=false WHERE "IdUsuario"=$3`,
        [clave.HashContrasena, clave.Salt, usuario.IdUsuario]
      );
      await baseDatos.query(`DELETE FROM nicar."SesionWeb" WHERE "IdUsuario"=$1`, [
        usuario.IdUsuario
      ]);
    });
    guardarCookie(respuesta, '', 0);
    responderJson(respuesta, {
      message: 'Contrase�a actualizada. Volv� a iniciar sesi�n.'
    });
  } else {
    return false;
  }
  return true;
}

