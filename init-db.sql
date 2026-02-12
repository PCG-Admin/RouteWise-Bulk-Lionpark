-- RouteWise Database Initialization Script
-- This creates the core tables needed for order management and logistics

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants table (multi-tenancy support)
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  tenant_name VARCHAR(100) NOT NULL UNIQUE,
  domain VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'user', -- admin, user, operator
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sites table (Lions Park, Bulk Connections, etc.)
CREATE TABLE IF NOT EXISTS sites (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  site_name VARCHAR(100) NOT NULL,
  site_type VARCHAR(20) NOT NULL, -- lions_park, bulk, mine, other
  address TEXT,
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50),
  contact_person VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50),
  contact_person VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  products JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transporters table
CREATE TABLE IF NOT EXISTS transporters (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50),
  contact_person VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  client_id INTEGER REFERENCES clients(id),
  client_name VARCHAR(200),
  supplier_id INTEGER REFERENCES suppliers(id),
  transporter_id INTEGER REFERENCES transporters(id),

  -- Product details
  product VARCHAR(200) NOT NULL,
  product_code VARCHAR(50),
  description TEXT,
  quantity DECIMAL(12, 3),
  unit VARCHAR(10) DEFAULT 'kg',
  expected_weight DECIMAL(10, 2),

  -- Locations
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,

  -- Scheduling
  requested_pickup_date TIMESTAMP,
  requested_delivery_date TIMESTAMP,
  actual_pickup_date TIMESTAMP,
  actual_delivery_date TIMESTAMP,

  -- Pricing
  agreed_rate DECIMAL(10, 2),
  rate_unit VARCHAR(20) DEFAULT 'per_kg',
  additional_charges DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2),

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, in_transit, delivered, cancelled
  priority VARCHAR(20) DEFAULT 'normal', -- urgent, high, normal, low

  -- Additional info
  special_instructions TEXT,
  notes TEXT,
  requires_permit BOOLEAN DEFAULT FALSE,
  hazardous_material BOOLEAN DEFAULT FALSE,
  temperature_controlled BOOLEAN DEFAULT FALSE,

  -- References
  reference_number VARCHAR(100),
  purchase_order_number VARCHAR(100),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Planned Visits (Truck Allocations) table
