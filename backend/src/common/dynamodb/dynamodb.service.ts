import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Service for managing DynamoDB connections with connection pooling
 */
@Injectable()
export class DynamoDBService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DynamoDBService.name);
  private client: DynamoDBClient;
  private _documentClient: DynamoDBDocumentClient;

  // Connection pool settings
  private readonly maxConnections: number = 50;
  private readonly connectionTimeout: number = 5000; // 5 seconds
  private readonly idleConnectionTimeout: number = 60000; // 60 seconds

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initialize DynamoDB client on module init
   */
  async onModuleInit() {
    this.logger.log('Initializing DynamoDB service');

    try {
      await this.initializeClient();
      this.logger.log('DynamoDB service initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to initialize DynamoDB service: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Clean up resources on module destroy
   */
  async onModuleDestroy() {
    this.logger.log('Destroying DynamoDB service');

    try {
      await this.client.destroy();
      this.logger.log('DynamoDB service destroyed successfully');
    } catch (error) {
      this.logger.error(`Error destroying DynamoDB service: ${error.message}`);
    }
  }

  /**
   * Initialize DynamoDB client with connection pooling
   */
  private async initializeClient() {
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    const endpoint = this.configService.get<string>('DYNAMODB_ENDPOINT');

    const clientConfig: any = {
      region,
      maxAttempts: 3,
      requestHandler: {
        connectionTimeout: this.connectionTimeout,
        socketTimeout: this.connectionTimeout,
      },
      // Connection pooling configuration
      httpOptions: {
        agent: {
          keepAlive: true,
          maxSockets: this.maxConnections,
          keepAliveMsecs: this.idleConnectionTimeout,
        },
      },
    };

    // Use local endpoint for development if configured
    if (endpoint) {
      clientConfig.endpoint = endpoint;

      // For local development, we can use fake credentials
      if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
        clientConfig.credentials = {
          accessKeyId: 'local',
          secretAccessKey: 'local',
        };
      }
    }

    this.client = new DynamoDBClient(clientConfig);

    // Create document client with optimized marshalling
    this._documentClient = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: {
        // Remove undefined values
        removeUndefinedValues: true,
        // Convert empty strings, blobs, and sets to null
        convertEmptyValues: true,
        // Convert JS dates to ISO-8601 strings
        convertClassInstanceToMap: true,
      },
      unmarshallOptions: {
        // Convert DynamoDB numbers to JS numbers instead of strings
        wrapNumbers: false,
      },
    });
  }

  /**
   * Get the DynamoDB document client
   */
  get documentClient(): DynamoDBDocumentClient {
    return this._documentClient;
  }

  /**
   * Get the raw DynamoDB client
   */
  get rawClient(): DynamoDBClient {
    return this.client;
  }
}
