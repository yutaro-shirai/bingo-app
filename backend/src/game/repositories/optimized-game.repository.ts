import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { GameEntity } from '../entities/game.entity';
import { IGameRepository } from './game.repository.interface';
import { DynamoDBService } from '../../common/dynamodb/dynamodb.service';
import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
  BatchGetCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { GameStatus } from '../../shared/types';
import { ConfigService } from '@nestjs/config';
import * as NodeCache from 'node-cache';

// Use environment variable for table name
const TABLE_NAME = process.env.DYNAMODB_GAMES_TABLE || 'GameTable';

/**
 * Optimized Game Repository with caching and batch operations
 */
@Injectable()
export class OptimizedGameRepository implements IGameRepository {
  private readonly logger = new Logger(OptimizedGameRepository.name);
  private readonly cache: NodeCache;
  private readonly cacheTTL: number = 60; // 60 seconds

  constructor(
    @Inject(DynamoDBService)
    private readonly dynamodbService: DynamoDBService,
    private readonly configService: ConfigService,
  ) {
    // Initialize cache
    this.cache = new NodeCache({
      stdTTL: this.cacheTTL,
      checkperiod: 120,
      useClones: false,
    });
  }

  async findById(id: string): Promise<GameEntity | null> {
    try {
      // Check cache first
      const cachedGame = this.cache.get<GameEntity>(`game:${id}`);
      if (cachedGame) {
        return cachedGame;
      }

      const command = new GetCommand({
        TableName: TABLE_NAME,
        Key: { id },
      });
      const result = await this.dynamodbService.documentClient.send(command);

      if (!result.Item) {
        return null;
      }

      const game = result.Item as GameEntity;

      // Cache the result
      this.cache.set(`game:${id}`, game);

      return game;
    } catch (error) {
      this.logger.error(`Error finding game by ID: ${error.message}`);
      return null;
    }
  }

  async findByIds(ids: string[]): Promise<GameEntity[]> {
    if (!ids.length) {
      return [];
    }

    try {
      // Check cache first
      const cachedGames: GameEntity[] = [];
      const uncachedIds: string[] = [];

      for (const id of ids) {
        const cachedGame = this.cache.get<GameEntity>(`game:${id}`);
        if (cachedGame) {
          cachedGames.push(cachedGame);
        } else {
          uncachedIds.push(id);
        }
      }

      // If all games were cached, return them
      if (uncachedIds.length === 0) {
        return cachedGames;
      }

      // Fetch uncached games in batches of 25 (DynamoDB limit)
      const games: GameEntity[] = [...cachedGames];

      // Use Promise.all to fetch batches in parallel
      const batchPromises = [];

      for (let i = 0; i < uncachedIds.length; i += 25) {
        const batchIds = uncachedIds.slice(i, i + 25);

        const command = new BatchGetCommand({
          RequestItems: {
            [TABLE_NAME]: {
              Keys: batchIds.map((id) => ({ id })),
              // Only request the attributes we need
              ProjectionExpression:
                'id, code, #status, createdAt, expiresAt, drawMode, drawnNumbers, playerCount, activePlayerCount, bingoCount',
              ExpressionAttributeNames: {
                '#status': 'status', // status is a reserved word
              },
            },
          },
        });

        batchPromises.push(this.dynamodbService.documentClient.send(command));
      }

      // Wait for all batches to complete
      const batchResults = await Promise.all(batchPromises);

      // Process results
      for (const result of batchResults) {
        if (result.Responses && result.Responses[TABLE_NAME]) {
          const fetchedGames = result.Responses[TABLE_NAME] as GameEntity[];

          // Cache the results
          for (const game of fetchedGames) {
            this.cache.set(`game:${game.id}`, game);
          }

          games.push(...fetchedGames);
        }
      }

      return games;
    } catch (error) {
      this.logger.error(`Error finding games by IDs: ${error.message}`);
      return [];
    }
  }

