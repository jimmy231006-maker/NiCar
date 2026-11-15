import { mostrarComisiones } from './comisiones.js';
import { mostrarCitas } from './citas.js';
import {
  contenido,
  crearElemento,
  mostrarAviso,
  mostrarTitulo,
  tabla
} from './elementos.js';
import { consultarApi, estado, actualizarUsuario } from './conexion-api.js';
import { mostrarCatalogo, mostrarVehiculo } from './catalogo.js';
import { mostrarAcceso } from './acceso.js';
import { mostrarAdministracion } from './administracion.js';
import { mostrarCreditos } from './creditos.js';
import { mostrarUsuarios, mostrarAuditoria } from './cuentas.js';
function actualizarMenu() {
  const navegacion = document.querySelector('#navegacion'),
    cuenta = document.querySelector('#cuenta');
  navegacion.replaceChildren(crearElemento('a', { href: '#catalogo' }, 'Catálogo'));
  cuenta.replaceChildren();
  if (estado.usuario) {
    if (['Cliente','Vendedor','Administrador','SuperAdministrador'].includes(estado.usuario.Rol)) {
      navegacion.append(crearElemento('a', { href:'#creditos' }, 'Créditos'));
    }
    if (['SuperAdministrador','Administrador','Vendedor'].includes(estado.usuario.Rol)) {
      navegacion.append(crearElemento('a', { href:'#comisiones' }, 'Comisiones'));
    }
    navegacion.append(
      crearElemento(
        'a',
        { href: '#citas' },
        estado.usuario.Rol === 'Cliente' ? 'Mis citas' : 'Agenda'
      )
    );
    if (estado.usuario.Rol !== 'Cliente') {
      navegacion.append(
        crearElemento('a', { href: '#administracion' }, 'Administración')
      );
    }
    if (['SuperAdministrador', 'Administrador', 'Bodega'].includes(estado.usuario.Rol)) {
      navegacion.append(crearElemento('a', { href: '#kardex' }, 'Kardex'));
    }
    if (['SuperAdministrador', 'Administrador'].includes(estado.usuario.Rol)) {
      navegacion.append(crearElemento('a', { href: '#usuarios' }, 'Cuentas'));
    } else if (estado.usuario.Rol === 'Vendedor') {
      navegacion.append(crearElemento('a', { href: '#crear-cuenta' }, 'Crear cuenta'));
    }
    if (estado.usuario.Rol === 'SuperAdministrador') {
      navegacion.append(crearElemento('a', { href: '#auditoria' }, 'Auditoría'));
    }
    cuenta.append(
      crearElemento('span', {}, estado.usuario.NombreCompleto),
      crearElemento('a', { href: '#contrasena' }, 'Contraseña'),
      crearElemento(
        'button',
        {
          onClick: async () => {
            try {
              await consultarApi('/autenticacion/salir', 'POST', {});
              sessionStorage.removeItem('nicar-return');
              await actualizarUsuario();
              location.hash = '#catalogo';
              await mostrarPagina();
            } catch (problema) {
              mostrarAviso(problema.message);
            }
          }
        },
        'Salir'
      )
    );
  } else {
    cuenta.append(
      crearElemento('a', { href: '#ingresar' }, 'Ingresar'),
      crearElemento('a', { href: '#registro' }, 'Registrarme')
    );
  }
}
let numeroNavegacion = 0;
async function mostrarPagina() {
  const actual = ++numeroNavegacion;
  contenido.replaceChildren(crearElemento('p', {}, 'Cargando…'));
  try {
    await actualizarUsuario();
    actualizarMenu();
    if (estado.usuario?.Rol === 'Cliente') {
      const avisos = await consultarApi('/citas/avisos');
      for (const aviso of avisos) {
        const inicio = String(aviso.Inicio).replace(' ', 'T');
        const fecha = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(inicio) ? inicio : inicio + '-06:00');
        alert('Tu cita del ' + fecha.toLocaleString('es-NI', {
          dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Managua'
        }) + ' fue cancelada. Motivo: ' + aviso.MotivoCancelacion);
        await consultarApi('/citas/avisos/' + aviso.IdCita, 'PUT', {});
      }
    }
    const [ruta, codigo] = location.hash.slice(1).split('/');
    if (estado.usuario?.DebeCambiarContrasena && ruta !== 'contrasena') {
      location.hash = '#contrasena';
      return;
    }
    if (actual !== numeroNavegacion) {
      return;
    }
    if (ruta === 'vehiculo') {
      await mostrarVehiculo(codigo);
    } else if (['ingresar', 'registro', 'contrasena'].includes(ruta)) {
      await mostrarAcceso(ruta);
    } else if (ruta === 'administracion') {
      await mostrarAdministracion(codigo);
    } else if (ruta === 'citas') {
      await mostrarCitas();
    } else if (ruta === 'creditos') {
      await mostrarCreditos();
    } else if (ruta === 'usuarios') {
      await mostrarUsuarios();
    } else if (ruta === 'crear-cuenta') {
      await mostrarUsuarios(true);
    } else if (ruta === 'auditoria') {
      await mostrarAuditoria();
    } else if (ruta === 'kardex') {
      mostrarTitulo('Kardex');
      contenido.append(tabla(await consultarApi('/kardex')));
    } else {
      await mostrarCatalogo();
    }
  } catch (problema) {
    contenido.replaceChildren(
      crearElemento('h1', {}, 'No se pudo abrir esta página'),
      crearElemento('p', { role: 'alert' }, problema.message),
      crearElemento('a', { href: '#catalogo' }, 'Volver al catálogo')
    );
  }
}
window.addEventListener('hashchange', mostrarPagina);
await mostrarPagina();
