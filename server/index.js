import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { pool,initialize } from './db.js';
import { json,fail,errorResponse } from './http.js';
import { session } from './session.js';
import { auth } from './auth.js';
import { catalog } from './catalog.js';
import { admin } from './admin.js';
import { users } from './users.js';
import { lookups } from './lookups.js';
import { kardex } from './kardex.js';
const publicDir=resolve('public');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json'};
const hits=new Map();
function throttle(req) {
  const key=req.socket.remoteAddress;
  const now=Date.now();
  const hit=hits.get(key);
  if(!hit || hit.until<now) hits.set(key,{count:1,until:now+60000});
  else if(++hit.count>120) fail('Demasiadas solicitudes. Esperá un minuto.',429);
  if(hits.size>10000) for(const [k,v] of hits) if(v.until<now) hits.delete(k);
}
const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' https: http:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; form-action 'self'");
  try {
    const path=new URL(req.url,'http://localhost').pathname;
    if(path.startsWith('/api/')) {
      throttle(req);
      if(!['GET','HEAD'].includes(req.method)) {
        const expected=process.env.APP_ORIGIN;
        const origin=req.headers.origin;
        if(!expected || origin!==expected) fail('Origen de solicitud no autorizado.',403);
        if(!req.headers['content-type']?.startsWith('application/json')) fail('Usá un formulario JSON.',415);
      }
      if(path==='/api/health') {
        await pool.query('SELECT 1'); json(res,{ok:true}); return;
      }
      const user=await session(req);
      if(user?.DebeCambiarContrasena && !['/api/me','/api/auth/password','/api/auth/logout'].includes(path))
        fail('Cambiá tu contraseña temporal para continuar.',403);
      for(const handler of [auth,catalog,admin,users,lookups,kardex]) if(await handler(req,res,path,user)) return;
      fail('Ruta no encontrada.',404);
    }
    if(!['GET','HEAD'].includes(req.method)) fail('Método no permitido.',405);
    const file=resolve(publicDir,'.'+decodeURIComponent(path==='/'?'/index.html':path));
    if(!file.startsWith(publicDir+'/') && !file.startsWith(publicDir+'\\')) fail('Ruta inválida.',404);
    const bytes=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});
    res.end(req.method==='HEAD'?undefined:bytes);
  } catch(error) {
    if(error.code==='ENOENT') error.status=404,error.message='Archivo no encontrado.';
    errorResponse(res,error);
  }
});
if(process.env.DATABASE_URL) await initialize();
server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('NiCar disponible en puerto '+(process.env.PORT||3000)));
