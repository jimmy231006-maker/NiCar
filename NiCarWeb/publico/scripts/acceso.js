import { contenido, crearElemento, mostrarTitulo, mostrarAviso } from './elementos.js';
import { crearCampo, crearFormulario } from './formularios.js';
import { consultarApi, actualizarUsuario, estado } from './conexion-api.js';
import {
  validarNombre,
  validarCorreo,
  validarContrasena,
  validarIdentificacion
} from './validaciones.js';
export async function mostrarAcceso(modo) {
  mostrarTitulo(
    modo === 'registro'
      ? 'Crear cuenta'
      : modo === 'contrasena'
        ? 'Cambiar contraseña'
        : 'Iniciar sesión'
  );
  const especificaciones =
    modo === 'registro'
      ? [
          crearCampo('Nombres', { required: true, max: 100, label: 'Nombres' }),
          crearCampo('Apellidos', { required: true, max: 100 }),
          crearCampo('Telefono', { required: true, max: 8, type: 'tel', label: 'Teléfono' }),
          crearCampo('Correo', { type: 'email', required: true, max: 50 }),
          crearCampo('TipoIdentificacion', { required: true, choices: [
            { value: 'Cedula', label: 'Cédula nicaragüense' },
            { value: 'Pasaporte', label: 'Pasaporte' },
            { value: 'Residencia', label: 'Residencia' }
          ] }),
          crearCampo('NumeroIdentificacion', { required: true, max: 20, label: 'Número de identificación' }),
          crearCampo('EdadDeclarada', { type: 'number', min: 18, max: 120, step: 1,
            label: 'Edad (solo pasaporte o residencia)' }),
          crearCampo('Contrasena', {
            type: 'contrasena',
            required: true,
            max: 100,
            label: 'Contraseña (mínimo 12 caracteres)'
          }),
          crearCampo('Confirmacion', {
            type: 'contrasena',
            required: true,
            label: 'Confirmar contraseña'
          })
        ]
      : modo === 'contrasena'
        ? [
            crearCampo('Actual', {
              type: 'contrasena',
              required: true,
              label: 'Contraseña actual'
            }),
            crearCampo('Nueva', {
              type: 'contrasena',
              required: true,
              max: 100,
              label: 'Nueva contraseña (mínimo 12 caracteres)'
            })
          ]
        : [
            crearCampo('Correo', { type: 'email', required: true, max: 50 }),
            crearCampo('Contrasena', {
              type: 'contrasena',
              required: true,
              max: 100,
              label: 'Contraseña'
            })
          ];
  const tarjeta = crearElemento(
    'section',
    { class: 'tarjeta acceso' },
    crearFormulario(
      especificaciones,
      async (datos) => {
        if (modo === 'registro') {
          datos.Nombre = [datos.Nombres,datos.Apellidos].join(' ');
          validarNombre(datos.Nombre);
          validarCorreo(datos.Correo);
          validarContrasena(datos.Contrasena);
          let departamentos = {};
          if (datos.TipoIdentificacion === 'Cedula') {
            departamentos = await fetch('/scripts/codigos.json').then((r) => r.json());
          }
          validarIdentificacion(datos.TipoIdentificacion, datos.NumeroIdentificacion,
            datos.EdadDeclarada, departamentos);
        }
        await consultarApi(
          '/autenticacion/' +
            (modo === 'contrasena'
              ? 'contrasena'
              : modo === 'registro'
                ? 'registro'
                : 'ingresar'),
          'POST',
          datos
        );
        await actualizarUsuario();
        if (modo === 'registro') {
          mostrarAviso('Cuenta creada. Iniciá sesión.');
          location.hash = '#ingresar';
        } else if (modo === 'contrasena') {
          mostrarAviso('Contraseña actualizada. Iniciá sesión.');
          location.hash = '#ingresar';
        } else {
          location.hash = estado.usuario?.DebeCambiarContrasena
            ? '#contrasena'
            : sessionStorage.getItem('nicar-return') || (estado.usuario?.Rol === 'Vendedor' ? '#citas' : '#catalogo');
        }
      },
      modo === 'registro'
        ? 'Crear cuenta'
        : modo === 'contrasena'
          ? 'Actualizar contraseña'
          : 'Ingresar'
    )
  );
  if (modo === 'ingresar') {
    tarjeta.append(
      crearElemento(
        'p',
        {},
        crearElemento('a', { href: '#registro' }, 'Crear cuenta de cliente')
      )
    );
  }
  if (modo === 'registro') {
    tarjeta.prepend(
      crearElemento(
        'p',
        {},
        'El registro y las visitas requieren 18 años cumplidos. Con cédula calculamos la edad; con pasaporte o residencia debés indicar tu edad.'
      )
    );
  }
  contenido.append(tarjeta);
}
