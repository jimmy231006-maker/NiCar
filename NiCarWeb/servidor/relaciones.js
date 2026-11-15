import { rechazar } from './respuestas.js';

const referencias = {
  IdMarca: 'Marca',
  IdModelo: 'Modelo',
  IdVehiculo: 'Vehiculo',
  IdProveedor: 'Proveedor',
  IdCliente: 'Cliente',
  IdTipoCosto: 'TipoCosto',
  IdFinanciera: 'Financiera',
  IdUsuario: 'Usuario',
  IdContrato: 'ContratoColaborador'
};
export async function validarRelaciones(baseDatos, datos, tipoEntidad) {
  for (const [clave, entidad] of Object.entries(referencias)) {
    if (!datos[clave]) continue;
    const sql = 'SELECT * FROM nicar."' + entidad + '" WHERE "' + clave + '"=$1 FOR SHARE';
    const resultado = await baseDatos.query(sql,[datos[clave]]);
    const fila = resultado.rows[0];
    if (!fila?.Activo) rechazar('Seleccioná un registro activo en ' + clave + '.');
    if (['ContratoColaborador','PagoColaborador'].includes(tipoEntidad) && clave === 'IdUsuario' && fila.Rol === 'Cliente') {
      rechazar('El registro requiere un colaborador, no un cliente.');
    }
    if (tipoEntidad === 'PagoColaborador' && clave === 'IdContrato' && fila.IdUsuario !== Number(datos.IdUsuario)) {
      rechazar('El contrato activo debe pertenecer al mismo colaborador.');
    }
    if (tipoEntidad === 'Modelo') {
      const marca = await baseDatos.query(
        'SELECT "Activo" FROM nicar."Marca" WHERE "IdMarca"=$1 FOR SHARE',
        [fila.IdMarca]
      );
      if (!marca.rows[0]?.Activo) rechazar('La marca debe estar activa.');
    }
  }
}