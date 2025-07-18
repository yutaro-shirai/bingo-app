import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlayerEntity } from '../entities/player.entity';
import { IPlayerRepository } from './player.repository.interface';
import { DynamoDBService } from '../../common/dynamodb/dynamodb.service';
import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

@Injectable()
export class PlayerRepository implements IPlayerRepository {
  private readonly logger = new Logger(PlayerRepository.name);
  private readonly tableName: string;

  constructor(
    private readonly dynamodbService: DynamoDBService,
    private readonly configService: ConfigService,
  ) {
    this.tableName = this.configService.get<string>(
      'DYNAMODB_PLAYERS_TABLE',
      'players',
    );
  }

  async findById(id: string): Promise<PlayerEntity | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { id },
      });
      const result = await this.dynamodbService.documentClient.send(command);
      return result.Item ? this.convertIsoStringsToDates(result.Item as PlayerEntity) : null;
    } catch (error) {
      this.logger.error(`Error finding player by ID: ${error.message}`, error.stack);
      return null;
    }
  }

  async findByGameId(gameId: string): Promise<PlayerEntity[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GameIdIndex',
        KeyConditionExpression: 'gameId = :gameId',
        ExpressionAttributeValues: { ':gameId': gameId },
      });
      const result = await this.dynamodbService.documentClient.send(command);
      return ((result.Items as PlayerEntity[]) || []).map(item => 
        this.convertIsoStringsToDates(item)
      );
    } catch (error) {
      this.logger.error(`Error finding players by game ID: ${error.message}`, error.stack);
      return [];
    }
  }

  async findByConnectionId(connectionId: string): Promise<PlayerEntity | null> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'ConnectionIdIndex',
        KeyConditionExpression: 'connectionId = :connectionId',
        ExpressionAttributeValues: { ':connectionId': connectionId },
        Limit: 1,
      });
      const result = await this.dynamodbService.documentClient.send(command);
      return result.Items && result.Items.length > 0 
        ? this.convertIsoStringsToDates(result.Items[0] as PlayerEntity) 
        : null;
    } catch (error) {
      this.logger.error(`Error finding player by connection ID: ${error.message}`, error.stack);
      return null;
    }
  }

  async findBingoPlayersByGameId(gameId: string): Promise<PlayerEntity[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'BingoIndex',
        KeyConditionExpression: 'gameId = :gameId AND hasBingo = :hasBingo',
        ExpressionAttributeValues: { 
          ':gameId': gameId,
          ':hasBingo': 'true' // Store as string for better GSI compatibility
        },
      });
      const result = await this.dynamodbService.documentClient.send(command);
      return ((result.Items as PlayerEntity[]) || []).map(item => 
        this.convertIsoStringsToDates(item)
      );
    } catch (error) {
      this.logger.error(`Error finding bingo players: ${error.message}`, error.stack);
      return [];
    }
  }

  async create(player: PlayerEntity): Promise<PlayerEntity> {
    try {
      // Convert Date objects to ISO strings
      const playerItem = this.convertDatesToIsoStrings(player);
      
      // Convert boolean hasBingo to string for GSI
      playerItem.hasBingo = player.hasBingo ? 'true' : 'false';
      
      // Add TTL for inactive players (default to 24 hours from now)
      const ttl = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000);
      
      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          ...playerItem,
          ttl,
        },
      });
      
      await this.dynamodbService.documentClient.send(command);
      return player;
    } catch (error) {
      this.logger.error(`Error creating player: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(
    id: string,
    player: Partial<PlayerEntity>,
  ): Promise<PlayerEntity> {
    try {
      // Convert Date objects to ISO strings
      const playerUpdates = this.convertDatesToIsoStrings(player);
      
      // Convert boolean hasBingo to string for GSI if present
      if (player.hasBingo !== undefined) {
        playerUpdates.hasBingo = player.hasBingo ? 'true' : 'false';
      }
      
      // Build update expression
      const {
        updateExpression,
        expressionAttributeValues,
        expressionAttributeNames,
      } = this.buildUpdateExpression(playerUpdates);
      
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
      
      const response = await this.dynamodbService.documentClient.send(command);
      
      if (!response.Attributes) {
        throw new NotFoundException(`Player with ID ${id} not found`);
      }
      
      return this.convertIsoStringsToDates(response.Attributes as PlayerEntity);
    } catch (error) {
      this.logger.error(`Error updating player: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: { id },
      });
      await this.dynamodbService.documentClient.send(command);
    } catch (error) {
      this.logger.error(`Error deleting player: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateCardState(
    id: string,
    cardState: number[][],
  ): Promise<PlayerEntity> {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: 'SET #card.#grid = :cardState',
        ExpressionAttributeNames: {
          '#card': 'card',
          '#grid': 'grid',
        },
        ExpressionAttributeValues: {
          ':cardState': cardState,
        },
        ReturnValues: 'ALL_NEW',
      });
      
      const response = await this.dynamodbService.documentClient.send(command);
      
      if (!response.Attributes) {
        throw new NotFoundException(`Player with ID ${id} not found`);
      }
      
      return this.convertIsoStringsToDates(response.Attributes as PlayerEntity);
    } catch (error) {
      this.logger.error(`Error updating card state: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateConnectionState(
    id: string,
    connected: boolean,
    connectionId?: string,
  ): Promise<PlayerEntity> {
    try {
      const now = new Date();
      const updateExpressionParts = ['SET isOnline = :isOnline, lastSeenAt = :lastSeenAt'];
      const expressionAttributeValues: Record<string, any> = {
        ':isOnline': connected,
        ':lastSeenAt': now.toISOString(),
      };
      
      // Update TTL based on connection state
      if (connected) {
        // If connected, set TTL to 24 hours from now
        const ttl = Math.floor((now.getTime() + 24 * 60 * 60 * 1000) / 1000);
        updateExpressionParts.push('ttl = :ttl');
        expressionAttributeValues[':ttl'] = ttl;
      } else {
        // If disconnected, set TTL to 1 hour from now
        const ttl = Math.floor((now.getTime() + 1 * 60 * 60 * 1000) / 1000);
        updateExpressionParts.push('ttl = :ttl');
        expressionAttributeValues[':ttl'] = ttl;
      }
      
      // Update connection ID if provided
      if (connectionId !== undefined) {
        updateExpressionParts.push('connectionId = :connectionId');
        expressionAttributeValues[':connectionId'] = connected ? connectionId : null;
      }
      
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: updateExpressionParts.join(', '),
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });
      
      const response = await this.dynamodbService.documentClient.send(command);
      
      if (!response.Attributes) {
        throw new NotFoundException(`Player with ID ${id} not found`);
      }
      
      return this.convertIsoStringsToDates(response.Attributes as PlayerEntity);
    } catch (error) {
      this.logger.error(`Error updating connection state: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  async updateBingoStatus(
    id: string,
    hasBingo: boolean,
  ): Promise<PlayerEntity> {
    try {
      const now = new Date();
      const bingoAchievedAt = hasBingo ? now.toISOString() : null;
      
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: 'SET hasBingo = :hasBingo, bingoAchievedAt = :bingoAchievedAt',
        ExpressionAttributeValues: {
          ':hasBingo': hasBingo ? 'true' : 'false', // Store as string for GSI
          ':bingoAchievedAt': bingoAchievedAt,
        },
        ReturnValues: 'ALL_NEW',
      });
      
      const response = await this.dynamodbService.documentClient.send(command);
      
      if (!response.Attributes) {
        throw new NotFoundException(`Player with ID ${id} not found`);
      }
      
      return this.convertIsoStringsToDates(response.Attributes as PlayerEntity);
    } catch (error) {
      this.logger.error(`Error updating bingo status: ${error.message}`, error.stack);
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
  private convertIsoStringsToDates(obj: Record<string, any>): PlayerEntity {
    const dateFields = [
      'lastSeenAt',
      'bingoAchievedAt',
    ];

    for (const field of dateFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        obj[field] = new Date(obj[field]);
      }
    }

    // Convert string hasBingo back to boolean
    if (obj.hasBingo === 'true') {
      obj.hasBingo = true;
    } else if (obj.hasBingo === 'false') {
      obj.hasBingo = false;
    }

    return obj as PlayerEntity;
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
}