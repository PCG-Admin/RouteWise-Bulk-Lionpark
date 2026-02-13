import { sql } from 'drizzle-orm';
import { db } from '../src/db';

async function addSiteIdToAllocations() {
  try {
    console.log('🚀 Adding site_id column to truck_allocations table...\n');

    // Add site_id column
    await db.execute(sql`
      ALTER TABLE truck_allocations
      ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id)
    `);
    console.log('✓ Added site_id column to truck_allocations');

    // Create index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_truck_allocations_site ON truck_allocations(site_id)
    `);
    console.log('✓ Created index on truck_allocations.site_id');

    console.log('\n✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

addSiteIdToAllocations();
