import { pool, transaction } from './db.js';
import { fail, json, body, requireRole, staff } from './http.js';
import { phone } from '../public/js/validation.js';
export async function catalog(req,res,path,user) {
  if (path === '/api/catalog' && req.method === 'GET') {
    const result = await pool.query(`SELECT v."IdVehiculo",v."Anio",v."Version",v."ColorExterior",v."Transmision",
      v."Traccion",v."Combustible",v."Kilometraje",v."TipoCarroceria",v."PrecioOferta",v."ImagenUrl",v."Ubicacion",
      m."Nombre" AS "Modelo",b."Nombre" AS "Marca" FROM nicar."Vehiculo" v
      JOIN nicar."Modelo" m USING ("IdModelo") JOIN nicar."Marca" b USING ("IdMarca")
      WHERE v."Activo" AND v."Estado"='Disponible' AND m."Activo" AND b."Activo" ORDER BY v."FechaRegistro" DESC`);
    json(res,result.rows); return true;
  }
  if (path !== '/api/appointments') return false;
  if (req.method === 'GET') {
    if (!user) fail('Iniciá sesión.',401);
    if (user.Rol !== 'Cliente') requireRole(user,staff);
    const result = await pool.query(`SELECT c."IdCita",c."Nombre",c."Telefono",c."Inicio",
      concat(b."Nombre",' ',m."Nombre",' ',v."Anio") AS "Vehiculo" FROM nicar."Cita" c
      JOIN nicar."Vehiculo" v USING ("IdVehiculo") JOIN nicar."Modelo" m USING ("IdModelo")
      JOIN nicar."Marca" b USING ("IdMarca")
      WHERE ($1::integer IS NULL OR c."IdUsuario"=$1) ORDER BY c."Inicio" DESC`,[user.Rol === 'Cliente' ? user.IdUsuario : null]);
    json(res,result.rows); return true;
  }
  if (req.method !== 'POST') return false;
  requireRole(user,['Cliente']);
  const data = await body(req);
  phone(data.Telefono);
  if (!Number.isSafeInteger(Number(data.IdVehiculo)) || Number(data.IdVehiculo) <= 0) fail('Seleccioná un vehículo.');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00$/.test(data.Inicio || '')) fail('Elegí una fecha y una hora en punto.');
  const result = await transaction(async db => {
    const { rows } = await db.query(`SELECT v."IdVehiculo" FROM nicar."Vehiculo" v
      JOIN nicar."Modelo" m USING ("IdModelo") JOIN nicar."Marca" b USING ("IdMarca")
      WHERE v."IdVehiculo"=$1 AND v."Activo" AND v."Estado"='Disponible' AND m."Activo" AND b."Activo"
      FOR SHARE OF v,m,b`,[data.IdVehiculo]);
    if (!rows.length) fail('El vehículo ya no está disponible.');
    return db.query(`INSERT INTO nicar."Cita" ("IdVehiculo","IdUsuario","Telefono","Inicio")
      VALUES ($1,$2,$3,$4) RETURNING "IdCita","Inicio"`,[data.IdVehiculo,user.IdUsuario,data.Telefono,data.Inicio]);
  });
  json(res,result.rows[0],201); return true;
}
