import mysql from 'mysql2/promise'

let pool

function getConfig() {
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'booksmart',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  }
  // Enable SSL for cloud databases (TiDB Cloud, PlanetScale, etc.)
  if (process.env.DB_SSL === 'true') {
    config.ssl = { rejectUnauthorized: true }
  }
  return config
}

export function getPool() {
  if (!pool) pool = mysql.createPool(getConfig())
  return pool
}

export async function dbQuery(sql, params = []) {
  try {
    const [rows] = await getPool().execute(sql, params)
    return rows
  } catch (error) {
    console.error('[dbQuery Error]', {
      sql: sql.substring(0, 200),
      params: params.slice(0, 5),
      error: error.message,
      code: error.code
    })
    throw error
  }
}
