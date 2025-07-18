import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/logger.service';

/**
 * Exception filter for HTTP exceptions
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger: AppLoggerService;

  constructor(logger: AppLoggerService) {
    this.logger = logger.setContext('HttpExceptionFilter');
  }

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    
    // Generate error ID for tracking
    const errorId = `err-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Get request ID if available
    const requestId = request['requestId'] || 
                      request.headers['x-request-id'] || 
                      request.headers['x-correlation-id'];
    
    // Extract error details
    const exceptionResponse = exception.getResponse();
    let error: string;
    let message: string | string[];
    
    if (typeof exceptionResponse === 'object') {
      error = (exceptionResponse as any).error || 'HttpException';
      message = (exceptionResponse as any).message || exception.message;
    } else {
      error = 'HttpException';
      message = exception.message;
    }
    
    // Log the error
    const logContext = {
      errorId,
      requestId,
      method: request.method,
      url: request.url,
      query: request.query,
      params: request.params,
      body: this.sanitizeBody(request.body),
      headers: this.sanitizeHeaders(request.headers),
      statusCode: status,
    };
    
    // Log with appropriate level based on status code
    if (status >= 500) {
      this.logger.error(
        { message: `${error}: ${message}`, ...logContext },
        exception.stack,
      );
      
      // Log metric for server errors
      this.logger.logMetric('ServerErrorCount', 1, 'Count', {
        Path: request.path,
        Method: request.method,
        StatusCode: status.toString(),
      });
    } else if (status >= 400) {
      this.logger.warn(
        { message: `${error}: ${message}`, ...logContext },
      );
      
      // Log metric for client errors
      this.logger.logMetric('ClientErrorCount', 1, 'Count', {
        Path: request.path,
        Method: request.method,
        StatusCode: status.toString(),
      });
    } else {
      this.logger.log(
        { message: `${error}: ${message}`, ...logContext },
      );
    }
    
    // Send error response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error,
      message,
      errorId,
    });
  }
  
  /**
   * Remove sensitive information from request body
   */
  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'key'];
    
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