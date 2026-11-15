import { consultarApi, estado } from './conexion-api.js';
import { contenido, crearElemento, mostrarAviso, mostrarTitulo, tabla } from './elementos.js';
import { crearCampo, abrirFormularioModal } from './formularios.js';

const usd = valor => 'USD ' + Number(valor).toFixed(2);
const hoyLocal = () => new Intl.DateTimeFormat('en-CA', { timeZone:'America/Managua' }).format(new Date());

export async function mostrarCreditos() {
  mostrarTitulo('Financiamiento y contratos',
    'Las cuotas, el saldo y la tabla oficial pertenecen a la entidad financiera y se consultan en su contrato.');
  const creditos = await consultarApi('/creditos');
  for (const credito of creditos) {
    const detalle = crearElemento('article', { class:'tarjeta credito' },
      crearElemento('h2', {}, credito.Financiera + ' · ' + credito.Vehiculo),
      crearElemento('p', {}, 'Contrato: ' + credito.NumeroContrato + ' · Estado en NiCar: ' + credito.Estado),
      crearElemento('p', {}, 'Precio al contado: ' + usd(credito.PrecioContadoUSD) +
        ' · Prima: ' + usd(credito.PrimaUSD)),
      crearElemento('p', {}, 'Monto financiado: ' + usd(credito.MontoFinanciadoUSD) +
        ' · Plazo: ' + credito.PlazoMeses + ' meses'),
      crearElemento('p', {}, 'Cuota indicada en el contrato: ' + usd(credito.PagoMensualUSD) +
        ' · Total indicado por la financiera: ' + usd(credito.TotalContratoUSD)),
      crearElemento('p', {}, 'Primer vencimiento según contrato: ' + credito.FechaPrimerPago),
      crearElemento('p', { class:'nota-legal' },
        'NiCar no calcula ni sustituye la tabla oficial, el estado de cuenta ni el saldo de CREDEX. Confirmá esos datos directamente con la financiera.'));
    if (credito.SitioWeb) detalle.append(crearElemento('a',
      { href:credito.SitioWeb, target:'_blank', rel:'noopener noreferrer' },
      'Consultar sitio oficial de ' + credito.Financiera));
    if (credito.InstruccionesPago) detalle.append(crearElemento('p', {}, credito.InstruccionesPago));
    if (estado.usuario.Rol === 'Cliente' && credito.Estado === 'Activo') {
      detalle.append(crearElemento('button', { onClick:() => reportarPago(credito) }, 'Reportar un pago realizado'));
    }
    contenido.append(detalle);
  }
  if (['Administrador','SuperAdministrador'].includes(estado.usuario.Rol)) await mostrarRevision();
}

function reportarPago(credito) {
  const entradas = [
    crearCampo('NumeroCuota', { type:'number', min:1, step:1, label:'Número de cuota (si aparece en el recibo)' }),
    crearCampo('FechaPago', { type:'date', required:true, value:hoyLocal(), max:hoyLocal() }),
    crearCampo('MontoUSD', { type:'number', required:true, min:0.01, step:'0.01', label:'Monto pagado en USD' }),
    crearCampo('Referencia', { required:true, max:100, label:'Referencia de la transacción bancaria' })
  ];
  abrirFormularioModal('Reportar pago a ' + credito.Financiera, entradas, async datos => {
    await consultarApi('/creditos/' + credito.IdCredito + '/pagos', 'POST', datos);
    await mostrarCreditos();
    return { mensaje:'Reporte enviado para verificación. NiCar no confirma ni modifica el saldo del banco.' };
  });
}

async function mostrarRevision() {
  contenido.append(crearElemento('h2', {}, 'Reportes de pago pendientes de verificar'));
  const pagos = await consultarApi('/creditos/pagos');
  contenido.append(tabla(pagos, pago => crearElemento('div', { class:'acciones-fila' },
    botonRevision(pago,'Aprobado'),botonRevision(pago,'Rechazado'))));
}

function botonRevision(pago, decision) {
  return crearElemento('button', { onClick:async () => {
    const observaciones = decision === 'Rechazado' ? prompt('Motivo del rechazo:') : '';
    if (decision === 'Rechazado' && !observaciones?.trim()) return;
    try {
      await consultarApi('/creditos/pagos/' + pago.IdPagoCredito, 'PUT', { Estado:decision, Observaciones:observaciones });
      await mostrarCreditos();
    } catch (problema) { mostrarAviso(problema.message); }
  } }, decision === 'Aprobado' ? 'Verificado con la financiera' : 'Rechazar reporte');
}
