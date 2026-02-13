-- Add site filtering to master data tables
-- Migration: Add siteId columns and create missing tables

-- Add siteId to freight_companies if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='freight_companies' AND column_name='site_id') THEN
        ALTER TABLE freight_companies ADD COLUMN site_id INTEGER REFERENCES sites(id);
    END IF;
END $$;

-- Add siteId to clients if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='clients' AND column_name='site_id') THEN
        ALTER TABLE clients ADD COLUMN site_id INTEGER REFERENCES sites(id);
    END IF;
END $$;

-- Add siteId to transporters if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='transporters' AND column_name='site_id') THEN
        ALTER TABLE transporters ADD COLUMN site_id INTEGER REFERENCES sites(id);
    END IF;
END $$;

-- Ensure drivers table has transporter_id (should already exist from previous migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='drivers' AND column_name='transporter_id') THEN
        ALTER TABLE drivers ADD COLUMN transporter_id INTEGER REFERENCES transporters(id);
    END IF;
END $$;

-- Add cutler_permit_number and cutler_permit_expiry to drivers if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='drivers' AND column_name='cutler_permit_number') THEN
        ALTER TABLE drivers ADD COLUMN cutler_permit_number VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='drivers' AND column_name='cutler_permit_expiry') THEN
        ALTER TABLE drivers ADD COLUMN cutler_permit_expiry TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='drivers' AND column_name='board_number') THEN
        ALTER TABLE drivers ADD COLUMN board_number VARCHAR(50);
    END IF;
END $$;

-- Create driver_documents table if not exists
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
);

-- Create indexes if not exists
CREATE INDEX IF NOT EXISTS idx_freight_companies_site ON freight_companies(site_id);
CREATE INDEX IF NOT EXISTS idx_clients_site ON clients(site_id);
CREATE INDEX IF NOT EXISTS idx_transporters_site ON transporters(site_id);
CREATE INDEX IF NOT EXISTS idx_drivers_transporter ON drivers(transporter_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_allocation_id ON driver_documents(allocation_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON driver_documents(driver_id);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Site filtering migration completed successfully';
END $$;
