import { sql } from 'drizzle-orm';
import { db } from '../src/db';

async function addSiteFiltering() {
  try {
    console.log('🚀 Adding site filtering to master data tables...\n');
    console.log('✅ Database connection established');

    // Add site_id to clients table
    try {
      await db.execute(sql`
        ALTER TABLE clients
        ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id)
      `);
      console.log('✓ Added site_id column to clients table');
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('⚠ site_id column already exists in clients table');
      } else {
        throw error;
      }
    }

    // Add site_id to transporters table
    try {
      await db.execute(sql`
        ALTER TABLE transporters
        ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id)
      `);
      console.log('✓ Added site_id column to transporters table');
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('⚠ site_id column already exists in transporters table');
      } else {
        throw error;
      }
    }

    // Add site_id to freight_companies table
    try {
      await db.execute(sql`
        ALTER TABLE freight_companies
        ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id)
      `);
      console.log('✓ Added site_id column to freight_companies table');
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('⚠ site_id column already exists in freight_companies table');
      } else {
        throw error;
      }
    }

    // Create indexes
    console.log('\n📊 Creating indexes...');

    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_clients_site ON clients(site_id)
      `);
      console.log('✓ Created index on clients.site_id');
    } catch (error: any) {
      console.log('⚠ Index on clients.site_id may already exist');
    }

    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_transporters_site ON transporters(site_id)
      `);
      console.log('✓ Created index on transporters.site_id');
    } catch (error: any) {
      console.log('⚠ Index on transporters.site_id may already exist');
    }

    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_freight_companies_site ON freight_companies(site_id)
      `);
      console.log('✓ Created index on freight_companies.site_id');
    } catch (error: any) {
      console.log('⚠ Index on freight_companies.site_id may already exist');
    }

    console.log('\n✅ Site filtering migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

addSiteFiltering();
