import { Validaciones } from './validaciones.js';

export class CalculosNomina {
  #validaciones;

  constructor(validaciones = new Validaciones()) {
    this.#validaciones = validaciones;
  }

  calcularINSSLaboral(salarioCotizableNIO) {
    const base = this.#validaciones.centavos(salarioCotizableNIO);
    return (base * 700n + 5000n) / 10000n;
  }

  calcularIRMensual({ periodo, rentaNetaMesCentavos, rentaNetaAcumuladaCentavos, irRetenidoAcumuladoCentavos }) {
    const mes = Number(this.#validaciones.validarMes(periodo).slice(5,7));
    const rentaAnualEsperada = ((rentaNetaAcumuladaCentavos + rentaNetaMesCentavos) * 12n + BigInt(Math.floor(mes / 2))) / BigInt(mes);
    const impuestoAnual = this.#calcularImpuestoAnual(rentaAnualEsperada);
    const impuestoAcumuladoEsperado = (impuestoAnual * BigInt(mes) + 6n) / 12n;
    const retencion = impuestoAcumuladoEsperado - irRetenidoAcumuladoCentavos;
    return {
      retencionCentavos: retencion > 0n ? retencion : 0n,
      rentaAnualEsperadaCentavos: rentaAnualEsperada,
      impuestoAnualCentavos: impuestoAnual
    };
  }

  #calcularImpuestoAnual(rentaNetaCentavos) {
    const tramos = [
      { limite:10000000n, base:0n, porcentaje:0n, exceso:0n },
      { limite:20000000n, base:0n, porcentaje:1500n, exceso:10000000n },
      { limite:35000000n, base:1500000n, porcentaje:2000n, exceso:20000000n },
      { limite:50000000n, base:4500000n, porcentaje:2500n, exceso:35000000n },
      { limite:null, base:8250000n, porcentaje:3000n, exceso:50000000n }
    ];
    const tramo = tramos.find(item => item.limite === null || rentaNetaCentavos <= item.limite);
    if (!tramo || rentaNetaCentavos <= 10000000n) return 0n;
    return tramo.base + ((rentaNetaCentavos - tramo.exceso) * tramo.porcentaje + 5000n) / 10000n;
  }
}
