import { conexion, ejecutarTransaccion } from './base-datos.js';
import { responderJson, leerFormulario, rechazar, exigirRol, administradores, personal } from './respuestas.js';
import { validaciones } from './validaciones.js';

async function obtenerCredito(codigo, usuario) {
  const resultado = await conexion.query(
    `SELECT c."IdCredito",c."Estado",v."IdCliente",v."IdVendedor"
     FROM nicar."Credito" c JOIN nicar."Venta" v USING ("IdVenta")
     WHERE c."IdCredito"=$1`, [codigo]
  );
  const credito = resultado.rows[0];
  const esCliente = usuario.Rol === 'Cliente' && credito?.IdCliente === usuario.IdCliente;
  const esVendedor = usuario.Rol === 'Vendedor' && credito?.IdVendedor === usuario.IdUsuario;
  if (!credito || (!esCliente && !esVendedor && !administradores.includes(usuario.Rol))) {
    rechazar('Crédito no encontrado.', 404);
  }
  return credito;
}

export async function atenderCreditos(solicitud, respuesta, ruta, usuario) {
  if (ruta === '/api/creditos' && solicitud.method === 'GET') {
    exigirRol(usuario, [...personal, 'Cliente']);
    const resultado = await conexion.query(
      `SELECT c.*,f."Nombre" AS "Financiera",f."SitioWeb",f."InstruccionesPago",
       v."IdCliente",v."IdVendedor",concat(m."Nombre",' ',vhi."Anio") AS "Vehiculo"
       FROM nicar."Credito" c JOIN nicar."Financiera" f USING ("IdFinanciera")
       JOIN nicar."Venta" v USING ("IdVenta") JOIN nicar."Vehiculo" vhi USING ("IdVehiculo")
       JOIN nicar."Modelo" m USING ("IdModelo")
       WHERE ($1::integer IS NULL OR v."IdCliente"=$1)
         AND ($2::integer IS NULL OR v."IdVendedor"=$2) ORDER BY c."FechaRegistro" DESC`,
      [usuario.Rol === 'Cliente' ? usuario.IdCliente : null,
        usuario.Rol === 'Vendedor' ? usuario.IdUsuario : null]
    );
    responderJson(respuesta, resultado.rows);
    return true;
  }
  if (ruta === '/api/creditos/pagos' && solicitud.method === 'GET') {
    exigirRol(usuario, administradores);
    const resultado = await conexion.query(
      `SELECT p.*,c."NumeroContrato",f."Nombre" AS "Financiera",u."NombreCompleto" AS "Cliente"
       FROM nicar."PagoCredito" p JOIN nicar."Credito" c USING ("IdCredito")
       JOIN nicar."Financiera" f USING ("IdFinanciera") JOIN nicar."Venta" v USING ("IdVenta")
       JOIN nicar."Usuario" u ON u."IdCliente"=v."IdCliente"
       WHERE p."Estado"='PendienteRevision' ORDER BY p."FechaPago"`
    );
    responderJson(respuesta, resultado.rows);
    return true;
  }
  const pagoId = /^\/api\/creditos\/pagos\/(\d+)$/.exec(ruta);
  if (pagoId && solicitud.method === 'PUT') {
    exigirRol(usuario, administradores);
    const datos = await leerFormulario(solicitud);
    if (!['Aprobado','Rechazado'].includes(datos.Estado)) rechazar('Seleccioná aprobar o rechazar el reporte.');
    await ejecutarTransaccion(async db => {
      const pago = await db.query('SELECT * FROM nicar."PagoCredito" WHERE "IdPagoCredito"=$1 FOR UPDATE', [pagoId[1]]);
      if (!pago.rows[0] || pago.rows[0].Estado !== 'PendienteRevision') rechazar('Reporte ya revisado.', 409);
      await db.query('UPDATE nicar."PagoCredito" SET "Estado"=$1,"RevisadoPor"=$2,"FechaRevision"=now(),"Observaciones"=$3 WHERE "IdPagoCredito"=$4',
        [datos.Estado,usuario.IdUsuario,datos.Observaciones || null,pagoId[1]]);
    });
    responderJson(respuesta,{ message:'Reporte registrado. El estado y saldo oficial se confirma con la financiera.' });
    return true;
  }
  const coincidencia = /^\/api\/creditos\/(\d+)\/pagos$/.exec(ruta);
  if (!coincidencia || solicitud.method !== 'POST') return false;
  exigirRol(usuario,['Cliente']);
  const credito = await obtenerCredito(coincidencia[1],usuario);
  if (credito.Estado !== 'Activo') rechazar('Este crédito no admite reportes nuevos.');
  const datos = await leerFormulario(solicitud);
  const monto = validaciones.validarPagoCredito(datos);
  const resultado = await conexion.query(
    `INSERT INTO nicar."PagoCredito" ("IdCredito","IdUsuario","FechaPago","MontoUSD","NumeroCuota","Referencia")
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING "IdPagoCredito","Estado"`,
    [coincidencia[1],usuario.IdUsuario,datos.FechaPago,Number(monto)/100,
      datos.NumeroCuota ? Number(datos.NumeroCuota) : null,datos.Referencia.trim()]
  );
  responderJson(respuesta,resultado.rows[0],201);
  return true;
}
