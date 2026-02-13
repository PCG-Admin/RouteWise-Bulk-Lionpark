import { sql } from 'drizzle-orm';
import { db } from '../src/db';

async function createMissingTables() {
  try {
    console.log('🚀 Creating missing tables...\n');

    // Create freight_companies table
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS freight_companies (
          id SERIAL PRIMARY KEY,
          tenant_id VARCHAR(50) NOT NULL,
          site_id INTEGER REFERENCES sites(id),
          name VARCHAR(200) NOT NULL,
          code VARCHAR(50),
          contact_person VARCHAR(100),
          email VARCHAR(255),
          phone VARCHAR(20),
          address TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✓ Created freight_companies table');
    } catch (e: any) {
      console.log('✓ freight_companies table already exists');
    }

    // Verify drivers table exists (it should from init-db.sql)
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS drivers (
          id SERIAL PRIMARY KEY,
          tenant_id VARCHAR(50) NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          phone VARCHAR(20),
          email VARCHAR(255),
          license_number VARCHAR(50),
          license_class VARCHAR(20),
          license_expiry TIMESTAMP,
          id_number VARCHAR(50),
          passport_number VARCHAR(50),
          induction_completed BOOLEAN DEFAULT FALSE,
          induction_at TIMESTAMP,
          induction_ref VARCHAR(100),
          cutler_permit_number VARCHAR(50),
          cutler_permit_expiry TIMESTAMP,
          board_number VARCHAR(50),
          transporter_id INTEGER REFERENCES transporters(id),
          employee_id VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✓ Created/verified drivers table');
    } catch (e: any) {
      console.error('Error with drivers table:', e.message);
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
      console.log('✓ driver_documents table already exists');
    }

    // Create all indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_freight_companies_tenant ON freight_companies(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_freight_companies_site ON freight_companies(site_id)',
      'CREATE INDEX IF NOT EXISTS idx_drivers_license_number ON drivers(license_number)',
      'CREATE INDEX IF NOT EXISTS idx_drivers_id_number ON drivers(id_number)',
      'CREATE INDEX IF NOT EXISTS idx_drivers_transporter ON drivers(transporter_id)',
      'CREATE INDEX IF NOT EXISTS idx_driver_documents_allocation_id ON driver_documents(allocation_id)',
      'CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON driver_documents(driver_id)',
    ];

    console.log('\n📊 Creating indexes...');
    for (const indexSQL of indexes) {
      try {
        await db.execute(sql.raw(indexSQL));
        const indexName = indexSQL.match(/idx_\w+/)?.[0] || 'unknown';
        console.log(`✓ Created ${indexName}`);
      } catch (e: any) {
        if (e.message?.includes('already exists')) {
          const indexName = indexSQL.match(/idx_\w+/)?.[0] || 'unknown';
          console.log(`✓ ${indexName} already exists`);
        }
      }
    }

    console.log('\n✅ All tables and indexes created successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  }
}

createMissingTables();
