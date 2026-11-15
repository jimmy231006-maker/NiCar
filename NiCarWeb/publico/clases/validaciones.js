export class Validaciones {
  #configuracion;
  constructor(codigos = {}, esquema = {}, opciones = {}, ocultos = [], tasaComercial = 36.60) {
    this.#configuracion = { codigos, esquema, opciones, ocultos, tasaComercial };
  }
  #exigir(condicion, mensaje) { if (!condicion) throw Object.assign(new Error(mensaje), { status: 400 }); }
  fechaDeHoy() {
    const formato = { timeZone: 'America/Managua', year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Intl.DateTimeFormat('en-CA', formato).format(new Date());
  }
  validarNombre(valor) { this.#exigir(/^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(String(valor || '').trim()), 'El nombre solo admite letras, espacios, guiones y apóstrofes.'); }
  validarCorreo(valor) { this.#exigir(typeof valor === 'string' && valor.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor), 'Ingresá un correo electrónico válido.'); }
  validarTelefono(valor) { this.#exigir(/^[578][0-9]{7}$/.test(String(valor || '')), 'El teléfono debe tener 8 dígitos y comenzar con 5, 7 u 8.'); }
  validarContrasena(valor) { this.#exigir(typeof valor === 'string' && valor.length >= 12 && valor.length <= 100, 'La contraseña debe tener entre 12 y 100 caracteres.'); }
  obtenerNacimiento(entrada, departamentos = this.#configuracion.codigos, actual = this.fechaDeHoy()) {
    const valor = String(entrada || '').replaceAll('-', '').trim().toUpperCase();
    this.#exigir(/^[0-9]{13}[A-HJ-NP-Y]$/.test(valor), 'Revisá el formato de la cédula.');
    this.#exigir(valor.slice(0, 3) === '888' ||
      Object.values(departamentos).flat().includes(valor.slice(0, 3)), 'Código municipal no reconocido.');
    const anioActual = Number(actual.slice(0, 4));
    let anio = Math.floor(anioActual / 100) * 100 + Number(valor.slice(7, 9));
    if (anio > anioActual) anio -= 100;
    const nacimiento = anio + '-' + valor.slice(5, 7) + '-' + valor.slice(3, 5);
    this.#validarFecha(nacimiento, actual);
    const edad = anioActual - anio - (actual.slice(5) < nacimiento.slice(5) ? 1 : 0);
    return { value: valor, birth: nacimiento, age: edad };
  }
  validarRegistro(datos) {
    this.validarNombre(datos.Nombre);
    this.validarNombre(datos.Nombres);
    this.validarNombre(datos.Apellidos);
    this.validarTelefono(datos.Telefono);
    this.validarCorreo(datos.Correo);
    this.validarContrasena(datos.Contrasena);
    this.#exigir(datos.Nombre.length <= 100 && datos.Correo.length <= 50, 'Revisá nombre y correo.');
    this.#exigir(datos.Confirmacion === datos.Contrasena, 'Las contraseñas no coinciden.');
    const nacimiento = this.obtenerNacimiento(datos.Cedula);
    this.#exigir(nacimiento.age >= 18, 'Debés tener 18 años cumplidos para registrarte.');
    return nacimiento;
  }
  validarCita(datos) {
    this.validarTelefono(datos.Telefono);
    this.#exigir(Number.isSafeInteger(Number(datos.IdVehiculo)) && Number(datos.IdVehiculo) > 0,
      'Seleccioná un vehículo.');
    this.#exigir(/^\d{4}-\d{2}-\d{2}T(08:00|08:45|09:30|10:15|11:00|11:45|12:30|13:15|14:00|14:45|15:30|16:15)$/.test(datos.Inicio || ''), 'Elegí un horario de 8:00 a 16:15.');
    this.#validarFecha(datos.Inicio.slice(0, 10), '9999-12-31');
    const fecha = new Date(datos.Inicio + ':00-06:00');
    this.#exigir(fecha.getUTCDay() !== 0 && fecha.getTime() > Date.now(), 'La cita debe ser futura, de lunes a sábado.');
  }
  obtenerCampos(tabla) { return this.#configuracion.esquema[tabla].filter(campo => !campo.generated && !this.#configuracion.ocultos.includes(campo.name) && !(tabla === 'Venta' && campo.name === 'TasaCambio')); }
  #validarFecha(valor, limite = this.fechaDeHoy()) {
    const fecha = new Date(valor + 'T12:00:00Z');
    this.#exigir(/^\d{4}-\d{2}-\d{2}$/.test(valor) && Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor && valor <= limite, 'Ingresá una fecha válida.');
  }
  #validarNumero(valor, campo) {
    const numero = Number(valor);
    this.#exigir(Number.isFinite(numero) && numero >= (campo.minimo ?? 0) &&
      numero <= (campo.maximo ?? 999999999999), 'Revisá ' + campo.name + '.');
    const decimales = campo.type === 'numeric' ? (campo.name === 'TasaCambio' ? 6 : 2) : 0;
    const patron = decimales ? new RegExp('^\\d+(\\.\\d{1,' + decimales + '})?$') : /^\d+$/;
    this.#exigir(patron.test(String(valor)), 'Revisá la precisión de ' + campo.name + '.');
    this.#exigir(!campo.name.startsWith('Id') || numero >= 1, 'Seleccioná ' + campo.name + '.');
    return numero;
  }
  #validarCampo(campo, entrada) {
    const clave = campo.name;
    let valor = typeof entrada === 'string' ? entrada.trim() : entrada;
    if (valor === '' || valor == null) {
      this.#exigir(!campo.required || campo.default, 'Completá ' + clave + '.');
      return campo.default ? undefined : null;
    }
    if (['integer', 'bigint', 'smallint', 'numeric'].includes(campo.type)) {
      valor = this.#validarNumero(valor, campo);
    } else if (campo.type === 'boolean') {
      this.#exigir(typeof valor === 'boolean', 'Revisá ' + clave + '.');
    } else if (campo.type === 'date') {
      this.#validarFecha(valor, ['FechaInicio','FechaFin'].includes(clave) ? '9999-12-31' : this.fechaDeHoy());
    } else {
      this.#exigir(typeof valor === 'string' && valor.length <= (campo.max || 500) &&
        !/[\u0000-\u001f]/.test(valor), 'Revisá ' + clave + '.');
    }
    this.#exigir(!this.#configuracion.opciones[clave] || this.#configuracion.opciones[clave].includes(valor),
      'Seleccioná una opción válida en ' + clave + '.');
    if (['Nombre', 'NombreProveedor', 'Pais', 'PaisOrigen', 'Ciudad', 'RazonSocial',
      'ColorExterior', 'ColorInterior', 'Ubicacion'].includes(clave)) {
      this.#exigir(/\p{L}/u.test(valor), clave + ' debe contener letras.');
    }
    if (['Nombres', 'Apellidos', 'Contacto'].includes(clave)) this.validarNombre(valor);
    if (clave === 'Correo') this.validarCorreo(valor);
    if (clave === 'Telefono') this.validarTelefono(valor);
    return valor;
  }
  validarDatos(tabla, entrada, esNuevo) {
    const datos = {};
    for (const campo of this.obtenerCampos(tabla)) {
      if (['Activo', 'Activa'].includes(campo.name)) { if (esNuevo) datos[campo.name] = true; }
      else {
        const valor = this.#validarCampo(campo, entrada[campo.name]);
        if (valor !== undefined) datos[campo.name] = valor;
      }
    }
    this.#validarEntidad(tabla, datos);
    return datos;
  }
  #validarEntidad(tabla, datos) {
    if (tabla === 'Vehiculo') this.#validarVehiculo(datos);
    if (tabla === 'Cliente') this.#validarCliente(datos);
    if (tabla === 'Proveedor' && datos.TipoProveedor === 'Persona') this.validarNombre(datos.NombreProveedor);
    if (['AdquisicionVehiculo', 'CostoVehiculo'].includes(tabla)) {
      const importe = datos[tabla === 'CostoVehiculo' ? 'Monto' : 'PrecioCompra'];
      this.#exigir(importe > 0, 'El monto de compra o costo debe ser positivo.');
      datos.TasaCambio = datos.Moneda === 'NIO' ? 1 : this.#configuracion.tasaComercial;
      if (tabla === 'CostoVehiculo') datos.MontoNIO = Math.round(importe * datos.TasaCambio * 100) / 100;
    }
    if (tabla === 'ContratoColaborador') this.#exigir(datos.SalarioBaseNIO > 0 && (!datos.FechaFin || datos.FechaFin >= datos.FechaInicio), 'Revisá fechas y salario del contrato.');
    if (tabla === 'PagoColaborador') {
      this.validarMes(datos.Periodo);
      this.#exigir(datos.Periodo <= this.fechaDeHoy().slice(0,7), 'No se registran pagos para un período futuro.');
    }
    if (tabla === 'Venta') {
      this.#exigir(datos.Moneda === 'USD' && datos.PrecioVenta > 0 &&
        datos.Descuento <= datos.PrecioVenta, 'La venta se registra en USD. Revisá precio y descuento.');
    }
  }
  #validarVehiculo(datos) {
    this.#exigir(datos.Anio >= 1950 && datos.Anio <= new Date().getFullYear() + 1, 'Revisá el año.');
    if (datos.Condicion === 'Nuevo') {
      this.#exigir(datos.Kilometraje === 0 && !datos.Placa,
        'Un vehículo nuevo debe registrarse con 0 km y sin placa.');
    }
    this.#exigir(!datos.VIN || /^[A-HJ-NPR-Z0-9]{17}$/i.test(datos.VIN), 'Revisá el VIN de 17 caracteres.');
    this.#exigir(!datos.ImagenUrl || /^(https?:\/\/[^\s/]+(?:\/[^\s]*)?|\/imagenes\/[0-9a-f-]{36})$/.test(datos.ImagenUrl), 'Revisá la URL de imagen.');
    const moto = datos.TipoCarroceria === 'Motocicleta';
    this.#exigir(moto ? !datos.NumeroPuertas : datos.NumeroPuertas > 0, 'Revisá las puertas del vehículo.');
    this.#exigir(datos.Combustible === 'Eléctrico' ? !datos.CilindrajeCc && datos.PotenciaKw > 0 :
      datos.CilindrajeCc > 0, 'Completá el cilindraje o la potencia del motor eléctrico.');
    this.#exigir(datos.NumeroAsientos > 0, 'Ingresá el número de asientos.');
    for (const clave of ['VIN', 'NumeroChasis', 'Placa', 'IdentificadorUnico']) {
      if (datos[clave]) datos[clave] = datos[clave].toUpperCase();
    }
  }
  #validarCliente(datos) {
    if (datos.TipoCliente === 'Natural') {
      this.validarNombre(datos.Nombres);
      this.validarNombre(datos.Apellidos);
      this.#exigir(!datos.RazonSocial, 'La persona natural usa nombres y apellidos.');
    } else {
      this.#exigir(datos.RazonSocial && !datos.Nombres && !datos.Apellidos &&
        datos.TipoIdentificacion === 'RUC', 'La empresa requiere razón social y RUC.');
    }
    if (datos.TipoIdentificacion === 'Cedula') {
      const nacimiento = this.obtenerNacimiento(datos.NumeroIdentificacion);
      this.#exigir(nacimiento.age >= 16, 'Revisá la edad de la cédula.');
      datos.NumeroIdentificacion = nacimiento.value;
    }
  }
  validarMes(valor) {
    this.#exigir(typeof valor === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor), 'Ingresá un período válido en formato AAAA-MM.');
    return valor + '-01';
  }
  centavos(valor) {
    this.#exigir(/^\d{1,12}(\.\d{1,2})?$/.test(String(valor)), 'Ingresá un importe con hasta dos decimales.');
    const [entero, fraccion = ''] = String(valor).split('.'); return BigInt(entero) * 100n + BigInt(fraccion.padEnd(2, '0'));
  }
  validarTasa(valor) {
    this.#exigir(/^\d{1,6}(\.\d{1,6})?$/.test(String(valor)) && Number(valor) > 0, 'Revisá la tasa de cambio.');
    const [entero, fraccion = ''] = String(valor).split('.'); return BigInt(entero) * 1000000n + BigInt(fraccion.padEnd(6, '0'));
  }
  validarPago(datos, cobrado) {
    if (datos.MetodoPago !== 'Efectivo') {
      this.#exigir(typeof datos.ReferenciaPago === 'string' && /^[\w .\/-]{3,80}$/.test(datos.ReferenciaPago),
        'Ingresá la referencia de transferencia, tarjeta o contrato.');
      return cobrado;
    }
    const recibido = this.centavos(datos.RecibidoNIO);
    this.#exigir(recibido >= cobrado && recibido % 25n === 0n, 'El efectivo debe cubrir el cobro y ser múltiplo de C$0.25.');
    return recibido;
  }
  validarComision(valor) { this.#exigir(Number(valor) === 5, 'La comisión de venta es fija: 5%.'); return 5; }
  validarPagoColaborador(bruto, inss, ir, ahorro, otras) {
    const deducciones = inss + ir + ahorro + otras;
    this.#exigir(bruto > 0n && deducciones <= bruto, 'Las deducciones no pueden superar el pago bruto.');
    return { deducciones, neto:bruto-deducciones };
  }
  validarBaseNomina(bruto, inss, ahorro) {
    const renta = bruto - inss - ahorro;
    this.#exigir(bruto >= 0n && inss >= 0n && ahorro >= 0n && renta >= 0n, 'La base neta para IR no puede ser negativa.');
    return renta;
  }
  validarPagoCredito(datos) {
    if (datos.NumeroCuota) this.#exigir(Number.isInteger(Number(datos.NumeroCuota)) && Number(datos.NumeroCuota) > 0,
      'Revisá el número de cuota.');
    this.#exigir(/^\d{4}-\d{2}-\d{2}$/.test(datos.FechaPago || ''), 'Ingresá la fecha del pago.');
    this.#validarFecha(datos.FechaPago);
    const monto = this.centavos(datos.MontoUSD);
    this.#exigir(monto > 0n && /^[\w .\/-]{3,100}$/.test(datos.Referencia || ''),
      'Ingresá un monto y la referencia bancaria del pago.');
    return monto;
  }
}
