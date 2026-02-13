import { sql } from 'drizzle-orm';
import { db } from '../src/db';

async function applySiteFiltering() {
  try {
    console.log('🚀 Applying site filtering to master data tables...\n');

    // Add siteId to freight_companies
    try {
      await db.execute(sql`
        ALTER TABLE freight_companies
        ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id)
      `);
      console.log('✓ Added site_id to freight_companies');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('✓ freight_companies.site_id already exists');
      } else {
        console.error('Error adding site_id to freight_companies:', e.message);
      }
    }

    // Add siteId to clients
    try {
      await db.execute(sql`
        ALTER TABLE clients
        ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id)
      `);
      console.log('✓ Added site_id to clients');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('✓ clients.site_id already exists');
      } else {
        console.error('Error adding site_id to clients:', e.message);
      }
    }

    // Add siteId to transporters
    try {
      await db.execute(sql`
        ALTER TABLE transporters
        ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id)
      `);
      console.log('✓ Added site_id to transporters');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('✓ transporters.site_id already exists');
      } else {
        console.error('Error adding site_id to transporters:', e.message);
      }
    }

    // Add cutler permit fields to drivers
    try {
      await db.execute(sql`
        ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS cutler_permit_number VARCHAR(50)
      `);
      console.log('✓ Added cutler_permit_number to drivers');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('✓ drivers.cutler_permit_number already exists');
      }
    }

    try {
      await db.execute(sql`
        ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS cutler_permit_expiry TIMESTAMP
      `);
      console.log('✓ Added cutler_permit_expiry to drivers');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('✓ drivers.cutler_permit_expiry already exists');
      }
    }

    try {
      await db.execute(sql`
        ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS board_number VARCHAR(50)
      `);
      console.log('✓ Added board_number to drivers');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('✓ drivers.board_number already exists');
      }
    }

    // Create driver_documents table
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS driver_documents (
          id VARCHAR(36) PRIMARY KEY,
          tenant_id VARCHAR(50) NOT NULL,
          allocation_id INTEGER REFERENCES truck_allocations(id),
          driver_id INTEGER REFERENCES drivers(id),
          document_type VARCHAR(50) NOT NULL,
          file_path TEXT NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          file_size INTEGER,
          mime_type VARCHAR(100),
          ocr_status VARCHAR(50) DEFAULT 'pending',
          ocr_text TEXT,
          extracted_fields JSONB,
          parsed_confidence INTEGER,
          verification_status VARCHAR(50) DEFAULT 'pending',
          verified_by VARCHAR(100),
          verified_at TIMESTAMP,
          verification_notes TEXT,
          uploaded_by VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✓ Created driver_documents table');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('✓ driver_documents table already exists');
      } else {
        console.error('Error creating driver_documents:', e.message);
      }
    }

    // Create indexes
    const indexes = [
      { name: 'idx_freight_companies_site', sql: 'CREATE INDEX IF NOT EXISTS idx_freight_companies_site ON freight_companies(site_id)' },
      { name: 'idx_clients_site', sql: 'CREATE INDEX IF NOT EXISTS idx_clients_site ON clients(site_id)' },
      { name: 'idx_transporters_site', sql: 'CREATE INDEX IF NOT EXISTS idx_transporters_site ON transporters(site_id)' },
      { name: 'idx_drivers_transporter', sql: 'CREATE INDEX IF NOT EXISTS idx_drivers_transporter ON drivers(transporter_id)' },
      { name: 'idx_driver_documents_allocation_id', sql: 'CREATE INDEX IF NOT EXISTS idx_driver_documents_allocation_id ON driver_documents(allocation_id)' },
      { name: 'idx_driver_documents_driver_id', sql: 'CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON driver_documents(driver_id)' },
    ];

    console.log('\n📊 Creating indexes...');
    for (const index of indexes) {
      try {
        await db.execute(sql.raw(index.sql));
        console.log(`✓ Created ${index.name}`);
      } catch (e: any) {
        if (e.message?.includes('already exists')) {
          console.log(`✓ ${index.name} already exists`);
        } else {
          console.error(`Error creating ${index.name}:`, e.message);
        }
      }
    }

    console.log('\n✅ Site filtering migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

applySiteFiltering();
