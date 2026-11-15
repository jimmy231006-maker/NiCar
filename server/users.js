import { pool } from './db.js';
import { json,body,fail,requireRole,admins } from './http.js';
import { name,email,password } from '../public/js/validation.js';
import { credential } from './credentials.js';
export async function users(req,res,path,user) {
  if(path==='/api/logs' && req.method==='GET') {
    requireRole(user,['SuperAdministrador']);
    json(res,(await pool.query('SELECT * FROM nicar."LogAcceso" ORDER BY "IdLog" DESC LIMIT 500')).rows);
    return true;
  }
  if(!/^\/api\/users(?:\/\d+)?$/.test(path)) return false;
  requireRole(user,admins);
  const roles=user.Rol==='SuperAdministrador'?['Administrador','Vendedor','Recepcionista','Bodega','Cliente']:['Vendedor','Recepcionista','Bodega','Cliente'];
  if(req.method==='GET') {
    json(res,(await pool.query(`SELECT "IdUsuario","NombreUsuario","NombreCompleto","Rol","Activo","IntentosFallidos","BloqueadoHasta"
      FROM nicar."Usuario" WHERE "Rol"=ANY($1) ORDER BY "NombreCompleto"`,[user.Rol==='SuperAdministrador'?[...roles,'SuperAdministrador']:roles])).rows);
  } else if(req.method==='POST' && path==='/api/users') {
    const data=await body(req);
    name(data.Nombre); email(data.Correo); password(data.Contrasena);
    if(data.Nombre.length>100 || data.Correo.length>50 || !roles.filter(r=>r!=='Cliente').includes(data.Rol)) fail('Revisá el nombre, correo y rol.');
    const key=await credential(data.Contrasena);
    await pool.query(`INSERT INTO nicar."Usuario" ("NombreUsuario","NombreCompleto","Rol","HashContrasena","Salt")
      VALUES ($1,$2,$3,$4,$5)`,[data.Correo.trim().toLowerCase(),data.Nombre.trim(),data.Rol,key.HashContrasena,key.Salt]);
    json(res,{message:'Cuenta creada. Debe cambiar la contraseña al ingresar.'},201);
  } else if(req.method==='DELETE') {
    const id=Number(path.split('/').pop());
    if(id===user.IdUsuario) fail('No podés desactivar tu propia cuenta.');
    await pool.query(`UPDATE nicar."Usuario" SET "Activo"=NOT "Activo" WHERE "IdUsuario"=$1 AND "Rol"=ANY($2)`,[id,roles]);
    json(res,{message:'Estado actualizado.'});
  } else return false;
  return true;
}
