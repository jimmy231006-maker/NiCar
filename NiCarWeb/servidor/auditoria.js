import { conexion } from './base-datos.js';
import { exigirRol } from './respuestas.js';
import { ExportadorLogsPdf } from './exportadores/exportador-logs-pdf.js';

export async function atenderAuditoria(solicitud, respuesta, ruta, usuario) {
  if (ruta !== '/api/auditoria/pdf' || solicitud.method !== 'GET') {
    return false;
  }
  exigirRol(usuario, ['SuperAdministrador']);
  const resultado = await conexion.query(
    'SELECT * FROM nicar."LogAcceso" ORDER BY "IdLog" DESC'
  );
  const exportador = new ExportadorLogsPdf();
  const pdf = exportador.exportar(resultado.rows);
  respuesta.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="NiCar_Logs_Acceso.pdf"',
    'Content-Length': pdf.length,
    'Cache-Control': 'no-store'
  });
  respuesta.end(pdf);
  return true;
}
