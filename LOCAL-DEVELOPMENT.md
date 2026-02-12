# Local Development Setup

This guide will help you run the entire Weigh8 system locally for testing.

## System Components

- **Backend API** (routewise-backend) - Express.js API with PostgreSQL & Redis
- **Lions System** (mindrift-Lionspark-weigh8) - Next.js frontend for Lion Park
- **Bulks System** (weigh8-bulkconnections) - Next.js frontend for Bulk Connections
- **Orders System** (Mindrift-Orders) - Vite React frontend for Order Management

## Prerequisites

- Docker & Docker Compose installed
- Ports available: 3000, 3001, 3002, 5173, 5433, 6379

## Quick Start

### 1. Start All Services

From the root directory (`Weigh8-Mindrift-Latest`), run:

```bash
docker-compose up
```

This will start:
- PostgreSQL on port 5433
- Redis on port 6379
- Backend API on port 3001
- Lions frontend on port 3000
- Orders frontend on port 5173
- Bulks frontend on port 3002

### 2. Access the Applications

Once all containers are running:

- **Orders System**: http://localhost:5173
- **Lions System**: http://localhost:3000
- **Bulks System**: http://localhost:3002
- **Backend API**: http://localhost:3001

### 3. Test Excel Upload

1. Go to **Orders System** (http://localhost:5173)
2. Click the "New Order" button (top right)
3. You'll see tabs: Manual, Excel, OCR, PDF
4. Click on the **Excel** tab
5. Upload one of the test Excel files:
   - `DISPATCH TO DURBAN BULK CONNECTIONS-4.xlsx`
   - `Entity_EDSON RESOURCES (PTY) LTD.xlsx`
   - `Entity_Samancor Chrome Limited.xlsx`
6. The smart parser will:
   - Auto-detect the file format (Dispatch vs Standard)
   - Extract order information (customer, origin, destination, commodity)
   - Extract all truck allocations (vehicle reg, weights, driver, transporter)
   - Create 1 order + N truck allocations in the database
7. View the created order in the Orders list
8. Switch to Lions or Bulks system to see the same order data

## Development Commands

### Stop All Services
```bash
docker-compose down
```

### Stop and Remove All Data (Fresh Start)
```bash
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f mindrift-orders
docker-compose logs -f mindrift-lionspark
docker-compose logs -f weigh8-bulkconnections
```

### Rebuild After Code Changes
```bash
# Rebuild backend only
docker-compose up --build backend

# Rebuild all services
docker-compose up --build
```

## Database Access

### Connect to PostgreSQL
```bash
# Using psql
psql -h localhost -p 5433 -U postgres -d routewise_db
# Password: password

# Or using Docker exec
docker exec -it routewise-postgres psql -U postgres -d routewise_db
```

### Useful SQL Queries
```sql
-- View all orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;

-- View truck allocations
SELECT * FROM truck_allocations ORDER BY created_at DESC LIMIT 10;

-- View orders with their allocations
SELECT
  o.order_number,
  o.product,
  o.quantity,
  COUNT(ta.id) as truck_count
FROM orders o
LEFT JOIN truck_allocations ta ON ta.order_id = o.id
GROUP BY o.id, o.order_number, o.product, o.quantity
ORDER BY o.created_at DESC;
```

## Smart Parser Features

### Supported File Formats

#### 1. Dispatch Format
**Example**: `DISPATCH TO DURBAN BULK CONNECTIONS-4.xlsx`

Structure:
- Row 2: Site/Mine name
- Row 3: Customer name
- Row 4: Destination
- Row 12+: Column headers (Registration, Ticket, Gross, Tare, Nett, etc.)
- Row 13+: Truck data

The parser automatically:
- Extracts order-level info from rows 2-4
- Finds truck data starting row 13
- Maps flexible column names (handles "Registration", "Vehicle", "Reg No", etc.)
- Calculates total weight from all trucks
- Creates 1 order with multiple truck allocations

#### 2. Standard Format
**Example**: Generic Excel with just truck rows

Structure:
- Row 1: Headers
- Row 2+: Truck data with order info in each row

The parser:
- Extracts order info from first row
- Creates allocations for each truck
- Handles flexible column naming

### Extracted Data

**Order-level**:
- Order Number
- Product/Commodity
- Client Name
- Origin Address
- Destination Address
- Total Quantity (calculated from trucks)
- Unit (kg/tons)

**Truck Allocation-level**:
- Vehicle Registration
- Ticket Number
- Transporter/Haulier
- Gross Weight
- Tare Weight
- Net Weight
- Scheduled Date
- Driver Name (if available)
- Driver Phone (if available)
- Product Description

## Troubleshooting

### Port Already in Use
If you get "port already allocated" errors:

```bash
# Find and stop conflicting services
netstat -ano | findstr :3001
netstat -ano | findstr :5433

# Or change ports in docker-compose.yml
```

### Frontend Not Loading
1. Check if backend is healthy: http://localhost:3001/health
2. Check logs: `docker-compose logs -f backend`
3. Restart frontend: `docker-compose restart mindrift-orders`

### Database Connection Issues
1. Wait for PostgreSQL to be healthy (check logs)
2. Verify credentials in docker-compose.yml
3. Check migrations ran: `docker-compose logs postgres`

### Excel Upload Fails
1. Check backend logs: `docker-compose logs -f backend`
2. Verify file format matches expected structure
3. Look for parser output in logs (format detection, row counts)

## Architecture Notes

### New Hierarchical Model
```
orders (parent)
  ├─ id (primary key)
  ├─ order_number
  ├─ product
  ├─ quantity (total)
  └─ ...

truck_allocations (children)
  ├─ id
  ├─ order_id (foreign key → orders.id)
  ├─ vehicle_reg
  ├─ gross_weight
  ├─ tare_weight
  ├─ net_weight
  └─ ...
```

### Data Flow
```
Excel Upload → Smart Parser → Create Order → Create Allocations → Return Success
     ↓              ↓              ↓                ↓
  Frontend    Detect Format   DB Insert      DB Insert (N rows)
              Extract Data    (1 row)
```

### API Endpoints
- `POST /api/bulk-orders/excel-upload` - Upload Excel, creates order + allocations
- `POST /api/bulk-orders/import` - Legacy import (now detects if already imported)
- `GET /api/orders` - List all orders
- `GET /api/truck-allocations` - List all allocations

## Next Steps

1. **Test with Real Files**: Use actual Excel files from Entity, Dispatch, Samancor
2. **Verify Data Extraction**: Check all fields are captured correctly
3. **Cross-System Verification**: Ensure data appears in all 3 frontends
4. **Performance Testing**: Upload files with 50+ truck allocations
5. **Error Handling**: Test with malformed Excel files

## Production Deployment

Once local testing is complete, deploy to AWS using:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Ensure environment variables are updated for production in `docker-compose.prod.yml`.
