# Weigh8 Platform - Logistics Management System

Multi-site logistics and weighbridge management platform for efficient truck tracking, order management, and site operations.

## 🏗️ System Architecture

**Monorepo containing 3 active applications:**
- **routewise-backend** - Shared Express.js REST API (serves all frontends)
- **mindrift-lionspark-weigh8** - Lions Park site-specific operations (Next.js)
- **weigh8-bulkconnections** - Bulk Connections central operations (Next.js)

## 🚀 Quick Start

### Prerequisites
- Docker Desktop
- Node.js 20+
- Git

### Launch All Services
```bash
docker-compose up
```

### Access Applications
- **Backend API**: http://localhost:3001
- **Lions Park Site**: http://localhost:3000
- **Bulk Connections**: http://localhost:3002
- **API Docs**: http://localhost:3001/health
- **Performance Stats**: http://localhost:3001/api/stats/performance

## 📦 Technology Stack

### Backend (Port 3001)
- **Runtime**: Node.js 20
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL 15 with Drizzle ORM
- **Cache**: Redis 7
- **Features**: 
  - REST API with 36 optimized indexes
  - Redis caching (5-min TTL, 9-15x faster)
  - Connection pooling (5-20 connections)
  - Request logging & performance tracking
  - ANPR auto check-in service

### Frontends (Next.js 16)
- **Lions Park** (Port 3000) - Site-specific view (Site ID: 1)
  - Order overview
  - Loading board (Kanban truck tracking)
  - Driver verification with OCR
  - Parking ticket management
  
- **Bulk Connections** (Port 3002) - Central operations
  - Excel order uploads (Navig8 format)
  - View ALL orders across sites
  - Truck allocation management

## ⚡ Performance Optimizations

**Phase 1 - Database & Architecture:**
- ✅ 36 database indexes (50-100x query speedup)
- ✅ Database-level filtering (no in-memory operations)
- ✅ Pagination (50 records default, configurable)
- ✅ Connection pooling (max 20, min 5, keepAlive enabled)

**Phase 2 - Caching & Monitoring:**
- ✅ Redis caching with intelligent invalidation
- ✅ Request logger middleware with timing
- ✅ Performance metrics tracking
- ✅ Cache stats endpoint

**Results:**
- Handles **100,000+ orders** with **50+ concurrent users**
- Orders API: 59ms → 4ms (**15x faster** with cache)
- Allocations API: 72ms → 8ms (**9x faster** with cache)
- Response times: <10ms (cached), <200ms (uncached)

## 🗄️ Database Schema

**Core Tables:**
- `tenants` - Multi-tenancy support
- `sites` - Physical locations (Lions Park, etc.)
- `orders` - Master order records
- `truck_allocations` - Individual truck assignments
- `clients`, `suppliers`, `transporters` - Business entities
- `drivers`, `driver_documents` - Driver management
- `parking_tickets` - Gate management

**Database Connection:**
- Host: `localhost`
- Port: `5433` (external), `5432` (Docker internal)
- Database: `routewise_db`
- User: `postgres`
- Password: See `.env` (never commit!)

## 🛠️ Development

### Run Individual Services

**Backend Only:**
```bash
cd routewise-backend
npm install
npm run dev
```

**Lions Park Frontend:**
```bash
cd mindrift-lionspark-weigh8
npm install
npm run dev
```

**Bulk Connections Frontend:**
```bash
cd weigh8-bulkconnections
npm install
npm run dev -- -p 3002
```

### Database Operations

```bash
cd routewise-backend

# Push schema changes
npm run db:push

# Open Drizzle Studio
npm run db:studio

# Generate migrations
npm run db:generate
```

## 📁 Project Structure

