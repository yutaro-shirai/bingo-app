import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { OptimizedGameRepository } from '../optimized-game.repository';
import { DynamoDBService } from '../../../common/dynamodb/dynamodb.service';
import { GameEntity } from '../../entities/game.entity';
import { GameStatus, DrawMode } from 'shared';

// Mock NodeCache
jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => {
    const cache = new Map();
    return {
      get: jest.fn((key) => cache.get(key)),
      set: jest.fn((key, value) => cache.set(key, value)),
      del: jest.fn((key) => cache.delete(key)),
      flushAll: jest.fn(() => cache.clear()),
    };
  });
});

describe('OptimizedGameRepository', () => {
  let repository: OptimizedGameRepository;
  let dynamoDBService: jest.Mocked<DynamoDBService>;
  let configService: jest.Mocked<ConfigService>;

  const mockDynamoDBService = {
    documentClient: {
      send: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptimizedGameRepository,
        {
          provide: DynamoDBService,
          useValue: mockDynamoDBService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    repository = module.get<OptimizedGameRepository>(OptimizedGameRepository);
    dynamoDBService = module.get(DynamoDBService);
    configService = module.get(ConfigService);
  });

  describe('findById', () => {
    it('should return a game from cache if available', async () => {
      const mockGame: GameEntity = {
        id: 'test-id',
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      // Set up cache to return the game
      (repository as any).cache.get.mockReturnValueOnce(mockGame);

      const result = await repository.findById('test-id');

      expect(result).toEqual(mockGame);
      expect((repository as any).cache.get).toHaveBeenCalledWith(
        'game:test-id',
      );
      expect(dynamoDBService.documentClient.send).not.toHaveBeenCalled();
    });

    it('should fetch from DynamoDB and cache the result if not in cache', async () => {
      const mockGame: GameEntity = {
        id: 'test-id',
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      // Cache miss
      (repository as any).cache.get.mockReturnValueOnce(null);

      // DynamoDB response
      dynamoDBService.documentClient.send.mockResolvedValueOnce({
        Item: mockGame,
      });

      const result = await repository.findById('test-id');

      expect(result).toEqual(mockGame);
      expect((repository as any).cache.get).toHaveBeenCalledWith(
        'game:test-id',
      );
      expect(dynamoDBService.documentClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'GameTable',
            Key: { id: 'test-id' },
          }),
        }),
      );
      expect((repository as any).cache.set).toHaveBeenCalledWith(
        'game:test-id',
        mockGame,
      );
    });

    it('should return null if game not found in cache or DynamoDB', async () => {
      // Cache miss
      (repository as any).cache.get.mockReturnValueOnce(null);

      // DynamoDB response - no item found
      dynamoDBService.documentClient.send.mockResolvedValueOnce({
        Item: null,
      });

      const result = await repository.findById('test-id');

      expect(result).toBeNull();
      expect((repository as any).cache.get).toHaveBeenCalledWith(
        'game:test-id',
      );
      expect(dynamoDBService.documentClient.send).toHaveBeenCalled();
      expect((repository as any).cache.set).not.toHaveBeenCalled();
    });

    it('should handle errors and return null', async () => {
      // Cache miss
      (repository as any).cache.get.mockReturnValueOnce(null);

      // DynamoDB error
      dynamoDBService.documentClient.send.mockRejectedValueOnce(
        new Error('DynamoDB error'),
      );

      const result = await repository.findById('test-id');

      expect(result).toBeNull();
      expect((repository as any).cache.get).toHaveBeenCalledWith(
        'game:test-id',
      );
      expect(dynamoDBService.documentClient.send).toHaveBeenCalled();
    });
  });

  describe('findByCode', () => {
    it('should return a game from cache if available', async () => {
      const mockGame: GameEntity = {
        id: 'test-id',
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      // Set up cache to return the game
      (repository as any).cache.get.mockReturnValueOnce(mockGame);

      const result = await repository.findByCode('ABC123');

      expect(result).toEqual(mockGame);
      expect((repository as any).cache.get).toHaveBeenCalledWith(
        'gameCode:ABC123',
      );
      expect(dynamoDBService.documentClient.send).not.toHaveBeenCalled();
    });

    it('should fetch from DynamoDB and cache the result if not in cache', async () => {
      const mockGame: GameEntity = {
        id: 'test-id',
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      // Cache miss
      (repository as any).cache.get.mockReturnValueOnce(null);

      // DynamoDB response
      dynamoDBService.documentClient.send.mockResolvedValueOnce({
        Items: [mockGame],
      });

      const result = await repository.findByCode('ABC123');

      expect(result).toEqual(mockGame);
      expect((repository as any).cache.get).toHaveBeenCalledWith(
        'gameCode:ABC123',
      );
      expect(dynamoDBService.documentClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'GameTable',
            IndexName: 'CodeIndex',
            KeyConditionExpression: 'code = :code',
            ExpressionAttributeValues: { ':code': 'ABC123' },
          }),
        }),
      );
      expect((repository as any).cache.set).toHaveBeenCalledWith(
        'game:test-id',
        mockGame,
      );
      expect((repository as any).cache.set).toHaveBeenCalledWith(
        'gameCode:ABC123',
        mockGame,
      );
    });
  });

  describe('create', () => {
    it('should create a game and cache it', async () => {
      const mockGame: GameEntity = {
        id: 'test-id',
        code: 'ABC123',
        status: GameStatus.CREATED,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      dynamoDBService.documentClient.send.mockResolvedValueOnce({});

      const result = await repository.create(mockGame);

      expect(result).toEqual(mockGame);
      expect(dynamoDBService.documentClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'GameTable',
            Item: expect.objectContaining({
              id: 'test-id',
              code: 'ABC123',
              status: GameStatus.CREATED,
            }),
          }),
        }),
      );
      expect((repository as any).cache.set).toHaveBeenCalledWith(
        'game:test-id',
        mockGame,
      );
      expect((repository as any).cache.set).toHaveBeenCalledWith(
        'gameCode:ABC123',
        mockGame,
      );
    });

    it('should handle errors when creating a game', async () => {
      const mockGame: GameEntity = {
        id: 'test-id',
        code: 'ABC123',
        status: GameStatus.CREATED,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      dynamoDBService.documentClient.send.mockRejectedValueOnce(
        new Error('DynamoDB error'),
      );

      await expect(repository.create(mockGame)).rejects.toThrow(
        'DynamoDB error',
      );
      expect(dynamoDBService.documentClient.send).toHaveBeenCalled();
      expect((repository as any).cache.set).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a game and cache it', async () => {
      const gameId = 'test-id';
      const updateData = {
        status: GameStatus.ACTIVE,
        startedAt: new Date(),
      };

      const updatedGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        startedAt: updateData.startedAt,
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      dynamoDBService.documentClient.send.mockResolvedValueOnce({
        Attributes: updatedGame,
      });

      const result = await repository.update(gameId, updateData);

      expect(result).toEqual(updatedGame);
      expect(dynamoDBService.documentClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'GameTable',
            Key: { id: gameId },
            UpdateExpression: expect.stringContaining('SET'),
          }),
        }),
      );
      expect((repository as any).cache.set).toHaveBeenCalledWith(
        'game:test-id',
        updatedGame,
      );
      expect((repository as any).cache.set).toHaveBeenCalledWith(
        'gameCode:ABC123',
        updatedGame,
      );
    });

    it('should throw NotFoundException if game not found during update', async () => {
      const gameId = 'test-id';
      const updateData = {
        status: GameStatus.ACTIVE,
      };

      dynamoDBService.documentClient.send.mockResolvedValueOnce({
        Attributes: null,
      });

      await expect(repository.update(gameId, updateData)).rejects.toThrow(
        NotFoundException,
      );
      expect(dynamoDBService.documentClient.send).toHaveBeenCalled();
      expect((repository as any).cache.set).not.toHaveBeenCalled();
    });

    it('should throw error if no attributes to update', async () => {
      const gameId = 'test-id';
      const updateData = {};

      await expect(repository.update(gameId, updateData)).rejects.toThrow(
        'No attributes to update',
      );
      expect(dynamoDBService.documentClient.send).not.toHaveBeenCalled();
    });
  });

  describe('addDrawnNumber', () => {
    it('should add a drawn number and update cache', async () => {
      const gameId = 'test-id';
      const number = 42;

      const updatedGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [1, 2, 3, 42],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
        lastDrawnAt: new Date(),
      };

      dynamoDBService.documentClient.send.mockResolvedValueOnce({
        Attributes: updatedGame,
      });

      const result = await repository.addDrawnNumber(gameId, number);

      expect(result).toEqual(updatedGame);
      expect(dynamoDBService.documentClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'GameTable',
            Key: { id: gameId },
            UpdateExpression: expect.stringContaining('SET drawnNumbers'),
          }),
        }),
      );
      expect((repository as any).cache.set).toHaveBeenCalledWith(
        'game:test-id',
        updatedGame,
      );
      expect((repository as any).cache.set).toHaveBeenCalledWith(
        'gameCode:ABC123',
        updatedGame,
      );
    });
  });

  describe('incrementBingoCount', () => {
    it('should increment bingo count and update cache', async () => {
      const gameId = 'test-id';

      const updatedGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [1, 2, 3],
        playerCount: 10,
        activePlayerCount: 8,
        bingoCount: 3, // Incremented
        adminConnections: [],
      };

      dynamoDBService.documentClient.send.mockResolvedValueOnce({
        Attributes: updatedGame,
      });

      const result = await repository.incrementBingoCount(gameId);

      expect(result).toEqual(updatedGame);
      expect(dynamoDBService.documentClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'GameTable',
            Key: { id: gameId },
            UpdateExpression: 'ADD bingoCount :one',
          }),
        }),
      );
      expect((repository as any).cache.set).toHaveBeenCalledWith(
        'game:test-id',
        updatedGame,
      );
      expect((repository as any).cache.set).toHaveBeenCalledWith(
        'gameCode:ABC123',
        updatedGame,
      );
    });
  });

  describe('clearCache', () => {
    it('should clear cache for a specific game', () => {
      repository.clearCache('test-id');
      expect((repository as any).cache.del).toHaveBeenCalledWith(
        'game:test-id',
      );
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cache', () => {
      repository.clearAllCache();
      expect((repository as any).cache.flushAll).toHaveBeenCalled();
    });
  });
});
