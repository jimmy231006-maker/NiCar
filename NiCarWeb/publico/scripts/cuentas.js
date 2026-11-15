import {
  contenido,
  crearElemento,
  mostrarTitulo,
  tabla,
  mostrarAviso,
  obtenerEtiqueta
} from './elementos.js';
import { crearCampo, abrirFormularioModal } from './formularios.js';
import { consultarApi, estado } from './conexion-api.js';
export async function mostrarUsuarios() {
  mostrarTitulo('Cuentas');
  contenido.append(
    crearElemento(
      'button',
      {
        onClick: () =>
          abrirFormularioModal(
            'Crear cuenta del personal',
            [
              crearCampo('Nombre', {
                required: true,
                max: 100,
                label: 'Nombre completo'
              }),
              crearCampo('Correo', { required: true, type: 'email', max: 50 }),
              crearCampo('Contrasena', {
                required: true,
                type: 'password',
                max: 100,
                label: 'Contraseña temporal (mínimo 12 caracteres)'
              }),
              crearCampo('Rol', {
                required: true,
                choices:
                  estado.usuario.Rol === 'SuperAdministrador'
                    ? ['Administrador', 'Vendedor', 'Recepcionista', 'Bodega']
                    : ['Vendedor', 'Recepcionista', 'Bodega']
              })
            ],
            async (datos) => {
              await consultarApi('/usuarios', 'POST', datos);
              await mostrarUsuarios();
            }
          )
      },
      'Crear cuenta'
    )
  );
  contenido.append(
    tabla(await consultarApi('/usuarios'), (fila) => [
      crearElemento('button', { onClick: () => editarCuenta(fila) }, 'Editar'),
      crearElemento(
        'button',
        {
          onClick: async () => {
            try {
              await consultarApi('/usuarios/' + fila.IdUsuario, 'DELETE', {});
              await mostrarUsuarios();
            } catch (problema) {
              mostrarAviso(problema.message);
            }
          }
        },
        fila.Activo ? 'Desactivar' : 'Activar'
      )
    ])
  );
}
export async function mostrarAuditoria() {
  mostrarTitulo('Auditoría de accesos');
  contenido.append(crearElemento('a', { href:'/api/auditoria/pdf',class:'boton',download:'NiCar_Logs_Acceso.pdf' }, 'Descargar logs en PDF'));
  contenido.append(tabla(await consultarApi('/auditoria')));
}
