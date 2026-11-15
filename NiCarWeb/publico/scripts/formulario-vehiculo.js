export function adaptarFormularioVehiculo(entradas) {
  const buscar = nombre => entradas.map(entrada => entrada.querySelector('[name="' + nombre + '"]')).find(Boolean);
  const tipo = buscar('TipoCarroceria');
  const combustible = buscar('Combustible');
  const puertas = buscar('NumeroPuertas');
  const cilindraje = buscar('CilindrajeCc');
  const potencia = buscar('PotenciaKw');
  const asientos = buscar('NumeroAsientos');

  function actualizarCampos() {
    const moto = tipo.value === 'Motocicleta';
    const electrico = combustible.value === 'Eléctrico';
    puertas.disabled = moto;
    puertas.required = !moto;
    puertas.parentElement.hidden = moto;
    if (moto) puertas.value = '';
    cilindraje.disabled = electrico;
    cilindraje.required = !electrico;
    cilindraje.parentElement.hidden = electrico;
    if (electrico) cilindraje.value = '';
    potencia.required = electrico;
    asientos.required = true;
  }

  tipo.addEventListener('change', actualizarCampos);
  combustible.addEventListener('change', actualizarCampos);
  actualizarCampos();
}
