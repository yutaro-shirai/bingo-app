import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBService } from '../../common/dynamodb/dynamodb.service';
import { GameEntity } from '../entities/game.entity';
import { IGameRepository } from './game.repository.interface';
import { GameStatus } from '../../../shared/types';

@Injectable()
export class GameRepository implements IGameRepository {
  private readonly logger = new Logger(GameRepository.name);
  private readonly tableName: string;

  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly configService: ConfigService,
  ) {
    this.tableName = this.configService.get<string>(
      'DYNAMODB_GAMES_TABLE',
      'games',
    );
  }

  async findById(id: string): Promise<GameEntity | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { id },
      });

      const response = await this.dynamoDBService.documentClient.send(command);
      return (response.Item as GameEntity) || null;
    } catch (error) {
      this.logger.error(
        `Error finding game by ID: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async findByCode(code: string): Promise<GameEntity | null> {
    try {
      // Using a query with a GSI (Global Secondary Index) on the code field
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'CodeIndex',
        KeyConditionExpression: 'code = :code',
        ExpressionAttributeValues: {
          ':code': code,
        },
        Limit: 1,
      });

      const response = await this.dynamoDBService.documentClient.send(command);
      return (response.Items?.[0] as GameEntity) || null;
    } catch (error) {
      this.logger.error(
        `Error finding game by code: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async create(game: GameEntity): Promise<GameEntity> {
    try {
      // Convert Date objects to ISO strings for DynamoDB
      const gameItem = this.convertDatesToIsoStrings(game);

      // Add TTL attribute for DynamoDB
      const ttlAttribute = Math.floor(game.expiresAt.getTime() / 1000);

      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          ...gameItem,
          ttl: ttlAttribute, // TTL attribute for DynamoDB
        },
      });

      await this.dynamoDBService.documentClient.send(command);
      return game;
    } catch (error) {
      this.logger.error(`Error creating game: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, game: Partial<GameEntity>): Promise<GameEntity> {
    try {
      // Convert Date objects to ISO strings for DynamoDB
      const gameUpdates = this.convertDatesToIsoStrings(game);

      // Build update expression and attribute values
      const {
        updateExpression,
        expressionAttributeValues,
        expressionAttributeNames,
      } = this.buildUpdateExpression(gameUpdates);

      if (!updateExpression) {
        throw new Error('No valid fields to update');
      }

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ReturnValues: 'ALL_NEW',
      });

      const response = await this.dynamoDBService.documentClient.send(command);

      if (!response.Attributes) {
        throw new NotFoundException(`Game with ID ${id} not found`);
      }

      return this.convertIsoStringsToDates(response.Attributes as GameEntity);
    } catch (error) {
      this.logger.error(`Error updating game: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: { id },
      });

      await this.dynamoDBService.documentClient.send(command);
    } catch (error) {
      this.logger.error(`Error deleting game: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByStatus(status: GameStatus): Promise<GameEntity[]> {
    try {
      // Using a query with a GSI on the status field
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'StatusIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
        },
      });

      const response = await this.dynamoDBService.documentClient.send(command);
      return ((response.Items as GameEntity[]) || []).map((item) =>
        this.convertIsoStringsToDates(item),
      );
    } catch (error) {
      this.logger.error(
        `Error finding games by status: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  async addDrawnNumber(id: string, number: number): Promise<GameEntity> {
    try {
      const now = new Date();

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression:
          'SET drawnNumbers = list_append(drawnNumbers, :number), lastDrawnAt = :now',
        ExpressionAttributeValues: {
          ':number': [number],
          ':now': now.toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      });

      const response = await this.dynamoDBService.documentClient.send(command);

      if (!response.Attributes) {
        throw new NotFoundException(`Game with ID ${id} not found`);
      }

      return this.convertIsoStringsToDates(response.Attributes as GameEntity);
    } catch (error) {
      this.logger.error(
        `Error adding drawn number: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateExpiration(id: string, expiresAt: Date): Promise<GameEntity> {
    try {
      const ttlAttribute = Math.floor(expiresAt.getTime() / 1000);

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: 'SET expiresAt = :expiresAt, ttl = :ttl',
        ExpressionAttributeValues: {
          ':expiresAt': expiresAt.toISOString(),
          ':ttl': ttlAttribute,
        },
        ReturnValues: 'ALL_NEW',
      });

      const response = await this.dynamoDBService.documentClient.send(command);

      if (!response.Attributes) {
        throw new NotFoundException(`Game with ID ${id} not found`);
      }

      return this.convertIsoStringsToDates(response.Attributes as GameEntity);
    } catch (error) {
      this.logger.error(
        `Error updating expiration: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateAdminConnection(
    id: string,
    connectionId: string,
    isConnected: boolean,
  ): Promise<GameEntity> {
    try {
      let updateExpression: string;
      let expressionAttributeValues: Record<string, any>;

      if (isConnected) {
        // Add connection ID if not already in the list
        updateExpression =
          'SET adminConnections = list_append(adminConnections, :connectionId)';
        expressionAttributeValues = {
          ':connectionId': [connectionId],
        };
      } else {
        // Remove connection ID from the list
        // This is more complex and requires a separate approach
        // First, get the current list
        const game = await this.findById(id);
        if (!game) {
          throw new NotFoundException(`Game with ID ${id} not found`);
        }

        // Filter out the connection ID
        const updatedConnections = game.adminConnections.filter(
          (conn) => conn !== connectionId,
        );

        // Update with the new list
        updateExpression = 'SET adminConnections = :connections';
        expressionAttributeValues = {
          ':connections': updatedConnections,
        };
      }

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });

      const response = await this.dynamoDBService.documentClient.send(command);

      if (!response.Attributes) {
        throw new NotFoundException(`Game with ID ${id} not found`);
      }

      return this.convertIsoStringsToDates(response.Attributes as GameEntity);
    } catch (error) {
      this.logger.error(
        `Error updating admin connection: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async incrementPlayerCount(id: string, active: boolean): Promise<GameEntity> {
    try {
      let updateExpression = 'SET playerCount = playerCount + :one';
      const expressionAttributeValues: Record<string, any> = {
        ':one': 1,
      };

      if (active) {
        updateExpression += ', activePlayerCount = activePlayerCount + :one';
      }

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });

      const response = await this.dynamoDBService.documentClient.send(command);

      if (!response.Attributes) {
        throw new NotFoundException(`Game with ID ${id} not found`);
      }

      return this.convertIsoStringsToDates(response.Attributes as GameEntity);
    } catch (error) {
      this.logger.error(
        `Error incrementing player count: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async decrementPlayerCount(id: string, active: boolean): Promise<GameEntity> {
    try {
      let updateExpression = 'SET playerCount = playerCount - :one';
      const expressionAttributeValues: Record<string, any> = {
        ':one': 1,
        ':zero': 0,
      };

      if (active) {
        updateExpression += ', activePlayerCount = activePlayerCount - :one';
      }

      // Ensure counts don't go below zero
      updateExpression +=
        ' SET playerCount = if_else(playerCount < :zero, :zero, playerCount)';
      if (active) {
        updateExpression +=
          ', activePlayerCount = if_else(activePlayerCount < :zero, :zero, activePlayerCount)';
      }

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });

      const response = await this.dynamoDBService.documentClient.send(command);

      if (!response.Attributes) {
        throw new NotFoundException(`Game with ID ${id} not found`);
      }

      return this.convertIsoStringsToDates(response.Attributes as GameEntity);
    } catch (error) {
      this.logger.error(
        `Error decrementing player count: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async incrementBingoCount(id: string): Promise<GameEntity> {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: 'SET bingoCount = bingoCount + :one',
        ExpressionAttributeValues: {
          ':one': 1,
        },
        ReturnValues: 'ALL_NEW',
      });

      const response = await this.dynamoDBService.documentClient.send(command);

      if (!response.Attributes) {
        throw new NotFoundException(`Game with ID ${id} not found`);
      }

      return this.convertIsoStringsToDates(response.Attributes as GameEntity);
    } catch (error) {
      this.logger.error(
        `Error incrementing bingo count: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Helper method to convert Date objects to ISO strings for DynamoDB
   */
  private convertDatesToIsoStrings(
    obj: Record<string, any>,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value instanceof Date) {
        result[key] = value.toISOString();
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Helper method to convert ISO strings back to Date objects
   */
  private convertIsoStringsToDates(obj: Record<string, any>): GameEntity {
    const dateFields = [
      'createdAt',
      'startedAt',
      'endedAt',
      'expiresAt',
      'lastDrawnAt',
    ];

    for (const field of dateFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        obj[field] = new Date(obj[field]);
      }
    }

    return obj as GameEntity;
  }

  /**
   * Helper method to build update expression for DynamoDB
   */
  private buildUpdateExpression(updates: Record<string, any>): {
    updateExpression: string;
    expressionAttributeValues: Record<string, any>;
    expressionAttributeNames: Record<string, string>;
  } {
    const expressionParts: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;

        expressionParts.push(`${attributeName} = ${attributeValue}`);
        expressionAttributeValues[attributeValue] = value;
        expressionAttributeNames[attributeName] = key;
      }
    }

    if (expressionParts.length === 0) {
      return {
        updateExpression: '',
        expressionAttributeValues: {},
        expressionAttributeNames: {},
      };
    }

    return {
      updateExpression: `SET ${expressionParts.join(', ')}`,
      expressionAttributeValues,
      expressionAttributeNames,
    };
  }
}
