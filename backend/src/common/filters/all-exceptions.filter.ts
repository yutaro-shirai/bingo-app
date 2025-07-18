import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AppLoggerService } from '../logger/logger.service';

/**
 * Global exception filter for all unhandled exceptions
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger: AppLoggerService;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    logger: AppLoggerService,
  ) {
    this.logger = logger.setContext('AllExceptionsFilter');
  }

  catch(exception: unknown, host: ArgumentsHost) {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    // Generate error ID for tracking
    const errorId = `err-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // Determine status code
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract error details
    const error = exception instanceof Error ? exception.name : 'Unknown Error';
    const message =
      exception instanceof Error
        ? exception.message
        : 'An unknown error occurred';
    const stack = exception instanceof Error ? exception.stack : undefined;

    // Log the error with critical flag for 500 errors
    if (httpStatus >= 500) {
      this.logger.critical(
        {
          message: `Unhandled exception: ${message}`,
          errorId,
          error,
          httpStatus,
        },
        stack,
      );

      // Log metric for unhandled errors
      this.logger.logMetric('UnhandledErrorCount', 1, 'Count', {
        ErrorType: error,
      });
    } else {
      this.logger.error(
        {
          message: `Exception: ${message}`,
          errorId,
          error,
          httpStatus,
        },
        stack,
      );
    }

    let request = {};
    try {
      // Try to get request details if available
      const req = ctx.getRequest();
      if (req) {
        request = {
          method: req.method,
          url: req.url,
          headers: this.sanitizeHeaders(req.headers),
          query: req.query,
          params: req.params,
          body: this.sanitizeBody(req.body),
        };
      }
    } catch (err) {
      // Ignore errors when getting request details
    }

    // Response body
    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      errorId,
      message:
        httpStatus === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Internal server error'
          : message,
    };

    try {
      httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
    } catch (err) {
      // If we can't send a response (e.g., in WebSocket context), just log the error
      this.logger.error(`Failed to send error response: ${err.message}`);
    }
  }

  /**
   * Remove sensitive information from request body
   */
  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'authorization',
      'key',
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Remove sensitive information from headers
   */
  private sanitizeHeaders(headers: any): any {
    if (!headers) return headers;

    const sanitized = { ...headers };

    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
