import { Test, TestingModule } from '@nestjs/testing';
import { PlayerController } from '../player.controller';
import { PlayerService } from '../player.service';
import { GameService } from '../game.service';
import { PlayerEntity } from '../entities/player.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PlayerController', () => {
  let controller: PlayerController;
  let playerService: PlayerService;
  let gameService: GameService;

  const mockPlayerService = {
    registerPlayer: jest.fn(),
    generateBingoCard: jest.fn(),
    getPlayerById: jest.fn(),
    updateCardState: jest.fn(),
    updateConnectionState: jest.fn(),
    updateBingoStatus: jest.fn(),
  };

  const mockGameService = {
    getGameByCode: jest.fn(),
    getGameById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerController],
      providers: [
        { provide: PlayerService, useValue: mockPlayerService },
        { provide: GameService, useValue: mockGameService },
      ],
    }).compile();

    controller = module.get<PlayerController>(PlayerController);
    playerService = module.get<PlayerService>(PlayerService);
    gameService = module.get<GameService>(GameService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('registerPlayer', () => {
    it('should register a player successfully', async () => {
      const gameCode = 'ABC123';
      const playerName = 'Test Player';
      
      const mockGame = {
        id: 'game-id',
        status: 'active',
      };
      
      const mockPlayer = {
        id: 'player-id',
        gameId: 'game-id',
        name: playerName,
      } as PlayerEntity;
      
      const mockPlayerWithCard = {
        ...mockPlayer,
        card: { grid: [[1, 2], [3, 4]] },
      } as PlayerEntity;
      
      mockGameService.getGameByCode.mockResolvedValue(mockGame);
      mockPlayerService.registerPlayer.mockResolvedValue(mockPlayer);
      mockPlayerService.generateBingoCard.mockResolvedValue(mockPlayerWithCard);
      
      const result = await controller.registerPlayer({ gameCode, name: playerName });
      
      expect(mockGameService.getGameByCode).toHaveBeenCalledWith(gameCode);
      expect(mockPlayerService.registerPlayer).toHaveBeenCalled();
      expect(mockPlayerService.generateBingoCard).toHaveBeenCalledWith(mockPlayer.id);
      expect(result).toBeDefined();
      expect(result.name).toBe(playerName);
    });
    
    it('should throw NotFoundException when game not found', async () => {
      mockGameService.getGameByCode.mockResolvedValue(null);
      
      await expect(controller.registerPlayer({ 
        gameCode: 'INVALID', 
        name: 'Test Player' 
      })).rejects.toThrow(NotFoundException);
    });
    
    it('should throw BadRequestException when game has ended', async () => {
      mockGameService.getGameByCode.mockResolvedValue({ 
        id: 'game-id', 
        status: 'ended' 
      });
      
      await expect(controller.registerPlayer({ 
        gameCode: 'ABC123', 
        name: 'Test Player' 
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPlayerById', () => {
    it('should return a player by ID', async () => {
      const playerId = 'player-id';
      const mockPlayer = { id: playerId, name: 'Test Player' };
      
      mockPlayerService.getPlayerById.mockResolvedValue(mockPlayer);
      
      const result = await controller.getPlayerById(playerId);
      
      expect(mockPlayerService.getPlayerById).toHaveBeenCalledWith(playerId);
      expect(result).toEqual(mockPlayer);
    });
    
    it('should throw NotFoundException when player not found', async () => {
      const playerId = 'invalid-id';
      
      mockPlayerService.getPlayerById.mockRejectedValue(
        new NotFoundException(`Player with ID ${playerId} not found`)
      );
      
      await expect(controller.getPlayerById(playerId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePunchedNumbers', () => {
    it('should update punched numbers', async () => {
      const playerId = 'player-id';
      const number = 42;
      
      const mockPlayer = { 
        id: playerId, 
        punchedNumbers: [] 
      };
      
      const mockUpdatedPlayer = { 
        id: playerId, 
        punchedNumbers: [number] 
      };
      
      mockPlayerService.getPlayerById.mockResolvedValue(mockPlayer);
      mockPlayerService.updateCardState.mockResolvedValue(mockUpdatedPlayer);
      
      const result = await controller.updatePunchedNumbers(playerId, { number });
      
      expect(mockPlayerService.getPlayerById).toHaveBeenCalledWith(playerId);
      expect(mockPlayerService.updateCardState).toHaveBeenCalledWith(playerId, [number]);
      expect(result).toEqual(mockUpdatedPlayer);
    });
  });

  describe('claimBingo', () => {
    it('should claim bingo for a player', async () => {
      const playerId = 'player-id';
      
      const mockPlayer = { 
        id: playerId, 
        gameId: 'game-id',
        hasBingo: false 
      };
      
      const mockGame = { id: 'game-id' };
      
      const mockUpdatedPlayer = { 
        id: playerId, 
        hasBingo: true,
        bingoAchievedAt: expect.any(Date)
      };
      
      mockPlayerService.getPlayerById.mockResolvedValue(mockPlayer);
      mockGameService.getGameById.mockResolvedValue(mockGame);
      mockPlayerService.updateBingoStatus.mockResolvedValue(mockUpdatedPlayer);
      
      const result = await controller.claimBingo(playerId);
      
      expect(mockPlayerService.getPlayerById).toHaveBeenCalledWith(playerId);
      expect(mockGameService.getGameById).toHaveBeenCalledWith(mockPlayer.gameId);
      expect(mockPlayerService.updateBingoStatus).toHaveBeenCalledWith(playerId, true);
      expect(result).toEqual(mockUpdatedPlayer);
    });
  });
});