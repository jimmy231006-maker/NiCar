import pg from 'pg';
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
  max: 5,
  connectionTimeoutMillis: 10000
});
pg.types.setTypeParser(1114, value => value.replace(' ', 'T'));
pg.types.setTypeParser(1082, value => value);
export async function transaction(action) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const value = await action(db);
    await db.query('COMMIT');
    return value;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); }
}
export async function initialize() {
  await pool.query(`CREATE TABLE IF NOT EXISTS nicar."SesionWeb" (
    "Token" text PRIMARY KEY,
    "IdUsuario" integer NOT NULL REFERENCES nicar."Usuario",
    "Expira" timestamptz NOT NULL
  ); REVOKE ALL ON nicar."SesionWeb" FROM PUBLIC, anon, authenticated;`);
}
