import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDbClient(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Determine SSL configuration
    // Check if SSL is explicitly required via environment variable
    const sslEnabled = process.env.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === '1';

    // Detect if this is a local Docker container or localhost connection
    const isLocalConnection =
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1') ||
      connectionString.includes('postgres:5432'); // Docker service name

    // Determine SSL config:
    // 1. If explicitly enabled via env var, use it
    // 2. If local connection (Docker/localhost), disable SSL
    // 3. If production and remote, enable SSL
    // 4. Otherwise, disable SSL (safe default)
    let sslConfig: boolean | object = false;

    if (sslEnabled) {
      // Explicitly enabled via environment variable
      sslConfig = { rejectUnauthorized: false };
    } else if (isLocalConnection) {
      // Local connections (Docker/localhost) don't need SSL
      sslConfig = false;
    } else if (process.env.NODE_ENV === 'production') {
      // Production remote databases should use SSL
      sslConfig = { rejectUnauthorized: false };
    }

    pool = new Pool({
      connectionString,
      ssl: sslConfig,
    });
  }

  return pool;
}

export async function closeDbConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Export pool for direct access if needed
export { pool };
