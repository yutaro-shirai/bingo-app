import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class DynamoDBService {
  private readonly client: DynamoDBClient;
  public readonly documentClient: DynamoDBDocumentClient;

  constructor(private readonly configService: ConfigService) {
    // Create the DynamoDB client
    this.client = new DynamoDBClient({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          '',
        ),
      },
      // Use local DynamoDB if endpoint is provided
      endpoint: this.configService.get<string>('DYNAMODB_ENDPOINT'),
    });

    // Create the DynamoDB document client
    this.documentClient = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
    });
  }
}