CREATE TABLE IF NOT EXISTS planned_visits (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  site_id INTEGER REFERENCES sites(id),
  order_id INTEGER REFERENCES orders(id),

  -- Truck & Driver info
  plate_number VARCHAR(20) NOT NULL,
  trailer1_plate_number VARCHAR(20),
  trailer2_plate_number VARCHAR(20),
  driver_name VARCHAR(100) NOT NULL,
  driver_id VARCHAR(50),
  driver_phone VARCHAR(20),
  driver_permit VARCHAR(50),
  permit_expiry_date DATE,
  transporter_name VARCHAR(100),

  -- Product info
  order_external_id VARCHAR(100),
  product VARCHAR(100),
  expected_weight VARCHAR(20),

  -- Scheduling
  scheduled_arrival TIMESTAMP NOT NULL,
  estimated_arrival TIMESTAMP,
  actual_arrival TIMESTAMP,

  -- Status
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, in_transit, arrived, completed, cancelled
  priority VARCHAR(20) DEFAULT 'normal',

  -- Additional info
  special_instructions TEXT,
  contact_info VARCHAR(200),

  -- Tracking
  visit_id INTEGER, -- Links to actual visit when started

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Visits table (actual visits at sites)
CREATE TABLE IF NOT EXISTS visits (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  site_id INTEGER REFERENCES sites(id),
  order_id INTEGER REFERENCES orders(id),
  planned_visit_id INTEGER REFERENCES planned_visits(id),

  -- Subject info
  subject_type VARCHAR(20) NOT NULL, -- vehicle, driver, visitor
  subject_external_id VARCHAR(100),
  plate_number VARCHAR(20),
  driver_name VARCHAR(100),
  driver_phone VARCHAR(20),

  -- Entry/Exit
  entry_time TIMESTAMP,
  exit_time TIMESTAMP,

  -- Order references
  order_external_id VARCHAR(100),
  order_number VARCHAR(100),
  client_order_number VARCHAR(100),
  supplier_external_id VARCHAR(100),

  -- Customer & Transporter
  customer_name VARCHAR(100),
  transporter_name VARCHAR(100),
  client_name VARCHAR(200),

  -- Weight measurements
  weighbridge_entry_weight DECIMAL(10, 2),
  weighbridge_exit_weight DECIMAL(10, 2),
  delivery_point_entry_weight DECIMAL(10, 2),
  delivery_point_exit_weight DECIMAL(10, 2),

  -- Status
  status VARCHAR(20) DEFAULT 'open', -- open, closed
  kanban_status VARCHAR(20) DEFAULT 'pending_arrival', -- staging, pending_arrival, checked_in, departed
  access_decision VARCHAR(20), -- PASS, HOLD, MANUAL_REVIEW
  is_non_matched BOOLEAN DEFAULT FALSE,
  reasons TEXT,

  -- Timing
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,

  -- OCR Processing
  ocr_requested BOOLEAN DEFAULT FALSE,
  ocr_requested_at TIMESTAMP,
  ocr_processed BOOLEAN DEFAULT FALSE,
  ocr_processed_at TIMESTAMP,
  ocr_confidence INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Truck Allocations table (simplified truck allocation tracking)
CREATE TABLE IF NOT EXISTS truck_allocations (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  order_id INTEGER REFERENCES orders(id) NOT NULL,

  -- Tracking reference (e.g., TA-ORD-2024-001-01)
  allocation_ref VARCHAR(50) UNIQUE,

  -- Vehicle details
  vehicle_reg VARCHAR(50) NOT NULL,
  driver_name VARCHAR(100),
  driver_phone VARCHAR(20),
  driver_id VARCHAR(50),

  -- Weight information
  gross_weight DECIMAL(10, 2),
  tare_weight DECIMAL(10, 2),
  net_weight DECIMAL(10, 2),

  -- Reference and scheduling
  ticket_no VARCHAR(50),
  scheduled_date TIMESTAMP,
  actual_arrival TIMESTAMP,
  departure_time TIMESTAMP,

  -- Transporter
  transporter VARCHAR(200),

  -- Status tracking
  status VARCHAR(20) DEFAULT 'scheduled',
  driver_validation_status VARCHAR(30) DEFAULT 'pending_verification',

  -- Additional info
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX idx_transporters_tenant ON transporters(tenant_id);
CREATE INDEX idx_planned_visits_tenant ON planned_visits(tenant_id);
CREATE INDEX idx_planned_visits_status ON planned_visits(status);
CREATE INDEX idx_visits_tenant ON visits(tenant_id);
CREATE INDEX idx_visits_site ON visits(site_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_truck_allocations_tenant ON truck_allocations(tenant_id);
CREATE INDEX idx_truck_allocations_order ON truck_allocations(order_id);

-- Insert default tenant
INSERT INTO tenants (tenant_name, domain, is_active)
VALUES ('Default Tenant', 'default.weigh8.com', TRUE)
ON CONFLICT DO NOTHING;

-- Insert default user (password: admin123 - hashed with bcrypt)
-- Note: This is for development only. Change in production!
INSERT INTO users (tenant_id, email, password_hash, full_name, role)
VALUES ('1', 'admin@routewise.com', '$2b$10$nbODc8jAvD2Dt2UY1s1U1.obvl7IAqtOdTFab77x7T2FKtr3HVy0.', 'Admin User', 'admin')
ON CONFLICT DO NOTHING;

-- Insert sample sites
INSERT INTO sites (tenant_id, site_name, site_type, address)
VALUES
  ('1', 'Lions Park Truck Stop', 'lions_park', '123 Lions Park Road'),
  ('1', 'Bulk Connections Port', 'bulk', '456 Port Road')
ON CONFLICT DO NOTHING;

-- ====================
-- DRIVER MANAGEMENT TABLES
-- ====================

-- Drivers master table
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
);

-- Driver documents table
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

-- Parking Tickets table
CREATE TABLE IF NOT EXISTS parking_tickets (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  truck_allocation_id INTEGER REFERENCES truck_allocations(id) NOT NULL,

  -- Ticket identification
  ticket_number VARCHAR(50) UNIQUE NOT NULL,

  -- Arrival information
  arrival_datetime TIMESTAMP NOT NULL DEFAULT NOW(),
  person_on_duty VARCHAR(100),
  terminal_number VARCHAR(10) DEFAULT '1',

  -- Vehicle information
  vehicle_reg VARCHAR(50) NOT NULL,
  anpr_image_path TEXT,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending',
  hours_in_lot DECIMAL(10, 2),

  -- Additional Information
  reference VARCHAR(100),
  remarks TEXT,
  trailer_reg_number VARCHAR(50),
  driver_permit_number VARCHAR(50),
  board_number VARCHAR(50),

  -- Freight Company
  freight_company_number VARCHAR(50),
  freight_company_name VARCHAR(200),
  delivery_address TEXT,

  -- Freight Customer/Exporter
  customer_number VARCHAR(50),
  customer_name VARCHAR(200),
  customer_phone VARCHAR(20),

  -- Transporter
  transporter_number VARCHAR(50),
  transporter_name VARCHAR(200),
  transporter_phone VARCHAR(20),

  -- Driver
  driver_name VARCHAR(100),
  driver_id_number VARCHAR(50),
  driver_contact_number VARCHAR(20),

  -- Processing timestamps
  processed_at TIMESTAMP,
  processed_by VARCHAR(100),
  departed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_drivers_license_number ON drivers(license_number);
CREATE INDEX IF NOT EXISTS idx_drivers_id_number ON drivers(id_number);
CREATE INDEX IF NOT EXISTS idx_driver_documents_allocation_id ON driver_documents(allocation_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_parking_tickets_allocation_id ON parking_tickets(truck_allocation_id);
CREATE INDEX IF NOT EXISTS idx_parking_tickets_ticket_number ON parking_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_parking_tickets_status ON parking_tickets(status);
CREATE INDEX IF NOT EXISTS idx_parking_tickets_vehicle_reg ON parking_tickets(vehicle_reg);

COMMENT ON TABLE orders IS 'Main orders table containing all order information';
COMMENT ON TABLE planned_visits IS 'Truck allocations - planned visits linked to orders';
COMMENT ON TABLE visits IS 'Actual visits at sites (Lions Park or Bulk)';
COMMENT ON TABLE truck_allocations IS 'Simplified truck allocation tracking with vehicle and weight details';
COMMENT ON TABLE clients IS 'Customers placing orders';
COMMENT ON TABLE suppliers IS 'Suppliers fulfilling orders';
COMMENT ON TABLE transporters IS 'Transport companies moving goods';
COMMENT ON TABLE drivers IS 'Master driver records with license and induction details';
COMMENT ON TABLE driver_documents IS 'Uploaded driver documents with OCR results and verification status';
COMMENT ON TABLE parking_tickets IS 'Parking tickets generated for trucks checking in at Lions Park with comprehensive verification details';
