import { consultarApi, estado } from './conexion-api.js';
import { contenido, crearElemento, mostrarTitulo, tabla, mostrarAviso } from './elementos.js';
import { crearCampo, abrirFormularioModal } from './formularios.js';

export async function mostrarCitas() {
  mostrarTitulo(estado.usuario.Rol === 'Cliente' ? 'Mis citas' : 'Agenda de visitas');
  const filtro = crearElemento('select', { 'aria-label': 'Estado de citas' },
    ...['Pendiente','Atendida','Cancelada','Todas'].map(valor =>
      crearElemento('option', { value: valor }, valor))
  );
  const resultados = crearElemento('section');
  const citas = await consultarApi('/citas');
  const actualizar = () => {
    const filas = citas.filter(cita => filtro.value === 'Todas' || cita.Estado === filtro.value);
    resultados.replaceChildren(tabla(filas, cita => acciones(cita)));
  };
  filtro.onchange = actualizar;
  contenido.append(crearElemento('p', {},
    'Lunes a sábado, 8:00 a 17:00. Cada visita dura 45 minutos.'),
    filtro, resultados);
  actualizar();
}

function acciones(cita) {
  if (cita.Estado !== 'Pendiente') return [];
  const botones = [];
  const personal = estado.usuario.Rol !== 'Cliente';
  botones.push(crearElemento('button', { onClick: () => reprogramar(cita) }, 'Reprogramar'));
  const esAdmin = ['SuperAdministrador', 'Administrador'].includes(estado.usuario.Rol);
  if (estado.usuario.Rol === 'Cliente') {
    botones.push(crearElemento('button', { onClick: async () => {
      if (!confirm('¿Cancelar esta cita?')) return;
      try {
        await consultarApi('/citas/' + cita.IdCita, 'DELETE', {});
        await mostrarCitas();
      } catch (problema) { mostrarAviso(problema.message); }
    } }, 'Cancelar'));
  } else if (esAdmin) {
    botones.push(crearElemento('button', { onClick: () => abrirFormularioModal('Cancelar cita', [
      crearCampo('MotivoCancelacion', { required:true, maxLength:500,
        label:'Motivo de cancelación', placeholder:'Explicá brevemente el motivo' })
    ], async datos => {
      await consultarApi('/citas/' + cita.IdCita, 'DELETE', datos);
      await mostrarCitas();
    }) }, 'Cancelar con motivo'));
  }
  if (personal) {
    botones.push(crearElemento('button', { onClick: async () => {
      try {
        await consultarApi('/citas/' + cita.IdCita, 'PUT', { Estado:'Atendida' });
        await mostrarCitas();
      } catch (problema) { mostrarAviso(problema.message); }
    } }, 'Marcar atendida'));
  }
  if (['SuperAdministrador','Administrador','Vendedor'].includes(estado.usuario.Rol)) {
    botones.push(crearElemento('button', { onClick: () => {
      sessionStorage.setItem('nicar-venta-cita', cita.IdCita);
      location.hash = '#administracion/Venta';
    } }, 'Registrar venta'));
  }
  return botones;
}

function reprogramar(cita) {
  abrirFormularioModal('Reprogramar cita', [
    crearCampo('Inicio', { type:'datetime-local',required:true,step:900,
      value:cita.Inicio.slice(0,16),label:'Fecha y hora de Nicaragua' }),
    crearCampo('Telefono', { required:true,value:cita.Telefono,label:'Teléfono' })
  ], async datos => {
    await consultarApi('/citas/' + cita.IdCita, 'PUT', datos);
    await mostrarCitas();
  });
}
