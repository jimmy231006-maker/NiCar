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
export async function mostrarUsuarios(soloCrearCliente = false) {
  const esVendedor = estado.usuario.Rol === 'Vendedor';
  mostrarTitulo(soloCrearCliente ? 'Crear cuenta de cliente' : 'Cuentas');
  contenido.append(crearElemento('button', { onClick: () => abrirCrearCliente(soloCrearCliente) },
    'Crear cuenta de cliente'));
  if (!esVendedor) {
    contenido.append(crearElemento('button', { onClick: abrirCrearPersonal }, 'Crear cuenta de personal'));
  }
  if (soloCrearCliente || esVendedor) return;
  contenido.append(tabla(await consultarApi('/usuarios'), fila => [
    crearElemento('button', { onClick: () => editarCuenta(fila) }, 'Editar'),
    ...(fila.IdUsuario !== estado.usuario.IdUsuario && fila.Activo
      ? [crearElemento('button', { onClick: () => restablecerContrasena(fila) }, 'Restablecer contraseña')]
      : []),
    crearElemento('button', { onClick: async () => {
      try {
        await consultarApi('/usuarios/' + fila.IdUsuario, 'DELETE', {});
        await mostrarUsuarios();
      } catch (problema) { mostrarAviso(problema.message); }
    } }, fila.Activo ? 'Desactivar' : 'Activar')
  ]));
}

function abrirCrearPersonal() {
  const roles = estado.usuario.Rol === 'SuperAdministrador'
    ? ['Administrador','Vendedor','Caja','Recepcionista','Bodega']
    : ['Vendedor','Caja','Recepcionista','Bodega'];
  abrirFormularioModal('Crear cuenta de personal', [
    crearCampo('Nombre',{required:true,max:100,label:'Nombre completo'}),
    crearCampo('Correo',{required:true,type:'email',max:50}),
    crearCampo('Contrasena',{required:true,type:'contrasena',max:100,minLength:12,
      label:'Contraseña temporal (mínimo 12 caracteres)'}),
    crearCampo('Rol',{required:true,choices:roles})
  ], async datos => {
    await consultarApi('/usuarios','POST',datos);
    mostrarAviso('Cuenta creada. Debe cambiar la contraseña al ingresar.');
    await mostrarUsuarios();
  });
}

function abrirCrearCliente(soloCrear = false) {
  abrirFormularioModal('Crear cuenta de cliente', [
    crearCampo('Nombres',{required:true,max:100}),
    crearCampo('Apellidos',{required:true,max:100}),
    crearCampo('Telefono',{required:true,max:8,type:'tel',label:'Teléfono'}),
    crearCampo('Correo',{required:true,type:'email',max:50}),
    crearCampo('Cedula',{required:true,max:16,label:'Cédula nicaragüense'}),
    crearCampo('Contrasena',{required:true,type:'contrasena',max:100,minLength:12,
      label:'Contraseña temporal (mínimo 12 caracteres)'}),
    crearCampo('Confirmacion',{required:true,type:'contrasena',max:100,label:'Confirmar contraseña'})
  ], async datos => {
    await consultarApi('/usuarios','POST',{...datos,Rol:'Cliente'});
    mostrarAviso('Cuenta de cliente creada. Debe cambiar la contraseña al ingresar.');
    await mostrarUsuarios(soloCrear);
  });
}

function restablecerContrasena(fila) {
  abrirFormularioModal(
    'Restablecer contraseña de ' + fila.NombreCompleto,
    [
      crearCampo('Contrasena', {
        required: true,
        type: 'contrasena',
        max: 100,
        minLength: 12,
        label: 'Nueva contraseña temporal (mínimo 12 caracteres)'
      })
    ],
    async (datos) => {
      await consultarApi(
        '/usuarios/' + fila.IdUsuario + '/contrasena',
        'POST',
        datos
      );
      await mostrarUsuarios();
    }
  );
}

function editarCuenta(fila) {
  const roles = estado.usuario.Rol === 'SuperAdministrador'
    ? ['Administrador', 'Vendedor', 'Recepcionista', 'Bodega']
    : ['Vendedor', 'Recepcionista', 'Bodega'];
  abrirFormularioModal(
    'Editar cuenta',
    [
      crearCampo('Nombre', {
        required: true, max: 100, label: 'Nombre completo', value: fila.NombreCompleto
      }),
      crearCampo('Correo', {
        required: true, type: 'email', max: 50, value: fila.NombreUsuario
      }),
      crearCampo('Rol', {
        required: true, choices: roles, value: fila.Rol
      })
    ],
    async (datos) => {
      await consultarApi('/usuarios/' + fila.IdUsuario, 'PUT', datos);
      await mostrarUsuarios();
    }
  );
}

export async function mostrarAuditoria() {
  mostrarTitulo('Auditoría de accesos');
  contenido.append(crearElemento('a', { href:'/api/auditoria/pdf',class:'boton',download:'NiCar_Logs_Acceso.pdf' }, 'Descargar logs en PDF'));
  contenido.append(tabla(await consultarApi('/auditoria')));
}
