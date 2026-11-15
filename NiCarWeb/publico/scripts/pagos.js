import { crearElemento } from './elementos.js';

export function adaptarFormularioPago(entradas) {
  const buscar = nombre => entradas.map(entrada =>
    entrada.querySelector('[name="' + nombre + '"]')).find(Boolean);
  const metodo = buscar('MetodoPago');
  const recibido = buscar('RecibidoNIO');
  const referencia = buscar('ReferenciaPago');
  const moneda = buscar('Moneda');
  const credito = ['IdFinanciera','MontoPrimaUSD','CargosFinancierosUSD','TasaAnual',
    'TasaMoraAnual','PlazoMeses','FechaPrimerPago'].map(buscar);
  const etiquetaReferencia = referencia.parentElement.querySelector('label');
  moneda.replaceChildren(crearElemento('option', { value:'USD' }, 'USD'));
  moneda.value = 'USD';
  const resumen = crearElemento('p', { role:'status' });
  const resumenCredito = crearElemento('p', { class:'resumen-credito', hidden:true },
    'NiCar no calcula la tabla. Registrá los montos y fechas que figuran en el contrato oficial de la financiera.');
  function actualizar() {
    const efectivo = metodo.value === 'Efectivo';
    const financiado = metodo.value === 'Financiamiento';
    recibido.required = efectivo;
    recibido.parentElement.hidden = !efectivo;
    recibido.disabled = !efectivo;
    recibido.step = '0.25';
    referencia.required = !efectivo;
    etiquetaReferencia.textContent = financiado ? 'Número de contrato financiero' : 'Referencia del pago';
    credito.forEach((campo, indice) => {
      campo.parentElement.hidden = !financiado;
      campo.disabled = !financiado;
      campo.required = financiado && indice !== 1;
    });
    const precio = Number(buscar('PrecioVenta').value || 0);
    const descuento = Number(buscar('Descuento').value || 0);
    const total = Math.max(0,precio-descuento);
    const convertido = Math.round(total*36.6243*100)/100;
    const cobrado = efectivo ? Math.round(convertido*4)/4 : convertido;
    resumen.textContent = 'Total USD ' + total.toFixed(2) +
      ' · Tasa oficial C$36.6243 · Cobro C$' + cobrado.toFixed(2);
    resumenCredito.hidden = !financiado;
  }
  for (const nombre of ['MetodoPago','PrecioVenta','Descuento','MontoPrimaUSD','CargosFinancierosUSD',
    'MontoFinanciadoUSD','PagoMensualUSD','TotalInteresesUSD','TotalContratoUSD','PlazoMeses',
    'TasaAnual','FechaPrimerPago']) {
    buscar(nombre).addEventListener('input',actualizar);
  }
  actualizar();
  return crearElemento('div', {}, resumen, resumenCredito);
}

export function mensajeVenta(venta) {
  let mensaje = 'Venta ' + venta.NumeroComprobante + ' guardada. Total USD ' + venta.Total;
  if (venta.MetodoPago === 'Efectivo') {
    mensaje += '. Cobro C$' + venta.MontoCobradoNIO + '. Cambio C$' + venta.CambioNIO;
  }
  return mensaje;
}
