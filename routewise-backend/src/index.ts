import dotenv from 'dotenv';
// Load environment variables immediately
dotenv.config();

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import ordersRoutes from './routes/orders';
import bulkOrdersRoutes from './routes/bulk-orders';
import referenceDataRoutes from './routes/reference-data';
import truckAllocationsRoutes from './routes/truck-allocations';
import operationsRoutes from './routes/operations';
import anprMockRoutes from './routes/anpr-mock';
import driverVerificationRoutes from './routes/driver-verification';
import parkingTicketsRoutes from './routes/parking-tickets';
import { anprCheckerService } from './services/anpr-checker';
import { requestLogger, performanceTracker, performanceMetrics } from './middleware/logger';
import { getCacheStats } from './utils/cache';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Performance stats endpoint
app.get('/api/stats/performance', async (req, res) => {
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
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Reset performance stats (for testing)
app.post('/api/stats/reset', (req, res) => {
  performanceMetrics.reset();
  res.json({
    success: true,
    message: 'Performance metrics reset successfully',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/bulk-orders', bulkOrdersRoutes);
app.use('/api/truck-allocations', truckAllocationsRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api', referenceDataRoutes);
app.use('/api/anpr-mock', anprMockRoutes);
app.use('/api/driver-verification', driverVerificationRoutes);
app.use('/api/parking-tickets', parkingTicketsRoutes);

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
