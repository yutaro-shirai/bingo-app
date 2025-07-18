import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AppLoggerService } from '../logger/logger.service';

/**
 * Exception filter for WebSocket exceptions
 */
@Catch(WsException, HttpException, Error)
export class WsExceptionFilter implements ExceptionFilter {
  private readonly logger: AppLoggerService;

  constructor(logger: AppLoggerService) {
    this.logger = logger.setContext('WsExceptionFilter');
  }

  catch(exception: WsException | HttpException | Error, host: ArgumentsHost) {
    const client = host.switchToWs().getClient() as Socket;
    
    // Generate error ID for tracking
    const errorId = `err-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Extract error details
    let error: string;
    let message: string;
    let statusCode: number;
    
    if (exception instanceof WsException) {
      const exceptionData = exception.getError();
      
      if (typeof exceptionData === 'object') {
        error = (exceptionData as any).error || 'WsException';
        message = (exceptionData as any).message || 'WebSocket error';
        statusCode = (exceptionData as any).statusCode || HttpStatus.BAD_REQUEST;
      } else {
        error = 'WsException';
        message = exceptionData as string;
        statusCode = HttpStatus.BAD_REQUEST;
      }
    } else if (exception instanceof HttpException) {
      const response = exception.getResponse();
      
      if (typeof response === 'object') {
        error = (response as any).error || 'HttpException';
        message = (response as any).message || exception.message;
      } else {
        error = 'HttpException';
        message = exception.message;
      }
      
      statusCode = exception.getStatus();
    } else {
      error = exception.name || 'Error';
      message = exception.message || 'Internal server error';
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    }
    
    // Log the error
    const logContext = {
      errorId,
      clientId: client.id,
      handshake: {
        headers: client.handshake.headers,
        query: client.handshake.query,
        auth: client.handshake.auth,
      },
      statusCode,
    };
    
    // Log with appropriate level based on status code
    if (statusCode >= 500) {
      this.logger.error(
        { message: `${error}: ${message}`, ...logContext },
        exception.stack,
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        { message: `${error}: ${message}`, ...logContext },
      );
    } else {
      this.logger.log(
        { message: `${error}: ${message}`, ...logContext },
      );
    }
    
    // Send error to client
    client.emit('exception', {
      status: statusCode,
      message,
      error,
      errorId,
      timestamp: new Date().toISOString(),
    });
  }
}