/**
 * seed-admins.ts
 * Creates two admin users — one for Lions Park (mindrift-lionspark) and one for Bulk Connections (weigh8-bulks)
 *
 * Usage:
 *   npx tsx src/scripts/seed-admins.ts
 *
 * Environment: requires DB_PASSWORD and other DB env vars to be set (or .env file loaded)
 */

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';

if (!process.env.DB_PASSWORD) {
  console.error('ERROR: DB_PASSWORD environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'routewise_db',
});

const db = drizzle(pool, { schema });

const ADMINS = [
  {
    email: 'lionsadmin@routewise.com',
    password: 'LionsPark@Admin2024!',
    fullName: 'Lions Park Admin',
    tenantId: '1',
    siteId: 1,   // Restricted to Lions Park (site 1)
    role: 'admin' as const,
    site: 'mindrift-Lionspark-weigh8',
  },
  {
    email: 'bulkadmin@routewise.com',
    password: 'BulkConn@Admin2024!',
    fullName: 'Bulk Connections Admin',
    tenantId: '1',
    siteId: 2,   // Restricted to Bulk Connections (site 2)
    role: 'admin' as const,
    site: 'weigh8-bulkconnections',
  },
];

async function seedAdmins() {
  console.log('\n=== Weigh8 Admin Seed Script ===\n');

  for (const admin of ADMINS) {
    console.log(`Processing: ${admin.email} (${admin.site})`);

    // Check if user already exists
    const [existing] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, admin.email))
      .limit(1);

    if (existing) {
      console.log(`  ⚠️  User already exists (id=${existing.id}, role=${existing.role})`);
      console.log(`     To reset password, delete the user and re-run this script.\n`);
      continue;
    }

    // Hash password with cost factor 12
    const passwordHash = await bcrypt.hash(admin.password, 12);

    const [created] = await db
      .insert(schema.users)
      .values({
        email: admin.email,
        passwordHash,
        fullName: admin.fullName,
        tenantId: admin.tenantId,
        siteId: admin.siteId,
        role: admin.role,
        isActive: true,
      })
      .returning();

    console.log(`  ✅ Created admin user:`);
    console.log(`     ID:       ${created.id}`);
    console.log(`     Email:    ${created.email}`);
    console.log(`     Password: ${admin.password}`);
    console.log(`     Tenant:   ${created.tenantId}`);
    console.log(`     Site:     ${admin.site}\n`);
  }

  console.log('=== Done ===');
  console.log('\n⚠️  IMPORTANT: Change the passwords above immediately after first login!');
  console.log('   Use POST /api/auth/register (admin-only) to create additional users.\n');

  await pool.end();
}

seedAdmins().catch((err) => {
  console.error('Seed failed:', err);
  pool.end();
  process.exit(1);
});
