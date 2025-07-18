import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLoggerService } from '../logger/logger.service';

/**
 * Middleware to collect and log performance metrics for HTTP requests
 */
@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  private readonly logger: AppLoggerService;

  constructor(logger: AppLoggerService) {
    this.logger = logger.setContext('Metrics');
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Record start time
    const startTime = process.hrtime();

    // Add request ID for tracking
    const requestId =
      req.headers['x-request-id'] ||
      req.headers['x-correlation-id'] ||
      `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    req['requestId'] = requestId;

    // Log request start
    this.logger.debug(`Request started: ${req.method} ${req.originalUrl}`, {
      requestId,
      method: req.method,
      path: req.originalUrl,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    // Track response
    res.on('finish', () => {
      // Calculate duration
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const durationMs = seconds * 1000 + nanoseconds / 1000000;

      // Log metrics
      this.logger.logMetric('RequestDuration', durationMs, 'Milliseconds', {
        Path: req.path,
        Method: req.method,
        StatusCode: res.statusCode.toString(),
      });

      // Log additional metrics based on status code
      if (res.statusCode >= 400) {
        this.logger.logMetric('ErrorCount', 1, 'Count', {
          Path: req.path,
          Method: req.method,
          StatusCode: res.statusCode.toString(),
        });
      }

      // Log request completion
      const logLevel = res.statusCode >= 400 ? 'warn' : 'debug';
      this.logger[logLevel](
        `Request completed: ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(2)}ms`,
        {
          requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: durationMs.toFixed(2),
        },
      );
    });

    next();
  }
}
