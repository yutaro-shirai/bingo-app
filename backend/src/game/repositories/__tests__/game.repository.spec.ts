describe('update', () => {
  it('should update a game and return the updated entity', async () => {
    const updatedGame: any = {
      ...createMockGame(),
      status: GameStatus.STARTED,
    };
    mockDynamoDBService.documentClient.send.mockResolvedValueOnce({
      Attributes: updatedGame,
    });
    const result = await repository.update('test-id', {
      status: GameStatus.STARTED,
    });
    expect(result).toEqual(updatedGame);
    expect(mockDynamoDBService.documentClient.send).toHaveBeenCalledTimes(1);
  });

  it('should throw NotFoundException if no Attributes returned', async () => {
    mockDynamoDBService.documentClient.send.mockResolvedValueOnce({});
    await expect(
      repository.update('test-id', { status: GameStatus.STARTED }),
    ).rejects.toThrow();
  });

  it('should throw error if update fails', async () => {
    mockDynamoDBService.documentClient.send.mockRejectedValueOnce(
      new Error('DynamoDB error'),
    );
    await expect(
      repository.update('test-id', { status: GameStatus.STARTED }),
    ).rejects.toThrow();
  });
});

describe('delete', () => {
  it('should delete a game without error', async () => {
    mockDynamoDBService.documentClient.send.mockResolvedValueOnce({});
    await expect(repository.delete('test-id')).resolves.toBeUndefined();
    expect(mockDynamoDBService.documentClient.send).toHaveBeenCalledTimes(1);
  });

  it('should throw error if delete fails', async () => {
    mockDynamoDBService.documentClient.send.mockRejectedValueOnce(
      new Error('DynamoDB error'),
    );
    await expect(repository.delete('test-id')).rejects.toThrow();
  });
});

describe('findByCode', () => {
  it('should return a game when found by code', async () => {
    const mockGame = createMockGame();
    mockDynamoDBService.documentClient.send.mockResolvedValueOnce({
      Items: [mockGame],
    });
    const result = await repository.findByCode('TEST');
    expect(result).toEqual(mockGame);
  });

  it('should return null when not found by code', async () => {
    mockDynamoDBService.documentClient.send.mockResolvedValueOnce({
      Items: [],
    });
    const result = await repository.findByCode('NOTFOUND');
    expect(result).toBeNull();
  });

  it('should return null on error', async () => {
    mockDynamoDBService.documentClient.send.mockRejectedValueOnce(
      new Error('DynamoDB error'),
    );
    const result = await repository.findByCode('ERR');
    expect(result).toBeNull();
  });
});

describe('findByStatus', () => {
  it('should return games by status', async () => {
    const mockGame = createMockGame();
    mockDynamoDBService.documentClient.send.mockResolvedValueOnce({
      Items: [mockGame],
    });
    const result = await repository.findByStatus(GameStatus.CREATED);
    expect(result).toEqual([mockGame]);
  });

  it('should return empty array if no games found', async () => {
    mockDynamoDBService.documentClient.send.mockResolvedValueOnce({
      Items: [],
    });
    const result = await repository.findByStatus(GameStatus.CREATED);
    expect(result).toEqual([]);
  });

  it('should return empty array on error', async () => {
    mockDynamoDBService.documentClient.send.mockRejectedValueOnce(
      new Error('DynamoDB error'),
    );
    const result = await repository.findByStatus(GameStatus.CREATED);
    expect(result).toEqual([]);
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GameRepository } from '../game.repository';
import { DynamoDBService } from '../../../common/dynamodb/dynamodb.service';
import { GameEntity } from '../../entities/game.entity';
import { DrawMode, GameStatus } from '../../../../../../shared/types/game';

// Mock DynamoDB service
const mockDynamoDBService = {
  documentClient: {
    send: jest.fn(),
  },
};

describe('GameRepository', () => {
  let repository: GameRepository;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      providers: [
        GameRepository,
        {
          provide: DynamoDBService,
          useValue: mockDynamoDBService,
        },
      ],
    }).compile();

    repository = module.get<GameRepository>(GameRepository);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a game when found', async () => {
      // Arrange
      const mockGame = createMockGame();
      mockDynamoDBService.documentClient.send.mockResolvedValueOnce({
        Item: mockGame,
      });

      // Act
      const result = await repository.findById('test-id');

      // Assert
      expect(result).toEqual(mockGame);
      expect(mockDynamoDBService.documentClient.send).toHaveBeenCalledTimes(1);
    });

    it('should return null when game not found', async () => {
      // Arrange
      mockDynamoDBService.documentClient.send.mockResolvedValueOnce({
        Item: null,
      });

      // Act
      const result = await repository.findById('non-existent-id');

      // Assert
      expect(result).toBeNull();
      expect(mockDynamoDBService.documentClient.send).toHaveBeenCalledTimes(1);
    });

    it('should return null when an error occurs', async () => {
      // Arrange
      mockDynamoDBService.documentClient.send.mockRejectedValueOnce(
        new Error('DynamoDB error'),
      );

      // Act
      const result = await repository.findById('test-id');

      // Assert
      expect(result).toBeNull();
      expect(mockDynamoDBService.documentClient.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('should create a game successfully', async () => {
      // Arrange
      const mockGame = createMockGame();
      mockDynamoDBService.documentClient.send.mockResolvedValueOnce({});

      // Act
      const result = await repository.create(mockGame);

      // Assert
      expect(result).toEqual(mockGame);
      expect(mockDynamoDBService.documentClient.send).toHaveBeenCalledTimes(1);

      // Verify TTL was added
      const callArgs = mockDynamoDBService.documentClient.send.mock.calls[0][0];
      expect(callArgs.input.Item.ttl).toBeDefined();
    });

    it('should throw an error when creation fails', async () => {
      // Arrange
      const mockGame = createMockGame();
      mockDynamoDBService.documentClient.send.mockRejectedValueOnce(
        new Error('DynamoDB error'),
      );

      // Act & Assert
      await expect(repository.create(mockGame)).rejects.toThrow();
      expect(mockDynamoDBService.documentClient.send).toHaveBeenCalledTimes(1);
    });
  });

  // Helper function to create a mock game entity
  function createMockGame(): GameEntity {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now
    return {
      id: 'test-id',
      code: 'TEST',
      status: GameStatus.CREATED,
      createdAt: now,
      expiresAt: expiresAt,
      drawMode: DrawMode.MANUAL,
      drawnNumbers: [],
      playerCount: 0,
      activePlayerCount: 0,
      bingoCount: 0,
      adminConnections: [],
    };
  }
});
