
export const opciones = {
  TipoCliente: ['Natural', 'Juridica'],
  TipoIdentificacion: ['Cedula', 'RUC', 'Pasaporte', 'Residencia'],
  TipoProveedor: ['Empresa', 'Persona'],
  TipoFinanciamiento: ['Externo'],
  TipoContrato: ['Indefinido','Plazo fijo','Proyecto'],
  TipoPago: ['Salario','Comision'],
  MetodoPagoColaborador: ['Transferencia','Efectivo','Cheque'],
  MetodoPagoVenta: ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque'],
  Condicion: ['Nuevo', 'Usado'],
  Moneda: ['USD', 'NIO'],
  MetodoPago: ['Efectivo', 'Transferencia', 'Tarjeta', 'Financiamiento'],
  Transmision: ['Automática', 'Manual', 'CVT'],
  Traccion: ['4x2', '4x4', 'AWD', 'FWD', 'RWD'],
  Combustible: ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico', 'Híbrido enchufable'],
  TipoCarroceria: ['Sedán', 'SUV', 'Pickup', 'Hatchback', 'Camioneta', 'Coupe', 'Van', 'Motocicleta']
};
export const camposOcultos = [
  'FechaRegistro',
  'Estado',
  'EstadoMatricula',
  'UsuarioRegistro',
  'NumeroComprobante',
  'FechaVenta',
  'MontoNIO', 'TasaCambioVenta', 'TotalNIO', 'MontoCobradoNIO',
  'RedondeoEfectivoNIO', 'CambioNIO', 'DetalleCambio', 'ComisionUSD', 'PorcentajeComision',
  'TasaCambio', 'MontoNIO', 'MontoBrutoNIO', 'MontoNetoNIO', 'DeduccionINSSNIO', 'RetencionIRNIO', 'ComisionUSD', 'TasaCambio', 'RegistradoPor', 'Estado'
];
