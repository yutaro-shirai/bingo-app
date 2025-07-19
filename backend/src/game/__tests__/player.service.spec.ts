import { Test, TestingModule } from '@nestjs/testing';
import { PlayerService } from '../player.service';
import { IPlayerRepository } from '../repositories/player.repository.interface';
import { PlayerEntity, BingoCardEntity } from '../entities/player.entity';

describe('PlayerService', () => {
  let service: PlayerService;
  let playerRepository: jest.Mocked<IPlayerRepository>;

  const mockPlayerRepository = {
    findById: jest.fn(),
    findByGameId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateCardState: jest.fn(),
    updateConnectionState: jest.fn(),
    findByConnectionId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        {
          provide: 'IPlayerRepository',
          useValue: mockPlayerRepository,
        },
      ],
    }).compile();

    service = module.get<PlayerService>(PlayerService);
    playerRepository = module.get('IPlayerRepository');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerPlayer', () => {
    it('should register a player successfully', async () => {
      const mockPlayer: PlayerEntity = {
        id: 'player-id',
        gameId: 'game-id',
        name: 'Test Player',
        card: {
          grid: [],
        },
        punchedNumbers: [],
        hasBingo: false,
        isOnline: true,
        lastSeenAt: new Date(),
      };

      playerRepository.create.mockResolvedValue(mockPlayer);

      const result = await service.registerPlayer(mockPlayer);

      expect(playerRepository.create).toHaveBeenCalledWith(mockPlayer);
      expect(result).toEqual(mockPlayer);
    });
  });

  describe('generateBingoCard', () => {
    it('should generate a bingo card for a player', async () => {
      const playerId = 'player-id';
      const mockPlayer: PlayerEntity = {
        id: playerId,
        gameId: 'game-id',
        name: 'Test Player',
        card: {
          grid: [],
        },
        punchedNumbers: [],
        hasBingo: false,
        isOnline: true,
        lastSeenAt: new Date(),
      };

      playerRepository.findById.mockResolvedValue(mockPlayer);
      playerRepository.update.mockImplementation((id, updatedPlayer) => {
        return Promise.resolve({
          ...mockPlayer,
          ...updatedPlayer,
        });
      });

      const result = await service.generateBingoCard(playerId);

      expect(playerRepository.findById).toHaveBeenCalledWith(playerId);
      expect(playerRepository.update).toHaveBeenCalled();
      expect(result.card).toBeDefined();
      expect(result.card.grid).toBeDefined();
      expect(result.card.grid.length).toBe(5);

      // Each row should have 5 columns
      result.card.grid.forEach((row) => {
        expect(row.length).toBe(5);
      });

      // Center should be free space
      expect(result.card.freeSpace).toEqual({ row: 2, col: 2 });
      expect(result.card.grid[2][2]).toBe(0); // Center should be 0 (free space)

      // Verify column ranges
      const columnRanges = [
        { min: 1, max: 15 }, // B: 1-15
        { min: 16, max: 30 }, // I: 16-30
        { min: 31, max: 45 }, // N: 31-45
        { min: 46, max: 60 }, // G: 46-60
        { min: 61, max: 75 }, // O: 61-75
      ];

      // Check each column follows the correct range
      for (let col = 0; col < 5; col++) {
        const { min, max } = columnRanges[col];
        for (let row = 0; row < 5; row++) {
          // Skip free space
          if (row === 2 && col === 2) continue;

          const value = result.card.grid[row][col];
          expect(value).toBeGreaterThanOrEqual(min);
          expect(value).toBeLessThanOrEqual(max);
        }
      }

      // Check for duplicates
      const allNumbers = result.card.grid.flat().filter((n) => n !== 0);
      const uniqueNumbers = new Set(allNumbers);
      expect(uniqueNumbers.size).toBe(allNumbers.length);
    });

    it('should throw an error if player not found', async () => {
      const playerId = 'non-existent-id';
      playerRepository.findById.mockResolvedValue(null);

      await expect(service.generateBingoCard(playerId)).rejects.toThrow(
        `Player with ID ${playerId} not found`,
      );
    });
  });

  describe('createBingoCard', () => {
    it('should create a valid bingo card with correct structure', () => {
      // We'll test this indirectly through generateBingoCard
      // since createBingoCard is private
      const playerId = 'player-id';
      const mockPlayer: PlayerEntity = {
        id: playerId,
        gameId: 'game-id',
        name: 'Test Player',
        card: {
          grid: [],
        },
        punchedNumbers: [],
        hasBingo: false,
        isOnline: true,
        lastSeenAt: new Date(),
      };

      playerRepository.findById.mockResolvedValue(mockPlayer);
      playerRepository.update.mockImplementation((id, playerUpdate) => {
        return Promise.resolve({
          ...mockPlayer,
          ...playerUpdate,
        });
      });

      return service.generateBingoCard(playerId).then((result) => {
        const card = result.card;

        // Check card structure
        expect(card).toBeDefined();
        expect(card.grid).toBeDefined();
        expect(card.grid.length).toBe(5);
        expect(card.freeSpace).toEqual({ row: 2, col: 2 });

        // Each row should have 5 columns
        card.grid.forEach((row) => {
          expect(row.length).toBe(5);
        });

        // Center should be free space
        expect(card.grid[2][2]).toBe(0);

        // Verify column ranges
        const columnRanges = [
          { min: 1, max: 15 }, // B: 1-15
          { min: 16, max: 30 }, // I: 16-30
          { min: 31, max: 45 }, // N: 31-45
          { min: 46, max: 60 }, // G: 46-60
          { min: 61, max: 75 }, // O: 61-75
        ];

        // Check each column follows the correct range
        for (let col = 0; col < 5; col++) {
          const { min, max } = columnRanges[col];
          for (let row = 0; row < 5; row++) {
            // Skip free space
            if (row === 2 && col === 2) continue;

            const value = card.grid[row][col];
            expect(value).toBeGreaterThanOrEqual(min);
            expect(value).toBeLessThanOrEqual(max);
          }
        }

        // Check for duplicates
        const allNumbers = card.grid.flat().filter((n) => n !== 0);
        const uniqueNumbers = new Set(allNumbers);
        expect(uniqueNumbers.size).toBe(allNumbers.length);
      });
    });
  });

  describe('updateCardState', () => {
    it('should update card state successfully', async () => {
      const playerId = 'player-id';
      const cardState = [
        [1, 16, 31, 46, 61],
        [2, 17, 32, 47, 62],
        [3, 18, 0, 48, 63],
        [4, 19, 33, 49, 64],
        [5, 20, 34, 50, 65],
      ];

      const mockPlayer: PlayerEntity = {
        id: playerId,
        gameId: 'game-id',
        name: 'Test Player',
        card: {
          grid: cardState,
        },
        punchedNumbers: [],
        hasBingo: false,
        isOnline: true,
        lastSeenAt: new Date(),
      };

      playerRepository.updateCardState.mockResolvedValue(mockPlayer);

      const result = await service.updateCardState(playerId, cardState);

      expect(playerRepository.updateCardState).toHaveBeenCalledWith(
        playerId,
        cardState,
      );
      expect(result).toEqual(mockPlayer);
    });
  });

  describe('updateConnectionState', () => {
    it('should update connection state successfully', async () => {
      const playerId = 'player-id';
      const connected = true;

      const mockPlayer: PlayerEntity = {
        id: playerId,
        gameId: 'game-id',
        name: 'Test Player',
        card: {
          grid: [],
        },
        punchedNumbers: [],
        hasBingo: false,
        isOnline: true,
        lastSeenAt: new Date(),
      };

      playerRepository.updateConnectionState.mockResolvedValue(mockPlayer);

      const result = await service.updateConnectionState(playerId, connected);

      expect(playerRepository.updateConnectionState).toHaveBeenCalledWith(
        playerId,
        connected,
      );
      expect(result).toEqual(mockPlayer);
    });
  });
});
