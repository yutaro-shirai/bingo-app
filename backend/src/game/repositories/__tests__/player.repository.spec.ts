import { Test, TestingModule } from '@nestjs/testing';
import { PlayerRepository } from '../player.repository';
import { DynamoDBService } from '../../../common/dynamodb/dynamodb.service';
import { PlayerEntity } from '../../entities/player.entity';
import { ConfigModule } from '@nestjs/config';

const mockDynamoDBService = {
  documentClient: {
    send: jest.fn(),
  },
};

describe('PlayerRepository', () => {
  let repository: PlayerRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        PlayerRepository,
        {
          provide: DynamoDBService,
          useValue: mockDynamoDBService,
        },
      ],
    }).compile();
    repository = module.get<PlayerRepository>(PlayerRepository);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a player when found', async () => {
      const mockPlayer = createMockPlayer();
      mockDynamoDBService.documentClient.send.mockResolvedValueOnce({
        Item: mockPlayer,
      });
      const result = await repository.findById('p1');
      expect(result).toEqual(mockPlayer);
    });
    it('should return null when not found', async () => {
      mockDynamoDBService.documentClient.send.mockResolvedValueOnce({});
      const result = await repository.findById('p1');
      expect(result).toBeNull();
    });
  });

  describe('findByGameId', () => {
    it('should return players for a game', async () => {
      const mockPlayers = [createMockPlayer()];
      mockDynamoDBService.documentClient.send.mockResolvedValueOnce({
        Items: mockPlayers,
      });
      const result = await repository.findByGameId('g1');
      expect(result).toEqual(mockPlayers);
    });
    it('should return empty array if none found', async () => {
      mockDynamoDBService.documentClient.send.mockResolvedValueOnce({
        Items: [],
      });
      const result = await repository.findByGameId('g1');
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a player', async () => {
      const mockPlayer = createMockPlayer();
      mockDynamoDBService.documentClient.send.mockResolvedValueOnce({});
      const result = await repository.create(mockPlayer);
      expect(result).toEqual(mockPlayer);
    });
  });

  describe('update', () => {
    it('should update a player', async () => {
      const mockPlayer = createMockPlayer();
      mockDynamoDBService.documentClient.send
        .mockResolvedValueOnce({ Item: mockPlayer }) // findById
        .mockResolvedValueOnce({}); // put
      const result = await repository.update('p1', { name: 'updated' });
      expect(result.name).toBe('updated');
    });
    it('should throw if player not found', async () => {
      mockDynamoDBService.documentClient.send.mockResolvedValueOnce({});
      await expect(repository.update('p1', { name: 'fail' })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete a player', async () => {
      mockDynamoDBService.documentClient.send.mockResolvedValueOnce({});
      await expect(repository.delete('p1')).resolves.toBeUndefined();
    });
  });

  describe('updateCardState', () => {
    it('should update card state', async () => {
      const mockPlayer = createMockPlayer();
      mockDynamoDBService.documentClient.send.mockReset();
      mockDynamoDBService.documentClient.send.mockImplementation(() =>
        Promise.resolve({ Item: mockPlayer }),
      );
      const newGrid = [
        [1, 2],
        [3, 4],
      ];
      const result = await repository.updateCardState('p1', newGrid);
      expect(result.card.grid).toEqual(newGrid);
    });
    it('should throw if player not found', async () => {
      mockDynamoDBService.documentClient.send.mockReset();
      // findById (update内)
      mockDynamoDBService.documentClient.send.mockResolvedValueOnce({});
      await expect(repository.updateCardState('p1', [[0]])).rejects.toThrow();
    });
  });

  describe('updateConnectionState', () => {
    it('should update connection state', async () => {
      const mockPlayer = createMockPlayer();
      mockDynamoDBService.documentClient.send.mockReset();
      mockDynamoDBService.documentClient.send.mockImplementation(() =>
        Promise.resolve({ Item: mockPlayer }),
      );
      const result = await repository.updateConnectionState('p1', true);
      expect(result.isOnline).toBe(true);
    });
    it('should throw if player not found', async () => {
      mockDynamoDBService.documentClient.send.mockReset();
      // findById (update内)
      mockDynamoDBService.documentClient.send.mockResolvedValueOnce({});
      await expect(
        repository.updateConnectionState('p1', false),
      ).rejects.toThrow();
    });
  });
});

function createMockPlayer(): PlayerEntity {
  return {
    id: 'p1',
    gameId: 'g1',
    name: 'test',
    card: {
      grid: [
        [0, 0],
        [0, 0],
      ],
    },
    punchedNumbers: [],
    hasBingo: false,
    bingoAchievedAt: undefined,
    connectionId: 'c1',
    isOnline: false,
    lastSeenAt: new Date(),
  };
}
