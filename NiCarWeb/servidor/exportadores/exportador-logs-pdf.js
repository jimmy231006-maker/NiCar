import { IExportador } from '../interfaces/IExportador.js';

export class ExportadorLogsPdf extends IExportador {
  #escapar(texto) {
    return String(texto ?? '').normalize('NFC')
      .replace(/[^\x20-\x7e\xa0-\xff]/g, '?')
      .replace(/[\\()]/g, caracter => '\\' + caracter);
  }

  #lineas(registros) {
    const lineas = [];
    for (const registro of registros) {
      const texto = [
        'Registro ' + registro.IdLog,
        'Fecha ' + String(registro.FechaHora).replace('T', ' '),
        'Usuario ' + (registro.NombreIngresado || 'Sin identificar'),
        'Evento ' + registro.Evento
      ].join(' | ');
      const partes = texto.match(/.{1,96}/gu) || [''];
      lineas.push(...partes, '');
    }
    return lineas.length ? lineas : ['No hay eventos de acceso registrados.'];
  }

  #contenidoPagina(lineas, numero, total) {
    const comandos = [
      'BT /F1 17 Tf 36 754 Td (NiCar - Auditoria de accesos) Tj ET',
      'BT /F1 9 Tf 36 732 Td (Fechas segun el registro de la base de datos) Tj ET'
    ];
    let altura = 704;
    for (const linea of lineas) {
      comandos.push(`BT /F1 9 Tf 36 ${altura} Td (${this.#escapar(linea)}) Tj ET`);
      altura -= 13;
    }
    comandos.push(`BT /F1 9 Tf 36 35 Td (Pagina ${numero} de ${total}) Tj ET`);
    return comandos.join('\n');
  }

  exportar(registros) {
    const lineas = this.#lineas(registros);
    const paginas = [];
    for (let indice = 0; indice < lineas.length; indice += 48) {
      paginas.push(lineas.slice(indice, indice + 48));
    }
    const objetos = [
      '',
      '<< /Type /Catalog /Pages 2 0 R >>',
      '',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
    ];
    const hijos = [];
    paginas.forEach((lineasPagina, indice) => {
      const numeroPagina = objetos.length;
      const numeroContenido = numeroPagina + 1;
      hijos.push(numeroPagina + ' 0 R');
      objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
        /Resources << /Font << /F1 3 0 R >> >> /Contents ${numeroContenido} 0 R >>`);
      const contenido = this.#contenidoPagina(lineasPagina, indice + 1, paginas.length);
      const longitud = Buffer.byteLength(contenido, 'latin1');
      objetos.push(`<< /Length ${longitud} >>\nstream\n${contenido}\nendstream`);
    });
    objetos[2] = `<< /Type /Pages /Count ${paginas.length} /Kids [${hijos.join(' ')}] >>`;
    const partes = [Buffer.from('%PDF-1.4\n', 'latin1')];
    const posiciones = [0];
    let posicion = partes[0].length;
    for (let indice = 1; indice < objetos.length; indice++) {
      posiciones.push(posicion);
      const objeto = Buffer.from(`${indice} 0 obj\n${objetos[indice]}\nendobj\n`, 'latin1');
      partes.push(objeto);
      posicion += objeto.length;
    }
    const referencias = posiciones.slice(1)
      .map(valor => String(valor).padStart(10, '0') + ' 00000 n ').join('\n');
    partes.push(Buffer.from(`xref\n0 ${objetos.length}\n0000000000 65535 f \n${referencias}
trailer\n<< /Size ${objetos.length} /Root 1 0 R >>
startxref\n${posicion}\n%%EOF\n`, 'latin1'));
    return Buffer.concat(partes);
  }
}
