import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLoggerService } from '../logger/logger.service';

/**
 * Interceptor to collect and log performance metrics for WebSocket messages
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger: AppLoggerService;

  constructor(logger: AppLoggerService) {
    this.logger = logger.setContext('WebSocketMetrics');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = process.hrtime();
    const contextType = context.getType();

    // Only process WebSocket messages
    if (contextType !== 'ws') {
      return next.handle();
    }

    const client = context.switchToWs().getClient();
    const data = context.switchToWs().getData();

    // Extract message type for metrics
    const messageType = data?.type || 'unknown';
    const connectionId = client?.id || 'unknown';

    // Log message received
    this.logger.debug(`WebSocket message received: ${messageType}`, {
      messageType,
      connectionId,
      payload: data,
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Calculate duration
          const [seconds, nanoseconds] = process.hrtime(startTime);
          const durationMs = seconds * 1000 + nanoseconds / 1000000;

          // Log metrics
          this.logger.logMetric(
            'WebSocketMessageDuration',
            durationMs,
            'Milliseconds',
            {
              MessageType: messageType,
            },
          );

          // Log message processed
          this.logger.debug(
            `WebSocket message processed: ${messageType} ${durationMs.toFixed(2)}ms`,
            {
              messageType,
              connectionId,
              durationMs: durationMs.toFixed(2),
            },
          );
        },
        error: (error) => {
          // Calculate duration
          const [seconds, nanoseconds] = process.hrtime(startTime);
          const durationMs = seconds * 1000 + nanoseconds / 1000000;

          // Log error metrics
          this.logger.logMetric('WebSocketErrorCount', 1, 'Count', {
            MessageType: messageType,
            ErrorType: error.name || 'Error',
          });

          // Log error
          this.logger.error(
            `WebSocket message error: ${messageType} ${error.message}`,
            {
              messageType,
              connectionId,
              durationMs: durationMs.toFixed(2),
              error: {
                message: error.message,
                stack: error.stack,
                name: error.name,
              },
            },
          );
        },
      }),
    );
  }
}
