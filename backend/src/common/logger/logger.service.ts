import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as os from 'os';
import * as process from 'process';
import { CloudWatchTransport } from './cloudwatch-transport';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService implements LoggerService {
  private context?: string;
  private logger: winston.Logger;

  constructor(private readonly configService: ConfigService) {
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development',
    );
    const isProduction = environment === 'production';
    const serviceName = this.configService.get<string>(
      'SERVICE_NAME',
      'bingo-service',
    );

    // System information for better debugging
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: {
        total: Math.round(os.totalmem() / (1024 * 1024)) + 'MB',
        free: Math.round(os.freemem() / (1024 * 1024)) + 'MB',
      },
      cpus: os.cpus().length,
    };

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.metadata({
        fillExcept: ['timestamp', 'level', 'message', 'context', 'trace'],
      }),
      winston.format.json(),
    );

    // Create transports
    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(
            ({ timestamp, level, message, context, trace, ...meta }) => {
              return `${timestamp} [${level}] [${context || 'Application'}] ${message}${
                trace ? `\n${trace}` : ''
              }${Object.keys(meta).length ? `\n${JSON.stringify(meta)}` : ''}`;
            },
          ),
        ),
      }),
    ];

    // Check if running in AWS Lambda
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

    // Add CloudWatch transport when running in AWS Lambda
    if (isLambda) {
      const functionName =
        process.env.AWS_LAMBDA_FUNCTION_NAME || 'bingo-backend';
      const region = process.env.AWS_REGION || 'us-east-1';

      transports.push(
        new CloudWatchTransport({
          logGroupName: `/aws/lambda/${functionName}`,
          logStreamName: `${new Date().toISOString().split('T')[0]}-${process.pid}`,
          awsRegion: region,
          messageFormatter: (logEntry) => {
            // Format log entry for CloudWatch
            const { timestamp, level, message, context, trace, ...meta } =
              logEntry;
            return JSON.stringify({
              timestamp,
              level,
              context: context || 'Application',
              message,
              trace,
              ...meta,
            });
          },
        }),
      );
    }
    // Add file transports in production (non-Lambda)
    else if (isProduction) {
      // Application logs
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info',
        }),
      );

      // Error logs
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'error',
        }),
      );
    }

    // Create logger
    this.logger = winston.createLogger({
      level: isProduction ? 'info' : 'debug',
      format: logFormat,
      defaultMeta: {
        service: serviceName,
        environment,
        system: systemInfo,
        pid: process.pid,
      },
      transports,
      // Add exception and rejection handlers
      exceptionHandlers: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, trace, ...meta }) => {
                return `${timestamp} [${level}] [EXCEPTION] ${message}${
                  trace ? `\n${trace}` : ''
                }${Object.keys(meta).length ? `\n${JSON.stringify(meta)}` : ''}`;
              },
            ),
          ),
        }),
        ...(isProduction
          ? [
              new winston.transports.DailyRotateFile({
                filename: 'logs/exceptions-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '14d',
              }),
            ]
          : []),
      ],
      rejectionHandlers: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, trace, ...meta }) => {
                return `${timestamp} [${level}] [REJECTION] ${message}${
                  trace ? `\n${trace}` : ''
                }${Object.keys(meta).length ? `\n${JSON.stringify(meta)}` : ''}`;
              },
            ),
          ),
        }),
        ...(isProduction
          ? [
              new winston.transports.DailyRotateFile({
                filename: 'logs/rejections-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '14d',
              }),
            ]
          : []),
      ],
    });
  }

  setContext(context: string) {
    this.context = context;
    return this;
  }

  log(message: any, context?: string) {
    context = context || this.context;

    if (message instanceof Object) {
      const { message: msg, ...meta } = message;
      return this.logger.info(msg as string, { context, ...meta });
    }

    return this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    context = context || this.context;

    if (message instanceof Error) {
      // If it's an Error object, extract the message and stack
      const { message: msg, stack, name, code, ...meta } = message;

      // Add error type and code for better categorization
      const errorMeta = {
        errorType: name || 'Error',
        errorCode: code,
        ...meta,
      };

      return this.logger.error(msg, {
        context,
        trace: stack,
        ...errorMeta,
        // Add request ID if available
        requestId: (meta as any).requestId || undefined,
      });
    }

    if (message instanceof Object) {
      const { message: msg, ...meta } = message;
      return this.logger.error(msg as string, { context, trace, ...meta });
    }

    return this.logger.error(message, { context, trace });
  }

  /**
   * Log critical errors that require immediate attention
   */
  critical(message: any, trace?: string, context?: string) {
    context = context || this.context;

    // Log as error with critical flag
    if (message instanceof Error) {
      const { message: msg, stack, ...meta } = message;
      return this.logger.error(msg, {
        context,
        trace: stack,
        ...meta,
        critical: true,
        // Add timestamp for easier correlation
        timestamp: new Date().toISOString(),
      });
    }

    if (message instanceof Object) {
      const { message: msg, ...meta } = message;
      return this.logger.error(msg as string, {
        context,
        trace,
        ...meta,
        critical: true,
        timestamp: new Date().toISOString(),
      });
    }

    return this.logger.error(message, {
      context,
      trace,
      critical: true,
      timestamp: new Date().toISOString(),
    });
  }

  warn(message: any, context?: string) {
    context = context || this.context;

    if (message instanceof Object) {
      const { message: msg, ...meta } = message;
      return this.logger.warn(msg as string, { context, ...meta });
    }

    return this.logger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    context = context || this.context;

    if (message instanceof Object) {
      const { message: msg, ...meta } = message;
      return this.logger.debug(msg as string, { context, ...meta });
    }

    return this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    context = context || this.context;

    if (message instanceof Object) {
      const { message: msg, ...meta } = message;
      return this.logger.verbose(msg as string, { context, ...meta });
    }

    return this.logger.verbose(message, { context });
  }

  /**
   * Log a metric that can be used for CloudWatch metrics
   * @param metricName Name of the metric
   * @param value Numeric value of the metric
   * @param unit Unit of the metric (Count, Milliseconds, Bytes, etc.)
   * @param dimensions Additional dimensions for the metric
   */
  logMetric(
    metricName: string,
    value: number,
    unit: string = 'Count',
    dimensions: Record<string, string> = {},
  ) {
    // Format as a metric log that can be parsed by CloudWatch
    const metric = {
      metricName,
      value,
      unit,
      dimensions,
      timestamp: new Date().toISOString(),
    };

    // Log with special context for filtering
    this.logger.info(`METRIC: ${metricName}=${value}${unit}`, {
      context: 'Metrics',
      metric,
      // Add standard dimensions
      dimensions: {
        ...dimensions,
        Service: this.configService.get<string>(
          'SERVICE_NAME',
          'bingo-service',
        ),
        Environment: this.configService.get<string>('NODE_ENV', 'development'),
      },
    });
  }
}