```
RouteWise-Bulk-Lionpark/
├── docker-compose.yml          # Orchestrates all services
├── init-db.sql                 # Database initialization
├── .gitignore                  # Git exclusions
├── README.md                   # This file
│
├── routewise-backend/          # Express.js API
│   ├── src/
│   │   ├── routes/            # API endpoints
│   │   ├── db/                # Database schema & connection
│   │   ├── middleware/        # Logger, auth, etc.
│   │   ├── services/          # ANPR checker service
│   │   └── utils/             # Cache helpers
│   ├── Dockerfile
│   ├── package.json
│   └── drizzle.config.ts
│
├── mindrift-lionspark-weigh8/  # Lions Park Next.js app
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   └── components/        # React components
│   ├── Dockerfile
│   └── package.json
│
└── weigh8-bulkconnections/     # Bulk Connections Next.js app
    ├── src/
    │   ├── app/               # Next.js App Router
    │   └── components/        # React components
    ├── Dockerfile
    └── package.json
```

## 🔐 Environment Variables

**Backend (`.env`):**
```env
NODE_ENV=production
PORT=3001
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<strong-password>
DB_NAME=routewise_db
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=<random-secret>
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:3000,http://localhost:3002
```

**Frontend (`.env.local`):**
```env
# Lions Park
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SITE_ID=1

# Bulk Connections (no SITE_ID - sees all sites)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🚢 Deployment

### Production Docker Compose

```bash
# Build production images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Environment Setup
1. Copy `.env.example` to `.env` in each service
2. Update database credentials
3. Generate secure JWT secret: `openssl rand -base64 32`
4. Set CORS origins to production domains
5. Run database initialization

## 📊 API Endpoints

**Core Endpoints:**
- `GET /health` - Health check
- `GET /api/orders` - Fetch orders (cached, paginated)
- `POST /api/orders/upload` - Upload orders via Excel
- `GET /api/truck-allocations` - Fetch allocations
- `PUT /api/truck-allocations/:id/status` - Update status
- `POST /api/bulk-orders/excel-upload` - Bulk upload
- `GET /api/stats/performance` - Performance metrics

**Request Examples:**
```bash
# Health check
curl http://localhost:3001/health

# Get orders (with cache)
curl http://localhost:3001/api/orders?page=1&limit=50

# Get site-specific orders
curl http://localhost:3001/api/orders?siteId=1&page=1

# Performance stats
curl http://localhost:3001/api/stats/performance
```

## 🧪 Testing

```bash
# Run backend tests
cd routewise-backend
npm test

# Run frontend tests
cd mindrift-lionspark-weigh8
npm test

# Check logs
docker-compose logs -f backend
docker logs routewise-backend
```

## 📈 Monitoring

**Performance Dashboard:**
```bash
curl http://localhost:3001/api/stats/performance | jq
```

**Cache Statistics:**
```bash
docker exec -it routewise-redis redis-cli INFO stats
```

**Database Queries:**
```bash
docker exec -it routewise-postgres psql -U postgres -d routewise_db
```

## 🤝 Contributing

### Branching Strategy
- `main` - Production code (protected)
- `develop` - Integration branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent fixes

### Commit Convention
```
feat: Add driver verification modal
fix: Resolve cache invalidation on order update
perf: Add indexes for truck allocations query
docs: Update deployment instructions
```

## 🔧 Troubleshooting

**Backend won't start:**
```bash
docker logs routewise-backend
docker-compose restart backend
```

**Database connection issues:**
```bash
docker logs routewise-postgres
docker exec -it routewise-postgres psql -U postgres -l
```

**Redis not connected:**
```bash
docker logs routewise-redis
docker exec -it routewise-redis redis-cli PING
```

**Port conflicts:**
```bash
# Check what's using ports
netstat -ano | findstr "3001 3000 3002 5433 6379"

# Update ports in docker-compose.yml if needed
```

## 📝 License

Proprietary - PCG Logistics Management

---

**Version**: 1.0.0  
**Last Updated**: 2026-02-12  
**Maintainer**: PCG Admin Team
