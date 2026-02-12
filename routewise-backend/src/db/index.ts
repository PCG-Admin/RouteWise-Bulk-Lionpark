import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'routewise',
  password: process.env.DB_PASSWORD || 'routewise_dev_password',
  database: process.env.DB_NAME || 'routewise_db',

  // Connection pool settings for production performance
  max: 20,                      // Maximum number of connections in the pool
  min: 5,                       // Minimum number of connections to maintain
  idleTimeoutMillis: 30000,     // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Timeout waiting for a connection (5 seconds)
  maxUses: 7500,                // Recycle connections after 7500 uses

  // Keep alive to prevent connection drops
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

export const db = drizzle(pool, { schema });

// Connection pool monitoring
pool.on('connect', (client) => {
  console.log('✅ Database connection established');
});

pool.on('acquire', (client) => {
  // Connection acquired from pool - can be used for monitoring
});

pool.on('remove', (client) => {
  console.log('♻️  Database connection removed from pool');
});

pool.on('error', (err, client) => {
  console.error('❌ Database pool error:', err);
  // Don't exit - let the pool handle reconnection
});
