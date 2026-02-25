import dotenv from 'dotenv';
// Load environment variables immediately
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import ordersRoutes from './routes/orders';
import bulkOrdersRoutes from './routes/bulk-orders';
import referenceDataRoutes from './routes/reference-data';
import truckAllocationsRoutes from './routes/truck-allocations';
import operationsRoutes from './routes/operations';
import anprMockRoutes from './routes/anpr-mock';
import driverVerificationRoutes from './routes/driver-verification';
import parkingTicketsRoutes from './routes/parking-tickets';
import freightCompaniesRoutes from './routes/freight-companies';
import clientsRoutes from './routes/clients';
import transportersRoutes from './routes/transporters';
import driversRoutes from './routes/drivers';
import visitsRoutes from './routes/visits';
import siteJourneyRoutes from './routes/site-journey';
import internalWeighbridgeRoutes from './routes/internal-weighbridge';
import camerasRoutes from './routes/cameras';
import { anprCheckerService } from './services/anpr-checker';
import { requestLogger, performanceTracker, performanceMetrics } from './middleware/logger';
import { getCacheStats } from './utils/cache';
import { requireAuth, requireAdmin } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images from different origins (ANPR)
}));

// CORS — must have explicit origin list in production; never default to wildcard
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : false,
  credentials: true,
}));

// Cookie parser (must be before routes that read cookies)
app.use(cookieParser());

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again in 15 minutes.' },
  skipSuccessfulRequests: true,
});

app.use('/api', generalLimiter);

// Request logging and performance tracking
app.use(requestLogger);
app.use(performanceTracker);

// Root route - API info
app.get('/', (req, res) => {
  res.json({
    service: 'RouteWise Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      orders: '/api/orders/*',
    },
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'routewise-backend',
  });
});

// Performance stats endpoint — admin only
app.get('/api/stats/performance', requireAuth, requireAdmin, async (req, res) => {
  try {
    const perfStats = performanceMetrics.getStats();
    const cacheStats = await getCacheStats();

    res.json({
      success: true,
      data: {
        endpoints: perfStats,
        cache: cacheStats,
        summary: {
          totalEndpoints: perfStats.length,
          slowestEndpoint: perfStats[0]?.endpoint || 'N/A',
          slowestDuration: perfStats[0]?.avgDuration || 0,
          cacheConnected: cacheStats.connected,
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance stats',
    });
  }
});

// Reset performance stats — admin only
app.post('/api/stats/reset', requireAuth, requireAdmin, (req, res) => {
  performanceMetrics.reset();
  res.json({
    success: true,
    message: 'Performance metrics reset successfully',
  });
});

// Routes — auth limiter applied specifically to login
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/bulk-orders', bulkOrdersRoutes);
app.use('/api/truck-allocations', truckAllocationsRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api', referenceDataRoutes);
app.use('/api/anpr-mock', anprMockRoutes);
app.use('/api/driver-verification', driverVerificationRoutes);
app.use('/api/parking-tickets', parkingTicketsRoutes);
app.use('/api/freight-companies', freightCompaniesRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/transporters', transportersRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/visits', visitsRoutes);
app.use('/api/site-journey', siteJourneyRoutes);
app.use('/api/internal-weighbridge', internalWeighbridgeRoutes);
app.use('/api/cameras', camerasRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 RouteWise Backend API`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
  console.log(`📦 Orders endpoints: http://localhost:${PORT}/api/orders/*`);
  console.log(`\n⏳ Ready to accept requests...\n`);

  // Start ANPR service if enabled
  const enableANPR = process.env.ENABLE_ANPR_SERVICE !== 'false'; // Default: enabled
  const mockMode = process.env.ANPR_MOCK_MODE !== 'false'; // Default: mock mode

  if (enableANPR) {
    anprCheckerService.start(mockMode);
  } else {
    console.log('⚠️  ANPR service disabled (set ENABLE_ANPR_SERVICE=true to enable)\n');
  }
});
