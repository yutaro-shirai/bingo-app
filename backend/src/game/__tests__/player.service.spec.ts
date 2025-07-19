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
    findByConnectionId: jest.fn(),
    findBingoPlayersByGameId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateCardState: jest.fn(),
    updateConnectionState: jest.fn(),
    updateBingoStatus: jest.fn(),
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
      const punchedNumbers = [1, 16, 31, 46, 61];

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

      const updatedMockPlayer = {
        ...mockPlayer,
        punchedNumbers,
      };

      playerRepository.findById.mockResolvedValue(mockPlayer);
      playerRepository.update.mockResolvedValue(updatedMockPlayer);

      const result = await service.updateCardState(playerId, punchedNumbers);

      expect(playerRepository.findById).toHaveBeenCalledWith(playerId);
      expect(playerRepository.update).toHaveBeenCalledWith(playerId, {
        punchedNumbers,
      });
      expect(result).toEqual(updatedMockPlayer);
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
describe('updateBingoStatus', () => {
  it('should update bingo status successfully', async () => {
    const playerId = 'player-id';
    const hasBingo = true;

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

    const updatedMockPlayer = {
      ...mockPlayer,
      hasBingo: true,
      bingoAchievedAt: expect.any(Date),
    };

    playerRepository.findById.mockResolvedValue(mockPlayer);
    playerRepository.update.mockResolvedValue(updatedMockPlayer);

    const result = await service.updateBingoStatus(playerId, hasBingo);

    expect(playerRepository.findById).toHaveBeenCalledWith(playerId);
    expect(playerRepository.update).toHaveBeenCalledWith(playerId, {
      hasBingo,
      bingoAchievedAt: expect.any(Date),
    });
    expect(result).toEqual(updatedMockPlayer);
  });

  it('should throw an error if player not found', async () => {
    const playerId = 'non-existent-id';
    playerRepository.findById.mockResolvedValue(null);

    await expect(service.updateBingoStatus(playerId, true)).rejects.toThrow(
      `Player with ID ${playerId} not found`,
    );
  });
});

describe('getPlayersByGameId', () => {
  it('should return all players for a game', async () => {
    const gameId = 'game-id';
    const mockPlayers = [
      {
        id: 'player-1',
        gameId,
        name: 'Player 1',
        card: { grid: [] },
        punchedNumbers: [],
        hasBingo: false,
        isOnline: true,
        lastSeenAt: new Date(),
      },
      {
        id: 'player-2',
        gameId,
        name: 'Player 2',
        card: { grid: [] },
        punchedNumbers: [],
        hasBingo: false,
        isOnline: true,
        lastSeenAt: new Date(),
      },
    ];

    playerRepository.findByGameId.mockResolvedValue(mockPlayers);

    const result = await service.getPlayersByGameId(gameId);

    expect(playerRepository.findByGameId).toHaveBeenCalledWith(gameId);
    expect(result.length).toBe(2);
    expect(result[0]).toBeInstanceOf(Object);
    expect(result[0].id).toBe('player-1');
    expect(result[1].id).toBe('player-2');
  });
});

describe('getPlayerById', () => {
  it('should return a player by ID', async () => {
    const playerId = 'player-id';
    const mockPlayer = {
      id: playerId,
      gameId: 'game-id',
      name: 'Test Player',
      card: { grid: [] },
      punchedNumbers: [],
      hasBingo: false,
      isOnline: true,
      lastSeenAt: new Date(),
    };

    playerRepository.findById.mockResolvedValue(mockPlayer);

    const result = await service.getPlayerById(playerId);

    expect(playerRepository.findById).toHaveBeenCalledWith(playerId);
    expect(result).toBeInstanceOf(Object);
    expect(result.id).toBe(playerId);
  });

  it('should throw an error if player not found', async () => {
    const playerId = 'non-existent-id';
    playerRepository.findById.mockResolvedValue(null);

    await expect(service.getPlayerById(playerId)).rejects.toThrow(
      `Player with ID ${playerId} not found`,
    );
  });
});
