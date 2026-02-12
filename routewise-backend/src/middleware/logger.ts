import { Request, Response, NextFunction } from 'express';

/**
 * Request logger middleware
 * Logs all incoming requests with timing information
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Log request start
  console.log(`\n→ [${requestId}] ${req.method} ${req.path}`);
  if (Object.keys(req.query).length > 0) {
    console.log(`  Query: ${JSON.stringify(req.query)}`);
  }

  // Capture original send function
  const originalSend = res.send;

  // Override send to log response
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Determine log level based on status code and duration
    const emoji =
      statusCode >= 500 ? '❌' :
      statusCode >= 400 ? '⚠️' :
      duration > 1000 ? '🐢' :
      duration > 500 ? '⏱️' :
      '✅';

    console.log(`${emoji} [${requestId}] ${req.method} ${req.path} → ${statusCode} (${duration}ms)`);

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      console.warn(`⚠️  SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`);
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Performance metrics tracker
 * Tracks request counts and average response times per endpoint
 */
class PerformanceMetrics {
  private metrics: Map<string, {
    count: number;
    totalDuration: number;
    minDuration: number;
    maxDuration: number;
  }> = new Map();

  track(endpoint: string, duration: number) {
    const existing = this.metrics.get(endpoint);

    if (existing) {
      existing.count++;
      existing.totalDuration += duration;
      existing.minDuration = Math.min(existing.minDuration, duration);
      existing.maxDuration = Math.max(existing.maxDuration, duration);
    } else {
      this.metrics.set(endpoint, {
        count: 1,
        totalDuration: duration,
        minDuration: duration,
        maxDuration: duration,
      });
    }
  }

  getStats() {
    const stats: any[] = [];

    this.metrics.forEach((value, endpoint) => {
      stats.push({
        endpoint,
        requests: value.count,
        avgDuration: Math.round(value.totalDuration / value.count),
        minDuration: value.minDuration,
        maxDuration: value.maxDuration,
      });
    });

    // Sort by average duration (slowest first)
    stats.sort((a, b) => b.avgDuration - a.avgDuration);

    return stats;
  }

  reset() {
    this.metrics.clear();
  }
}

export const performanceMetrics = new PerformanceMetrics();

/**
 * Performance tracking middleware
 * Tracks metrics for each endpoint
 */
export function performanceTracker(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Capture original send function
  const originalSend = res.send;

  // Override send to track metrics
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;

    // Normalize endpoint (remove IDs and dynamic segments)
    const normalizedPath = req.path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid');

    const endpoint = `${req.method} ${normalizedPath}`;

    performanceMetrics.track(endpoint, duration);

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}
