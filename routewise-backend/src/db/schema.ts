import { pgTable, serial, varchar, text, decimal, timestamp, boolean, integer, jsonb, index } from 'drizzle-orm/pg-core';

// Tenants table
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  tenantName: varchar('tenant_name', { length: 100 }).notNull().unique(),
  domain: varchar('domain', { length: 100 }),
  isActive: boolean('is_active').default(true),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 100 }),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  isActive: boolean('is_active').default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Sites table
export const sites = pgTable('sites', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull(),
  siteName: varchar('site_name', { length: 100 }).notNull(),
  siteType: varchar('site_type', { length: 20 }).notNull(), // lions_park, bulk, mine, other
  address: text('address'),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Freight Companies table (Bulk Connections, Bidvest Port Operations, etc.)
export const freightCompanies = pgTable('freight_companies', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull(),
  siteId: integer('site_id').references(() => sites.id),
  name: varchar('name', { length: 200 }).notNull(),
  code: varchar('code', { length: 50 }),
  contactPerson: varchar('contact_person', { length: 100 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Clients table
export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull(),
  siteId: integer('site_id').references(() => sites.id),
  name: varchar('name', { length: 200 }).notNull(),
  code: varchar('code', { length: 50 }),
  contactPerson: varchar('contact_person', { length: 100 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Suppliers table
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  code: varchar('code', { length: 50 }),
  contactPerson: varchar('contact_person', { length: 100 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  products: jsonb('products').default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Transporters table
export const transporters = pgTable('transporters', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull(),
  siteId: integer('site_id').references(() => sites.id),
  name: varchar('name', { length: 200 }).notNull(),
  code: varchar('code', { length: 50 }),
  contactPerson: varchar('contact_person', { length: 100 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Orders table
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  clientId: integer('client_id').references(() => clients.id),
  clientName: varchar('client_name', { length: 200 }), // Direct client name from Excel
  supplierId: integer('supplier_id').references(() => suppliers.id),
  transporterId: integer('transporter_id').references(() => transporters.id),

  // Product details
  product: varchar('product', { length: 200 }).notNull(),
  productCode: varchar('product_code', { length: 50 }),
  description: text('description'),
  quantity: decimal('quantity', { precision: 12, scale: 3 }),
  unit: varchar('unit', { length: 10 }).default('kg'),
  expectedWeight: decimal('expected_weight', { precision: 10, scale: 2 }),

  // Locations
  originAddress: text('origin_address').notNull(),
  destinationAddress: text('destination_address').notNull(),
  originSiteId: integer('origin_site_id').references(() => sites.id),
  destinationSiteId: integer('destination_site_id').references(() => sites.id),

  // Scheduling
  requestedPickupDate: timestamp('requested_pickup_date'),
  requestedDeliveryDate: timestamp('requested_delivery_date'),
  actualPickupDate: timestamp('actual_pickup_date'),
  actualDeliveryDate: timestamp('actual_delivery_date'),

  // Pricing
  agreedRate: decimal('agreed_rate', { precision: 10, scale: 2 }),
  rateUnit: varchar('rate_unit', { length: 20 }).default('per_kg'),
  additionalCharges: decimal('additional_charges', { precision: 10, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),

  // Status
  status: varchar('status', { length: 20 }).default('pending'),
  priority: varchar('priority', { length: 20 }).default('normal'),

  // Additional info
  specialInstructions: text('special_instructions'),
  notes: text('notes'),
  requiresPermit: boolean('requires_permit').default(false),
  hazardousMaterial: boolean('hazardous_material').default(false),
  temperatureControlled: boolean('temperature_controlled').default(false),

  // References
  referenceNumber: varchar('reference_number', { length: 100 }),
  purchaseOrderNumber: varchar('purchase_order_number', { length: 100 }),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  // Indexes for performance optimization
  tenantIdx: index('orders_tenant_idx').on(table.tenantId),
  statusIdx: index('orders_status_idx').on(table.status),
  orderNumIdx: index('orders_number_idx').on(table.orderNumber),
  createdIdx: index('orders_created_idx').on(table.createdAt),
  clientIdx: index('orders_client_idx').on(table.clientId),
  destinationSiteIdx: index('orders_destination_site_idx').on(table.destinationSiteId),
  originSiteIdx: index('orders_origin_site_idx').on(table.originSiteId),
  // Composite indexes for common query patterns
  tenantStatusIdx: index('orders_tenant_status_idx').on(table.tenantId, table.status),
  tenantSiteIdx: index('orders_tenant_site_idx').on(table.tenantId, table.destinationSiteId),
  tenantCreatedIdx: index('orders_tenant_created_idx').on(table.tenantId, table.createdAt),
}));

// Planned Visits (Truck Allocations) table
export const plannedVisits = pgTable('planned_visits', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull(),
  siteId: integer('site_id').references(() => sites.id),
  orderId: integer('order_id').references(() => orders.id),

  // Truck & Driver info
  plateNumber: varchar('plate_number', { length: 20 }).notNull(),
  trailer1PlateNumber: varchar('trailer1_plate_number', { length: 20 }),
  trailer2PlateNumber: varchar('trailer2_plate_number', { length: 20 }),
  driverName: varchar('driver_name', { length: 100 }).notNull(),
  driverId: varchar('driver_id', { length: 50 }),
  driverPhone: varchar('driver_phone', { length: 20 }),
  driverPermit: varchar('driver_permit', { length: 50 }),
  permitExpiryDate: timestamp('permit_expiry_date', { mode: 'date' }),
  transporterName: varchar('transporter_name', { length: 100 }),

  // Product info
  orderExternalId: varchar('order_external_id', { length: 100 }),
  product: varchar('product', { length: 100 }),
  expectedWeight: varchar('expected_weight', { length: 20 }),

  // Scheduling
  scheduledArrival: timestamp('scheduled_arrival').notNull(),
  estimatedArrival: timestamp('estimated_arrival'),
  actualArrival: timestamp('actual_arrival'),
  departureTime: timestamp('departure_time'),

  // Status
  status: varchar('status', { length: 20 }).default('scheduled'),
  priority: varchar('priority', { length: 20 }).default('normal'),

  // Additional info
  specialInstructions: text('special_instructions'),
  contactInfo: varchar('contact_info', { length: 200 }),

  // Tracking
  visitId: integer('visit_id'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  // Indexes for performance optimization
  tenantIdx: index('visits_tenant_idx').on(table.tenantId),
  siteIdx: index('visits_site_idx').on(table.siteId),
  orderIdx: index('visits_order_idx').on(table.orderId),
  statusIdx: index('visits_status_idx').on(table.status),
  plateIdx: index('visits_plate_idx').on(table.plateNumber),
  scheduledIdx: index('visits_scheduled_idx').on(table.scheduledArrival),
  // Composite indexes
  tenantSiteIdx: index('visits_tenant_site_idx').on(table.tenantId, table.siteId),
  tenantStatusIdx: index('visits_tenant_status_idx').on(table.tenantId, table.status),
}));

// Truck Allocations table
export const truckAllocations = pgTable('truck_allocations', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull(),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  siteId: integer('site_id').references(() => sites.id),

  // Vehicle details
  vehicleReg: varchar('vehicle_reg', { length: 50 }).notNull(),
  driverName: varchar('driver_name', { length: 100 }),
  driverPhone: varchar('driver_phone', { length: 20 }),
  driverId: varchar('driver_id', { length: 50 }),

  // Weight information
  grossWeight: decimal('gross_weight', { precision: 10, scale: 2 }),
  tareWeight: decimal('tare_weight', { precision: 10, scale: 2 }),
  netWeight: decimal('net_weight', { precision: 10, scale: 2 }),

  // Reference and scheduling
  ticketNo: varchar('ticket_no', { length: 50 }),
  scheduledDate: timestamp('scheduled_date'),
  actualArrival: timestamp('actual_arrival'),
  departureTime: timestamp('departure_time'),

  // Transporter
  transporter: varchar('transporter', { length: 200 }),

  // Status tracking
  status: varchar('status', { length: 20 }).default('scheduled'), // scheduled, in_transit, arrived, weighing, completed, cancelled
  driverValidationStatus: varchar('driver_validation_status', { length: 30 }).default('pending_verification'), // pending_verification, verified, rejected

  // Additional info
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  // Indexes for performance optimization
  tenantIdx: index('allocations_tenant_idx').on(table.tenantId),
  orderIdx: index('allocations_order_idx').on(table.orderId),
  siteIdx: index('allocations_site_idx').on(table.siteId),
  statusIdx: index('allocations_status_idx').on(table.status),
  vehicleIdx: index('allocations_vehicle_idx').on(table.vehicleReg),
  scheduledIdx: index('allocations_scheduled_idx').on(table.scheduledDate),
  // Composite indexes for common query patterns
  tenantOrderIdx: index('allocations_tenant_order_idx').on(table.tenantId, table.orderId),
  tenantSiteIdx: index('allocations_tenant_site_idx').on(table.tenantId, table.siteId),
  tenantStatusIdx: index('allocations_tenant_status_idx').on(table.tenantId, table.status),
}));

// Allocation Site Journey table - tracks truck journey across multiple sites
export const allocationSiteJourney = pgTable('allocation_site_journey', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull(),

  // References
  allocationId: integer('allocation_id').references(() => truckAllocations.id).notNull(),
  orderId: integer('order_id').references(() => orders.id),
  siteId: integer('site_id').references(() => sites.id).notNull(), // Which site this status applies to

  // Vehicle info (denormalized for performance)
  vehicleReg: varchar('vehicle_reg', { length: 50 }).notNull(),
  driverName: varchar('driver_name', { length: 100 }),

  // Journey tracking
  eventType: varchar('event_type', { length: 20 }).notNull(), // 'arrival', 'departure', 'check_in', 'check_out'
  status: varchar('status', { length: 20 }).notNull(), // 'scheduled', 'arrived', 'departed', 'completed'
  timestamp: timestamp('timestamp').defaultNow().notNull(),

  // Detection method
  detectionMethod: varchar('detection_method', { length: 20 }), // 'anpr_auto', 'manual_upload', 'manual_entry', 'system'
  detectionSource: varchar('detection_source', { length: 100 }), // camera name, user, etc.

  // Optional data
  notes: text('notes'),
  metadata: jsonb('metadata'), // Store additional context (OCR confidence, image path, etc.)

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  // Indexes for performance
  allocationIdx: index('journey_allocation_idx').on(table.allocationId),
  siteIdx: index('journey_site_idx').on(table.siteId),
  vehicleIdx: index('journey_vehicle_idx').on(table.vehicleReg),
  timestampIdx: index('journey_timestamp_idx').on(table.timestamp),
  statusIdx: index('journey_status_idx').on(table.status),
  // Composite indexes for common queries
  allocationSiteIdx: index('journey_allocation_site_idx').on(table.allocationId, table.siteId),
  tenantSiteIdx: index('journey_tenant_site_idx').on(table.tenantId, table.siteId),
  tenantStatusIdx: index('journey_tenant_status_idx').on(table.tenantId, table.status),
  // For latest status per site queries
  siteStatusTimestampIdx: index('journey_site_status_timestamp_idx').on(table.siteId, table.status, table.timestamp),
}));

// Type exports
export type Tenant = typeof tenants.$inferSelect;
// Drivers master table
export const drivers = pgTable('drivers', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull(),

  // Personal info
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),

  // License details
  licenseNumber: varchar('license_number', { length: 50 }),
  licenseClass: varchar('license_class', { length: 20 }),
  licenseExpiry: timestamp('license_expiry'),

  // ID details
  idNumber: varchar('id_number', { length: 50 }),
  passportNumber: varchar('passport_number', { length: 50 }),

  // Induction tracking
  inductionCompleted: boolean('induction_completed').default(false),
  inductionAt: timestamp('induction_at'),
  inductionRef: varchar('induction_ref', { length: 100 }),

  // Cutler permit (National Key Point permit)
  cutlerPermitNumber: varchar('cutler_permit_number', { length: 50 }),
  cutlerPermitExpiry: timestamp('cutler_permit_expiry'),
  boardNumber: varchar('board_number', { length: 50 }),

  // Optional associations
  transporterId: integer('transporter_id').references(() => transporters.id),
  employeeId: varchar('employee_id', { length: 50 }),

  // Audit fields
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Driver documents table
export const driverDocuments = pgTable('driver_documents', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID
  tenantId: varchar('tenant_id', { length: 50 }).notNull(),

  // Relationships
  allocationId: integer('allocation_id').references(() => truckAllocations.id),
  driverId: integer('driver_id').references(() => drivers.id),

  // Document metadata
  documentType: varchar('document_type', { length: 50 }).notNull(), // 'license', 'id', 'passport', 'permit', 'other'
  filePath: text('file_path').notNull(), // Local file system path
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileSize: integer('file_size'), // Size in bytes
  mimeType: varchar('mime_type', { length: 100 }),

  // OCR results
  ocrStatus: varchar('ocr_status', { length: 50 }).default('pending'), // 'pending', 'processing', 'success', 'failed'
  ocrText: text('ocr_text'), // Raw OCR output
  extractedFields: jsonb('extracted_fields').$type<{
    licenseNumber?: string;
    name?: string;
    dateOfBirth?: string;
    expiryDate?: string;
    country?: string;
    idNumber?: string;
    confidence?: number;
  }>(),
  parsedConfidence: integer('parsed_confidence'), // 0-100 percentage

  // Verification
  verificationStatus: varchar('verification_status', { length: 50 }).default('pending'), // 'pending', 'verified', 'rejected'
  verifiedBy: varchar('verified_by', { length: 100 }),
  verifiedAt: timestamp('verified_at'),
  verificationNotes: text('verification_notes'),

  // Audit
  uploadedBy: varchar('uploaded_by', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Parking Tickets table
export const parkingTickets = pgTable('parking_tickets', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull(),
  truckAllocationId: integer('truck_allocation_id').references(() => truckAllocations.id), // Nullable - can be null for non-matched visits
  visitId: integer('visit_id').references(() => plannedVisits.id), // For non-matched visits

  // Ticket identification
  ticketNumber: varchar('ticket_number', { length: 50 }).notNull().unique(), // Format: PT-YYYY-NNNNNN

  // Arrival information
  arrivalDatetime: timestamp('arrival_datetime').notNull().defaultNow(),
  personOnDuty: varchar('person_on_duty', { length: 100 }), // User who checked in the truck
  terminalNumber: varchar('terminal_number', { length: 10 }).default('1'),

  // Vehicle information
  vehicleReg: varchar('vehicle_reg', { length: 50 }).notNull(),
  anprImagePath: text('anpr_image_path'), // Path to ANPR photo if available

  // Status tracking
  status: varchar('status', { length: 20 }).default('pending'), // pending, processed, departed
  hoursInLot: decimal('hours_in_lot', { precision: 10, scale: 2 }), // Calculated from arrival to departure

  // Additional Information section
  reference: varchar('reference', { length: 100 }), // Order number or stock number
  remarks: text('remarks'), // Booked / Not booked / Other notes
  trailerRegNumber: varchar('trailer_reg_number', { length: 50 }),
  driverPermitNumber: varchar('driver_permit_number', { length: 50 }), // Cutler number (National Key Point permit)
  boardNumber: varchar('board_number', { length: 50 }), // Harbor permit board number

  // Freight Company section
  freightCompanyNumber: varchar('freight_company_number', { length: 50 }),
  freightCompanyName: varchar('freight_company_name', { length: 200 }), // Bulk Connections or Bidvest Port Operations
  deliveryAddress: text('delivery_address'),

  // Freight Customer/Exporter section
  customerNumber: varchar('customer_number', { length: 50 }),
  customerName: varchar('customer_name', { length: 200 }),
  customerPhone: varchar('customer_phone', { length: 20 }),

  // Transporter section
  transporterNumber: varchar('transporter_number', { length: 50 }),
  transporterName: varchar('transporter_name', { length: 200 }),
  transporterPhone: varchar('transporter_phone', { length: 20 }),

  // Driver section
  driverName: varchar('driver_name', { length: 100 }),
  driverIdNumber: varchar('driver_id_number', { length: 50 }),
  driverContactNumber: varchar('driver_contact_number', { length: 20 }),

  // Timestamps
  processedAt: timestamp('processed_at'), // When ticket was processed/verified
  processedBy: varchar('processed_by', { length: 100 }), // User who processed the ticket
  departedAt: timestamp('departed_at'), // When vehicle departed

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Site = typeof sites.$inferSelect;
export type FreightCompany = typeof freightCompanies.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Transporter = typeof transporters.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type PlannedVisit = typeof plannedVisits.$inferSelect;
export type TruckAllocation = typeof truckAllocations.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type DriverDocument = typeof driverDocuments.$inferSelect;
export type AllocationSiteJourney = typeof allocationSiteJourney.$inferSelect;

export type NewOrder = typeof orders.$inferInsert;
export type NewFreightCompany = typeof freightCompanies.$inferInsert;
export type NewClient = typeof clients.$inferInsert;
export type NewSupplier = typeof suppliers.$inferInsert;
export type NewTransporter = typeof transporters.$inferInsert;
export type NewTruckAllocation = typeof truckAllocations.$inferInsert;
export type NewDriver = typeof drivers.$inferInsert;
export type NewDriverDocument = typeof driverDocuments.$inferInsert;
export type NewAllocationSiteJourney = typeof allocationSiteJourney.$inferInsert;
export type ParkingTicket = typeof parkingTickets.$inferSelect;
export type NewParkingTicket = typeof parkingTickets.$inferInsert;
