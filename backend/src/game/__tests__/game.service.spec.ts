import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GameService } from '../game.service';
import { IGameRepository } from '../repositories/game.repository.interface';
import { IPlayerRepository } from '../repositories/player.repository.interface';
import { GameEntity } from '../entities/game.entity';
import { PlayerEntity } from '../entities/player.entity';
import { GameStatus, DrawMode } from '../../../../shared/types';

describe('GameService', () => {
  let service: GameService;
  let gameRepository: jest.Mocked<IGameRepository>;
  let playerRepository: jest.Mocked<IPlayerRepository>;

  const mockGameRepository = {
    findById: jest.fn(),
    findByCode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByStatus: jest.fn(),
    addDrawnNumber: jest.fn(),
    updateExpiration: jest.fn(),
    updateAdminConnection: jest.fn(),
    incrementPlayerCount: jest.fn(),
    decrementPlayerCount: jest.fn(),
    incrementBingoCount: jest.fn(),
  };

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
        GameService,
        {
          provide: 'IGameRepository',
          useValue: mockGameRepository,
        },
        {
          provide: 'IPlayerRepository',
          useValue: mockPlayerRepository,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    gameRepository = module.get('IGameRepository');
    playerRepository = module.get('IPlayerRepository');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createGame', () => {
    it('should create a new game successfully', async () => {
      const createDto = {
        drawMode: DrawMode.MANUAL,
        drawInterval: null,
      };

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

      gameRepository.create.mockResolvedValue(mockGame);

      const result = await service.createGame(createDto);

      expect(gameRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: GameStatus.CREATED,
          drawMode: DrawMode.MANUAL,
          drawnNumbers: [],
          playerCount: 0,
          activePlayerCount: 0,
          bingoCount: 0,
        }),
      );
      expect(result).toEqual(mockGame);
    });
  });

  describe('startGame', () => {
    it('should start a game successfully', async () => {
      const gameId = 'test-id';
      const mockGame: GameEntity = {
        id: gameId,
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

      const updatedGame = { ...mockGame, status: GameStatus.ACTIVE, startedAt: new Date() };

      gameRepository.findById.mockResolvedValue(mockGame);
      gameRepository.update.mockResolvedValue(updatedGame);

      const result = await service.startGame(gameId);

      expect(gameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(gameRepository.update).toHaveBeenCalledWith(gameId, {
        status: GameStatus.ACTIVE,
        startedAt: expect.any(Date),
      });
      expect(result.status).toBe(GameStatus.ACTIVE);
    });

    it('should throw NotFoundException if game not found', async () => {
      const gameId = 'non-existent-id';
      gameRepository.findById.mockResolvedValue(null);

      await expect(service.startGame(gameId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if game is not in CREATED status', async () => {
      const gameId = 'test-id';
      const mockGame: GameEntity = {
        id: gameId,
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

      gameRepository.findById.mockResolvedValue(mockGame);

      await expect(service.startGame(gameId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('drawNumber', () => {
    it('should draw a number successfully', async () => {
      const gameId = 'test-id';
      const mockGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [1, 2, 3],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      const updatedGame = { ...mockGame, drawnNumbers: [1, 2, 3, 4] };

      gameRepository.findById.mockResolvedValue(mockGame);
      gameRepository.addDrawnNumber.mockResolvedValue(updatedGame);

      const result = await service.drawNumber(gameId);

      expect(gameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(gameRepository.addDrawnNumber).toHaveBeenCalledWith(gameId, expect.any(Number));
      expect(result.game).toEqual(updatedGame);
      expect(typeof result.number).toBe('number');
      expect(result.number).toBeGreaterThan(0);
      expect(result.number).toBeLessThanOrEqual(75);
    });

    it('should throw NotFoundException if game not found', async () => {
      const gameId = 'non-existent-id';
      gameRepository.findById.mockResolvedValue(null);

      await expect(service.drawNumber(gameId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if game is not active', async () => {
      const gameId = 'test-id';
      const mockGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.PAUSED,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      gameRepository.findById.mockResolvedValue(mockGame);

      await expect(service.drawNumber(gameId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if all numbers have been drawn', async () => {
      const gameId = 'test-id';
      const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
      const mockGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: allNumbers,
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      gameRepository.findById.mockResolvedValue(mockGame);

      await expect(service.drawNumber(gameId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateBingo', () => {
    it('should validate bingo correctly for a winning pattern', async () => {
      const playerId = 'player-id';
      const gameId = 'game-id';
      
      const mockPlayer: PlayerEntity = {
        id: playerId,
        gameId,
        name: 'Test Player',
        card: {
          grid: [
            [1, 2, 3, 4, 5],
            [6, 7, 8, 9, 10],
            [11, 12, 13, 14, 15],
            [16, 17, 18, 19, 20],
            [21, 22, 23, 24, 25],
          ],
        },
        punchedNumbers: [],
        hasBingo: false,
        isOnline: true,
        lastSeenAt: new Date(),
      };

      const mockGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [1, 2, 3, 4, 5, 10, 15, 20, 25], // Top row + some others
        playerCount: 1,
        activePlayerCount: 1,
        bingoCount: 0,
        adminConnections: [],
      };

      const punchedNumbers = [1, 2, 3, 4, 5]; // Top row - should be bingo

      playerRepository.findById.mockResolvedValue(mockPlayer);
      gameRepository.findById.mockResolvedValue(mockGame);
      playerRepository.update.mockResolvedValue({ ...mockPlayer, hasBingo: true });
      gameRepository.incrementBingoCount.mockResolvedValue(mockGame);

      const result = await service.validateBingo(playerId, punchedNumbers);

      expect(result).toBe(true);
      expect(playerRepository.update).toHaveBeenCalledWith(playerId, {
        hasBingo: true,
        bingoAchievedAt: expect.any(Date),
        punchedNumbers,
      });
      expect(gameRepository.incrementBingoCount).toHaveBeenCalledWith(gameId);
    });

    it('should return false for invalid punched numbers', async () => {
      const playerId = 'player-id';
      const gameId = 'game-id';
      
      const mockPlayer: PlayerEntity = {
        id: playerId,
        gameId,
        name: 'Test Player',
        card: {
          grid: [
            [1, 2, 3, 4, 5],
            [6, 7, 8, 9, 10],
            [11, 12, 13, 14, 15],
            [16, 17, 18, 19, 20],
            [21, 22, 23, 24, 25],
          ],
        },
        punchedNumbers: [],
        hasBingo: false,
        isOnline: true,
        lastSeenAt: new Date(),
      };

      const mockGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [1, 2, 3], // Only first 3 numbers drawn
        playerCount: 1,
        activePlayerCount: 1,
        bingoCount: 0,
        adminConnections: [],
      };

      const punchedNumbers = [1, 2, 3, 4, 5]; // Player punched 4 and 5 which weren't drawn

      playerRepository.findById.mockResolvedValue(mockPlayer);
      gameRepository.findById.mockResolvedValue(mockGame);

      const result = await service.validateBingo(playerId, punchedNumbers);

      expect(result).toBe(false);
      expect(playerRepository.update).not.toHaveBeenCalled();
      expect(gameRepository.incrementBingoCount).not.toHaveBeenCalled();
    });
  });

  describe('getGameStatistics', () => {
    it('should return correct game statistics', async () => {
      const gameId = 'test-id';
      const mockGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [1, 2, 3, 4, 5],
        playerCount: 10,
        activePlayerCount: 8,
        bingoCount: 2,
        adminConnections: [],
      };

      gameRepository.findById.mockResolvedValue(mockGame);

      const result = await service.getGameStatistics(gameId);

      expect(result).toEqual({
        totalPlayers: 10,
        activePlayers: 8,
        playersWithBingo: 2,
        drawnNumbersCount: 5,
        remainingNumbers: 70, // 75 - 5
        gameStatus: GameStatus.ACTIVE,
      });
    });

    it('should throw NotFoundException if game not found', async () => {
      const gameId = 'non-existent-id';
      gameRepository.findById.mockResolvedValue(null);

      await expect(service.getGameStatistics(gameId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('pauseGame', () => {
    it('should pause a game successfully', async () => {
      const gameId = 'test-id';
      const mockGame: GameEntity = {
        id: gameId,
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

      const updatedGame = { ...mockGame, status: GameStatus.PAUSED };

      gameRepository.findById.mockResolvedValue(mockGame);
      gameRepository.update.mockResolvedValue(updatedGame);

      const result = await service.pauseGame(gameId);

      expect(gameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(gameRepository.update).toHaveBeenCalledWith(gameId, {
        status: GameStatus.PAUSED,
      });
      expect(result.status).toBe(GameStatus.PAUSED);
    });

    it('should throw NotFoundException if game not found', async () => {
      const gameId = 'non-existent-id';
      gameRepository.findById.mockResolvedValue(null);

      await expect(service.pauseGame(gameId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if game is not active', async () => {
      const gameId = 'test-id';
      const mockGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.PAUSED,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      gameRepository.findById.mockResolvedValue(mockGame);

      await expect(service.pauseGame(gameId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('resumeGame', () => {
    it('should resume a game successfully', async () => {
      const gameId = 'test-id';
      const mockGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.PAUSED,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      const updatedGame = { ...mockGame, status: GameStatus.ACTIVE };

      gameRepository.findById.mockResolvedValue(mockGame);
      gameRepository.update.mockResolvedValue(updatedGame);

      const result = await service.resumeGame(gameId);

      expect(gameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(gameRepository.update).toHaveBeenCalledWith(gameId, {
        status: GameStatus.ACTIVE,
      });
      expect(result.status).toBe(GameStatus.ACTIVE);
    });

    it('should throw NotFoundException if game not found', async () => {
      const gameId = 'non-existent-id';
      gameRepository.findById.mockResolvedValue(null);

      await expect(service.resumeGame(gameId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if game is not paused', async () => {
      const gameId = 'test-id';
      const mockGame: GameEntity = {
        id: gameId,
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

      gameRepository.findById.mockResolvedValue(mockGame);

      await expect(service.resumeGame(gameId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('endGame', () => {
    it('should end a game successfully', async () => {
      const gameId = 'test-id';
      const mockGame: GameEntity = {
        id: gameId,
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

      const updatedGame = { 
        ...mockGame, 
        status: GameStatus.ENDED,
        endedAt: expect.any(Date)
      };

      gameRepository.findById.mockResolvedValue(mockGame);
      gameRepository.update.mockResolvedValue(updatedGame);

      const result = await service.endGame(gameId);

      expect(gameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(gameRepository.update).toHaveBeenCalledWith(gameId, {
        status: GameStatus.ENDED,
        endedAt: expect.any(Date),
      });
      expect(result.status).toBe(GameStatus.ENDED);
    });

    it('should throw NotFoundException if game not found', async () => {
      const gameId = 'non-existent-id';
      gameRepository.findById.mockResolvedValue(null);

      await expect(service.endGame(gameId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if game is already ended', async () => {
      const gameId = 'test-id';
      const mockGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.ENDED,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      gameRepository.findById.mockResolvedValue(mockGame);

      await expect(service.endGame(gameId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateGame', () => {
    it('should update game settings successfully', async () => {
      const gameId = 'test-id';
      const mockGame: GameEntity = {
        id: gameId,
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

      const updateDto = {
        drawMode: DrawMode.TIMED,
        drawInterval: 30,
      };

      const updatedGame = { 
        ...mockGame, 
        drawMode: DrawMode.TIMED,
        drawInterval: 30,
      };

      gameRepository.findById.mockResolvedValue(mockGame);
      gameRepository.update.mockResolvedValue(updatedGame);

      const result = await service.updateGame(gameId, updateDto);

      expect(gameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(gameRepository.update).toHaveBeenCalledWith(gameId, {
        drawMode: DrawMode.TIMED,
        drawInterval: 30,
      });
      expect(result.drawMode).toBe(DrawMode.TIMED);
      expect(result.drawInterval).toBe(30);
    });

    it('should handle null drawInterval by converting to undefined', async () => {
      const gameId = 'test-id';
      const mockGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.CREATED,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.TIMED,
        drawInterval: 30,
        drawnNumbers: [],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      const updateDto = {
        drawMode: DrawMode.MANUAL,
        drawInterval: null,
      };

      const updatedGame = { 
        ...mockGame, 
        drawMode: DrawMode.MANUAL,
        drawInterval: undefined,
      };

      gameRepository.findById.mockResolvedValue(mockGame);
      gameRepository.update.mockResolvedValue(updatedGame);

      const result = await service.updateGame(gameId, updateDto);

      expect(gameRepository.update).toHaveBeenCalledWith(gameId, {
        drawMode: DrawMode.MANUAL,
        drawInterval: undefined,
      });
    });

    it('should throw NotFoundException if game not found', async () => {
      const gameId = 'non-existent-id';
      gameRepository.findById.mockResolvedValue(null);

      await expect(service.updateGame(gameId, { drawMode: DrawMode.MANUAL })).rejects.toThrow(NotFoundException);
    });
  });

  describe('getGameById', () => {
    it('should return a game when found', async () => {
      const gameId = 'test-id';
      const mockGame: GameEntity = {
        id: gameId,
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

      gameRepository.findById.mockResolvedValue(mockGame);

      const result = await service.getGameById(gameId);

      expect(gameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(result).toEqual(mockGame);
    });

    it('should throw NotFoundException if game not found', async () => {
      const gameId = 'non-existent-id';
      gameRepository.findById.mockResolvedValue(null);

      await expect(service.getGameById(gameId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getGameByCode', () => {
    it('should return a game when found by code', async () => {
      const gameCode = 'ABC123';
      const mockGame: GameEntity = {
        id: 'test-id',
        code: gameCode,
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

      gameRepository.findByCode.mockResolvedValue(mockGame);

      const result = await service.getGameByCode(gameCode);

      expect(gameRepository.findByCode).toHaveBeenCalledWith(gameCode);
      expect(result).toEqual(mockGame);
    });

    it('should throw NotFoundException if game not found by code', async () => {
      const gameCode = 'INVALID';
      gameRepository.findByCode.mockResolvedValue(null);

      await expect(service.getGameByCode(gameCode)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getNextAutoDrawNumber', () => {
    it('should return next number for auto draw when conditions are met', async () => {
      const gameId = 'test-id';
      const now = new Date();
      const lastDrawnAt = new Date(now.getTime() - 60000); // 1 minute ago
      
      const mockGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.TIMED,
        drawInterval: 30, // 30 seconds
        drawnNumbers: [1, 2, 3],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
        lastDrawnAt,
      };

      gameRepository.findById.mockResolvedValue(mockGame);

      const result = await service.getNextAutoDrawNumber(gameId);

      expect(gameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(75);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(75);
      expect([1, 2, 3].includes(result as number)).toBe(false); // Should not return already drawn numbers
    });

    it('should return null if game not found', async () => {
      const gameId = 'non-existent-id';
      gameRepository.findById.mockResolvedValue(null);

      const result = await service.getNextAutoDrawNumber(gameId);

      expect(result).toBeNull();
    });

    it('should return null if game is not active', async () => {
      const gameId = 'test-id';
      const mockGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.PAUSED,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.TIMED,
        drawInterval: 30,
        drawnNumbers: [1, 2, 3],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      gameRepository.findById.mockResolvedValue(mockGame);

      const result = await service.getNextAutoDrawNumber(gameId);

      expect(result).toBeNull();
    });

    it('should return null if draw mode is not TIMED', async () => {
      const gameId = 'test-id';
      const mockGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [1, 2, 3],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      gameRepository.findById.mockResolvedValue(mockGame);

      const result = await service.getNextAutoDrawNumber(gameId);

      expect(result).toBeNull();
    });

    it('should return null if not enough time has passed since last draw', async () => {
      const gameId = 'test-id';
      const now = new Date();
      const lastDrawnAt = new Date(now.getTime() - 10000); // 10 seconds ago
      
      const mockGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.TIMED,
        drawInterval: 30, // 30 seconds
        drawnNumbers: [1, 2, 3],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
        lastDrawnAt,
      };

      gameRepository.findById.mockResolvedValue(mockGame);

      const result = await service.getNextAutoDrawNumber(gameId);

      expect(result).toBeNull();
    });

    it('should return null if all numbers have been drawn', async () => {
      const gameId = 'test-id';
      const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
      
      const mockGame: GameEntity = {
        id: gameId,
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.TIMED,
        drawInterval: 30,
        drawnNumbers: allNumbers,
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      gameRepository.findById.mockResolvedValue(mockGame);

      const result = await service.getNextAutoDrawNumber(gameId);

      expect(result).toBeNull();
    });
  });
});