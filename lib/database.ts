/**
 * lib/database.ts
 *
 * OOP singleton database client built on a mysql2 connection pool.
 *
 * Why a pool instead of per-query connections?
 * The previous implementation called mysql.createConnection() on every query,
 * paying a full TCP + auth handshake per request. A pool keeps connections
 * alive and reuses them, which is significantly faster under load.
 *
 * The class is not exported; callers use the module-level `query()` function
 * which maintains backward compatibility with every existing API route.
 */

import mysql from 'mysql2/promise';

// ─── DatabaseClient (OOP singleton) ──────────────────────────────────────────

class DatabaseClient {
  private static instance: DatabaseClient;
  private readonly pool: mysql.Pool;

  private constructor() {
    this.pool = mysql.createPool({
      host:     process.env.DB_HOST     ?? 'localhost',
      database: process.env.DB_NAME     ?? 'finance_tracker',
      user:     process.env.DB_USER     ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      /** Allow up to 10 concurrent queries without blocking. */
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  /**
   * Returns the shared DatabaseClient instance.
   * Creates it on the first call (lazy initialisation).
   */
  static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  /**
   * Executes a parameterised SQL statement and returns the result rows.
   *
   * Security: always use `?` placeholders for user-supplied values.
   * Never interpolate untrusted data directly into the SQL string.
   */
  async execute<T = unknown>(sql: string, params?: unknown[]): Promise<T> {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows as T;
    } catch (error) {
      console.error('DatabaseClient: query error', error);
      throw error;
    }
  }
}

// ─── Module-level API (backward-compatible) ───────────────────────────────────

const db = DatabaseClient.getInstance();

/**
 * Executes a parameterised SQL query using the shared connection pool.
 * This is the sole database access function for all API routes.
 *
 * @example
 *   const rows = await query('SELECT * FROM transactions WHERE month = ?', [month])
 */
export async function query<T = unknown>(sql: string, params?: unknown[]): Promise<T> {
  return db.execute<T>(sql, params);
}

/**
 * Converts MySQL DECIMAL values to JavaScript numbers.
 *
 * mysql2 returns DECIMAL columns as strings (to preserve precision beyond
 * IEEE 754). This helper normalises the value to a JS number for arithmetic
 * and serialisation. Returns 0 for null / undefined.
 */
export function convertDecimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (typeof value === 'object' && 'toString' in (value as object)) {
    return parseFloat((value as { toString(): string }).toString()) || 0;
  }
  return 0;
}