  async findByCode(code: string): Promise<GameEntity | null> {
    try {
      // Check cache first
      const cachedGame = this.cache.get<GameEntity>(`gameCode:${code}`);
      if (cachedGame) {
        return cachedGame;
      }

      const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'CodeIndex',
        KeyConditionExpression: 'code = :code',
        ExpressionAttributeValues: { ':code': code },
        Limit: 1,
      });
      const result = await this.dynamodbService.documentClient.send(command);

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      const game = result.Items[0] as GameEntity;

      // Cache the result
      this.cache.set(`game:${game.id}`, game);
      this.cache.set(`gameCode:${code}`, game);

      return game;
    } catch (error) {
      this.logger.error(`Error finding game by code: ${error.message}`);
      return null;
    }
  }

  async create(game: GameEntity): Promise<GameEntity> {
    try {
      // Calculate TTL (expiration timestamp)
      const ttl = Math.floor(game.expiresAt.getTime() / 1000);

      const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...game,
          ttl,
        },
      });
      await this.dynamodbService.documentClient.send(command);

      // Cache the result
      this.cache.set(`game:${game.id}`, game);
      this.cache.set(`gameCode:${game.code}`, game);

      return game;
    } catch (error) {
      this.logger.error(`Error creating game: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, game: Partial<GameEntity>): Promise<GameEntity> {
    try {
      // Build update expression
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      Object.entries(game).forEach(([key, value]) => {
        if (key !== 'id') {
          // Skip primary key
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = value;
        }
      });

      if (updateExpressions.length === 0) {
        throw new Error('No attributes to update');
      }

      const command = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });

      const result = await this.dynamodbService.documentClient.send(command);

      if (!result.Attributes) {
        throw new NotFoundException(`Game with ID ${id} not found`);
      }

      const updatedGame = result.Attributes as GameEntity;

      // Update cache
      this.cache.set(`game:${id}`, updatedGame);
      if (updatedGame.code) {
        this.cache.set(`gameCode:${updatedGame.code}`, updatedGame);
      }

      return updatedGame;
    } catch (error) {
      this.logger.error(`Error updating game: ${error.message}`);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // Get game first to get the code for cache invalidation
      const game = await this.findById(id);

      const command = new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id },
      });
      await this.dynamodbService.documentClient.send(command);

      // Invalidate cache
      this.cache.del(`game:${id}`);
      if (game?.code) {
        this.cache.del(`gameCode:${game.code}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting game: ${error.message}`);
      throw error;
    }
  }

  async findByStatus(status: GameStatus): Promise<GameEntity[]> {
    try {
      // Check cache first
      const cacheKey = `gameStatus:${status}`;
      const cachedGames = this.cache.get<GameEntity[]>(cacheKey);
      if (cachedGames) {
        return cachedGames;
      }

      const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'StatusIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
        },
        // Only request the attributes we need
        ProjectionExpression:
          'id, code, #status, createdAt, expiresAt, drawMode, drawnNumbers, playerCount, activePlayerCount, bingoCount',
        // Limit results for better performance
        Limit: 100,
      });
      const result = await this.dynamodbService.documentClient.send(command);

      const games = (result.Items || []) as GameEntity[];

      // Cache individual games and the status result
      for (const game of games) {
        this.cache.set(`game:${game.id}`, game);
      }
      this.cache.set(cacheKey, games, 30); // Cache status queries for less time

      return games;
    } catch (error) {
      this.logger.error(`Error finding games by status: ${error.message}`);
      return [];
    }
  }

  async addDrawnNumber(id: string, number: number): Promise<GameEntity> {
    try {
      // First check if the number is already drawn to avoid duplicates
      const game = await this.findById(id);
      if (!game) {
        throw new NotFoundException(`Game with ID ${id} not found`);
      }

      // If number is already drawn, return the current game state
      if (game.drawnNumbers && game.drawnNumbers.includes(number)) {
        return game;
      }

      // Use conditional update to ensure atomicity
      const command = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression:
          'SET drawnNumbers = list_append(if_not_exists(drawnNumbers, :empty_list), :number), lastDrawnAt = :now',
        ExpressionAttributeValues: {
          ':number': [number],
          ':empty_list': [],
          ':now': new Date(),
          ':num': number,
        },
        // Only update if the number is not already in the list
        ConditionExpression: 'NOT contains(drawnNumbers, :num)',
        // Only return the updated fields to reduce network traffic
        ProjectionExpression: 'id, code, drawnNumbers, lastDrawnAt',
        ReturnValues: 'ALL_NEW',
      });

      try {
        const result = await this.dynamodbService.documentClient.send(command);

        if (!result.Attributes) {
          throw new NotFoundException(`Game with ID ${id} not found`);
        }

        // Get the cached game and update only the changed fields
        const cachedGame = this.cache.get<GameEntity>(`game:${id}`);
        const updatedFields = result.Attributes as Partial<GameEntity>;

        let gameToCache: GameEntity;

        if (cachedGame) {
          // Update only the changed fields
          gameToCache = {
            ...cachedGame,
            drawnNumbers: updatedFields.drawnNumbers,
            lastDrawnAt: updatedFields.lastDrawnAt,
          };
        } else {
          // If not in cache, use the game we fetched earlier
          gameToCache = {
            ...game,
            drawnNumbers: updatedFields.drawnNumbers,
            lastDrawnAt: updatedFields.lastDrawnAt,
          };
        }

        // Update cache
        this.cache.set(`game:${id}`, gameToCache);
        if (gameToCache.code) {
          this.cache.set(`gameCode:${gameToCache.code}`, gameToCache);
        }

        return gameToCache;
      } catch (error) {
        // If condition failed (number already drawn), return the current game
        if (error.name === 'ConditionalCheckFailedException') {
          return game;
        }
        throw error;
      }
    } catch (error) {
      this.logger.error(`Error adding drawn number: ${error.message}`);
      throw error;
    }
  }

  async updateExpiration(id: string, expiresAt: Date): Promise<GameEntity> {
    try {
      const ttl = Math.floor(expiresAt.getTime() / 1000);

      const command = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: 'SET expiresAt = :expiresAt, ttl = :ttl',
        ExpressionAttributeValues: {
          ':expiresAt': expiresAt,
          ':ttl': ttl,
        },
        ReturnValues: 'ALL_NEW',
      });

      const result = await this.dynamodbService.documentClient.send(command);

      if (!result.Attributes) {
        throw new NotFoundException(`Game with ID ${id} not found`);
      }

      const updatedGame = result.Attributes as GameEntity;

      // Update cache
      this.cache.set(`game:${id}`, updatedGame);
      if (updatedGame.code) {
        this.cache.set(`gameCode:${updatedGame.code}`, updatedGame);
      }

      return updatedGame;
    } catch (error) {
      this.logger.error(`Error updating expiration: ${error.message}`);
      throw error;
    }
  }

  async updateAdminConnection(
    id: string,
    connectionId: string,
    isConnected: boolean,
  ): Promise<GameEntity> {
    try {
      let command;

      if (isConnected) {
        // Add connection ID to adminConnections
        command = new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id },
          UpdateExpression:
            'SET adminConnections = list_append(if_not_exists(adminConnections, :empty_list), :connectionId)',
          ExpressionAttributeValues: {
            ':connectionId': [connectionId],
            ':empty_list': [],
          },
          ReturnValues: 'ALL_NEW',
        });
      } else {
        // Remove connection ID from adminConnections
        // First get the current game to find the index of the connection ID
        const game = await this.findById(id);
        if (!game) {
          throw new NotFoundException(`Game with ID ${id} not found`);
        }

        const connectionIndex = game.adminConnections?.indexOf(connectionId);
        if (connectionIndex === undefined || connectionIndex === -1) {
          // Connection ID not found, nothing to do
          return game;
        }

        command = new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id },
          UpdateExpression: `REMOVE adminConnections[${connectionIndex}]`,
          ReturnValues: 'ALL_NEW',
        });
      }

      const result = await this.dynamodbService.documentClient.send(command);

      if (!result.Attributes) {
        throw new NotFoundException(`Game with ID ${id} not found`);
      }

      const updatedGame = result.Attributes as GameEntity;

      // Update cache
      this.cache.set(`game:${id}`, updatedGame);
      if (updatedGame.code) {
        this.cache.set(`gameCode:${updatedGame.code}`, updatedGame);
      }

      return updatedGame;
    } catch (error) {
      this.logger.error(`Error updating admin connection: ${error.message}`);
      throw error;
    }
  }

  async incrementPlayerCount(id: string): Promise<GameEntity> {
    try {
      // Use atomic counter update for better performance
      const command = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: 'ADD playerCount :one, activePlayerCount :one',
        ExpressionAttributeValues: {
          ':one': 1,
        },
        // Only return the updated fields to reduce network traffic
        ProjectionExpression: 'id, code, playerCount, activePlayerCount',
        ReturnValues: 'ALL_NEW',
      });

      const result = await this.dynamodbService.documentClient.send(command);

      if (!result.Attributes) {
        throw new NotFoundException(`Game with ID ${id} not found`);
      }

      // Get the cached game and update only the changed fields
      const cachedGame = this.cache.get<GameEntity>(`game:${id}`);
      const updatedGame = result.Attributes as Partial<GameEntity>;

      let gameToCache: GameEntity;

      if (cachedGame) {
        // Update only the changed fields
        gameToCache = {
          ...cachedGame,
          playerCount: updatedGame.playerCount,
          activePlayerCount: updatedGame.activePlayerCount,
        };
      } else {
        // If not in cache, fetch the full game
        const fullGame = await this.findById(id);
        if (!fullGame) {
          throw new NotFoundException(`Game with ID ${id} not found`);
        }
        gameToCache = fullGame;
      }

      // Update cache
      this.cache.set(`game:${id}`, gameToCache);
      if (gameToCache.code) {
        this.cache.set(`gameCode:${gameToCache.code}`, gameToCache);
      }

      return gameToCache;
    } catch (error) {
      this.logger.error(`Error incrementing player count: ${error.message}`);
      throw error;
    }
  }

  async decrementPlayerCount(id: string): Promise<GameEntity> {
    try {
      const command = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: 'ADD activePlayerCount :minus_one',
        ExpressionAttributeValues: {
          ':minus_one': -1,
          ':zero': 0,
        },
        ConditionExpression: 'activePlayerCount > :zero',
        ReturnValues: 'ALL_NEW',
      });

      const result = await this.dynamodbService.documentClient.send(command);

      if (!result.Attributes) {
        throw new NotFoundException(`Game with ID ${id} not found`);
      }

      const updatedGame = result.Attributes as GameEntity;

      // Update cache
      this.cache.set(`game:${id}`, updatedGame);
      if (updatedGame.code) {
        this.cache.set(`gameCode:${updatedGame.code}`, updatedGame);
      }

      return updatedGame;
    } catch (error) {
      this.logger.error(`Error decrementing player count: ${error.message}`);
      // If the condition failed, just return the current game
      const game = await this.findById(id);
      if (!game) {
        throw new NotFoundException(`Game with ID ${id} not found`);
      }
      return game;
    }
  }

  async incrementBingoCount(id: string): Promise<GameEntity> {
    try {
      const command = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: 'ADD bingoCount :one',
        ExpressionAttributeValues: {
          ':one': 1,
        },
        ReturnValues: 'ALL_NEW',
      });

      const result = await this.dynamodbService.documentClient.send(command);

      if (!result.Attributes) {
        throw new NotFoundException(`Game with ID ${id} not found`);
      }

      const updatedGame = result.Attributes as GameEntity;

      // Update cache
      this.cache.set(`game:${id}`, updatedGame);
      if (updatedGame.code) {
        this.cache.set(`gameCode:${updatedGame.code}`, updatedGame);
      }

      return updatedGame;
    } catch (error) {
      this.logger.error(`Error incrementing bingo count: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear cache for a specific game
   */
  clearCache(id: string): void {
    this.cache.del(`game:${id}`);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.flushAll();
  }
}
