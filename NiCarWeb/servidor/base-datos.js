import pg from 'pg';
const certificadoSupabase = process.env.DATABASE_SSL_CERT?.replace(/\\n/g, '\n');
export const conexion = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? {
        rejectUnauthorized: Boolean(certificadoSupabase),
        ...(certificadoSupabase ? { ca: certificadoSupabase } : {})
      }
    : undefined,
  max: 5,
  connectionTimeoutMillis: 10000
});
pg.types.setTypeParser(1114, (valor) => valor.replace(' ', 'T'));
pg.types.setTypeParser(1082, (valor) => valor);
export async function ejecutarTransaccion(accion) {
  const baseDatos = await conexion.connect();
  try {
    await baseDatos.query('BEGIN');
    const valor = await accion(baseDatos);
    await baseDatos.query('COMMIT');
    return valor;
  } catch (problema) {
    await baseDatos.query('ROLLBACK');
    throw problema;
  } finally {
    baseDatos.release();
  }
}
export async function prepararBaseDatos() {
  await conexion.query(`CREATE TABLE IF NOT EXISTS nicar."SesionWeb" (
    "Token" text PRIMARY KEY,
    "IdUsuario" integer NOT NULL REFERENCES nicar."Usuario",
    "Expira" timestamptz NOT NULL
  ); REVOKE ALL ON nicar."SesionWeb" FROM PUBLIC, anon, authenticated;`);
}
