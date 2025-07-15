import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'finance_tracker',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

export async function getConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export async function query(sql: string, params?: any[]) {
  try {
    console.log('DB: Connecting to database...');
    const connection = await getConnection();
    console.log('DB: Connection successful, executing query...');
    console.log('DB: SQL:', sql);
    console.log('DB: Params:', params);
    
    const [results] = await connection.execute(sql, params);
    console.log('DB: Query successful, results type:', typeof results);
    console.log('DB: Results length:', Array.isArray(results) ? results.length : 'not an array');
    
    await connection.end();
    console.log('DB: Connection closed');
    return results;
  } catch (error) {
    console.error('DB: Query error:', error);
    throw error;
  }
}

// Utility function to convert MySQL decimal values to numbers
export function convertDecimalToNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  // Handle Decimal objects from MySQL
  if (value && typeof value === 'object' && 'toString' in value) {
    return parseFloat(value.toString()) || 0;
  }
  return 0;
} 
