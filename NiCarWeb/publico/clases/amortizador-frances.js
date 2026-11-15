export class AmortizadorFrances {
  #principal;
  #tasaAnual;
  #plazo;
  #primerPago;

  constructor({ principalUSD, tasaAnual, plazoMeses, fechaPrimerPago }) {
    this.#principal = this.#centavos(principalUSD);
    this.#tasaAnual = Number(tasaAnual);
    this.#plazo = Number(plazoMeses);
    this.#primerPago = this.#fecha(fechaPrimerPago);
    if (this.#principal <= 0n || !Number.isFinite(this.#tasaAnual) ||
        this.#tasaAnual < 0 || this.#tasaAnual > 100 ||
        !Number.isInteger(this.#plazo) || this.#plazo < 1 || this.#plazo > 84) {
      throw new RangeError('Revisá capital, tasa anual y plazo del crédito.');
    }
  }

  generar() {
    const tasaMensual = this.#tasaAnual / 1200;
    const cuota = this.#calcularCuota(tasaMensual);
    let saldo = this.#principal;
    const cuotas = [];
    for (let numero = 1; numero <= this.#plazo; numero++) {
      const interes = this.#redondear(BigInt(Math.round(Number(saldo) * tasaMensual)));
      const capital = numero === this.#plazo ? saldo : cuota - interes;
      saldo = saldo > capital ? saldo - capital : 0n;
      cuotas.push(Object.freeze({
        numero,
        fecha: this.#sumarMeses(this.#primerPago, numero - 1),
        capitalUSD: this.#dinero(capital),
        interesUSD: this.#dinero(interes),
        montoUSD: this.#dinero(capital + interes),
        saldoUSD: this.#dinero(saldo)
      }));
    }
    return Object.freeze(cuotas);
  }

  #calcularCuota(tasaMensual) {
    if (tasaMensual === 0) return (this.#principal + BigInt(this.#plazo / 2)) / BigInt(this.#plazo);
    const saldo = Number(this.#principal) / 100;
    const monto = saldo * tasaMensual / (1 - (1 + tasaMensual) ** -this.#plazo);
    return this.#centavos(monto.toFixed(2));
  }

  #centavos(valor) {
    const texto = String(valor);
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(texto)) throw new TypeError('El importe debe usar hasta dos decimales.');
    const [entero, decimal = ''] = texto.split('.');
    return BigInt(entero) * 100n + BigInt(decimal.padEnd(2, '0'));
  }

  #dinero(valor) { return (Number(valor) / 100).toFixed(2); }
  #redondear(valor) { return valor < 0n ? 0n : valor; }

  #fecha(valor) {
    const fecha = new Date(String(valor) + 'T12:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor)) ||
        !Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) {
      throw new TypeError('Ingresá una fecha de primer pago válida.');
    }
    return fecha;
  }

  #sumarMeses(fecha, meses) {
    const destino = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + meses, 1, 12));
    const ultimoDia = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate();
    const ultimoOriginal = fecha.getUTCDate() === new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 0)).getUTCDate();
    destino.setUTCDate(ultimoOriginal ? ultimoDia : Math.min(fecha.getUTCDate(), ultimoDia));
    return destino.toISOString().slice(0, 10);
  }
}
