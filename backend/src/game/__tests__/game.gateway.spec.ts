import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from '../game.gateway';
import { GameService } from '../game.service';
import { PlayerService } from '../player.service';
import { WsException } from '@nestjs/websockets';
import { GameStatus, DrawMode } from 'shared';
import { GameEntity } from '../entities/game.entity';
import { PlayerEntity } from '../entities/player.entity';
import { OptimizedGameDto, OptimizedNumberDrawnDto, OptimizedPlayerJoinedDto } from '../dto/optimized-game.dto';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let gameService: jest.Mocked<GameService>;
  let playerService: jest.Mocked<PlayerService>;

  const mockGameService = {
    getGameById: jest.fn(),
    updateAdminConnection: jest.fn(),
    validateBingo: jest.fn(),
    drawNumber: jest.fn(),
  };

  const mockPlayerService = {
    getPlayerById: jest.fn(),
    updateConnectionState: jest.fn(),
    punchNumber: jest.fn(),
    unpunchNumber: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        { provide: GameService, useValue: mockGameService },
        { provide: PlayerService, useValue: mockPlayerService },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    gameService = module.get(GameService) as jest.Mocked<GameService>;
    playerService = module.get(PlayerService) as jest.Mocked<PlayerService>;

    // Mock server
    gateway.server = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    } as any;
  });

  describe('handleConnection', () => {
    it('should handle admin connection', async () => {
      const mockClient = {
        id: 'socket-id',
        handshake: {
          headers: {
            'game-id': 'game-123',
            'authorization': 'Bearer admin-token',
          },
        },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      const mockGame: GameEntity = {
        id: 'game-123',
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [1, 2, 3],
        playerCount: 10,
        activePlayerCount: 8,
        bingoCount: 2,
        adminConnections: [],
      };

      gameService.getGameById.mockResolvedValue(mockGame);
      gameService.updateAdminConnection.mockResolvedValue(mockGame);

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('game:game-123');
      expect(gameService.updateAdminConnection).toHaveBeenCalledWith('game-123', 'socket-id', true);
      expect(gameService.getGameById).toHaveBeenCalledWith('game-123');
      expect(mockClient.emit).toHaveBeenCalledWith('gameState', expect.any(OptimizedGameDto));
    });

    it('should handle player connection', async () => {
      const mockClient = {
        id: 'socket-id',
        handshake: {
          headers: {
            'game-id': 'game-123',
            'player-id': 'player-456',
          },
        },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      const mockGame: GameEntity = {
        id: 'game-123',
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [1, 2, 3],
        playerCount: 10,
        activePlayerCount: 8,
        bingoCount: 2,
        adminConnections: [],
      };

      const mockPlayer: PlayerEntity = {
        id: 'player-456',
        gameId: 'game-123',
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
        punchedNumbers: [1, 2, 3],
        hasBingo: false,
        isOnline: true,
        lastSeenAt: new Date(),
      };

      gameService.getGameById.mockResolvedValue(mockGame);
      playerService.getPlayerById.mockResolvedValue(mockPlayer);
      playerService.updateConnectionState.mockResolvedValue(mockPlayer);

      await gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('game:game-123');
      expect(playerService.updateConnectionState).toHaveBeenCalledWith('player-456', true);
      expect(gameService.getGameById).toHaveBeenCalledWith('game-123');
      expect(playerService.getPlayerById).toHaveBeenCalledWith('player-456');
      expect(mockClient.emit).toHaveBeenCalledWith('gameState', expect.any(OptimizedGameDto));
      expect(mockClient.emit).toHaveBeenCalledWith('playerState', mockPlayer);
    });

    it('should disconnect client if no game ID provided', async () => {
      const mockClient = {
        id: 'socket-id',
        handshake: {
          headers: {},
        },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalled();
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('should disconnect client if player connection without player ID', async () => {
      const mockClient = {
        id: 'socket-id',
        handshake: {
          headers: {
            'game-id': 'game-123',
          },
        },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalled();
      expect(mockClient.join).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should handle player disconnection', async () => {
      const mockClient = {
        id: 'socket-id',
        leave: jest.fn(),
      } as any;

      // Set up player socket mapping
      (gateway as any).socketPlayers.set('socket-id', 'player-456');
      (gateway as any).playerSockets.set('player-456', 'socket-id');
      (gateway as any).gameRooms.set('game-123', new Set(['socket-id']));

      await gateway.handleDisconnect(mockClient);

      expect(playerService.updateConnectionState).toHaveBeenCalledWith('player-456', false);
      expect((gateway as any).socketPlayers.has('socket-id')).toBe(false);
      expect((gateway as any).playerSockets.has('player-456')).toBe(false);
      expect(mockClient.leave).toHaveBeenCalledWith('game:game-123');
    });

    it('should handle admin disconnection', async () => {
      const mockClient = {
        id: 'socket-id',
        leave: jest.fn(),
      } as any;

      // Set up admin socket mapping
      (gateway as any).gameRooms.set('game-123', new Set(['socket-id']));

      await gateway.handleDisconnect(mockClient);

      expect(gameService.updateAdminConnection).toHaveBeenCalledWith('game-123', 'socket-id', false);
      expect(mockClient.leave).toHaveBeenCalledWith('game:game-123');
    });
  });

  describe('handlePunchNumber', () => {
    it('should punch a number successfully', async () => {
      const mockClient = {
        id: 'socket-id',
      } as any;

      // Set up player socket mapping
      (gateway as any).socketPlayers.set('socket-id', 'player-456');

      playerService.punchNumber.mockResolvedValue({} as any);

      const result = await gateway.handlePunchNumber(mockClient, { number: 42 });

      expect(playerService.punchNumber).toHaveBeenCalledWith('player-456', 42);
      expect(result).toEqual({ success: true });
    });

    it('should throw exception if player not found', async () => {
      const mockClient = {
        id: 'socket-id',
      } as any;

      // No player socket mapping

      await expect(gateway.handlePunchNumber(mockClient, { number: 42 })).rejects.toThrow(WsException);
      expect(playerService.punchNumber).not.toHaveBeenCalled();
    });
  });

  describe('handleUnpunchNumber', () => {
    it('should unpunch a number successfully', async () => {
      const mockClient = {
        id: 'socket-id',
      } as any;

      // Set up player socket mapping
      (gateway as any).socketPlayers.set('socket-id', 'player-456');

      playerService.unpunchNumber.mockResolvedValue({} as any);

      const result = await gateway.handleUnpunchNumber(mockClient, { number: 42 });

      expect(playerService.unpunchNumber).toHaveBeenCalledWith('player-456', 42);
      expect(result).toEqual({ success: true });
    });
  });

  describe('handleValidateBingo', () => {
    it('should validate bingo successfully and broadcast if valid', async () => {
      const mockClient = {
        id: 'socket-id',
      } as any;

      // Set up player socket mapping
      (gateway as any).socketPlayers.set('socket-id', 'player-456');

      const mockPlayer: PlayerEntity = {
        id: 'player-456',
        gameId: 'game-123',
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
        punchedNumbers: [1, 2, 3, 4, 5],
        hasBingo: true,
        isOnline: true,
        lastSeenAt: new Date(),
      };

      gameService.validateBingo.mockResolvedValue(true);
      playerService.getPlayerById.mockResolvedValue(mockPlayer);

      const result = await gateway.handleValidateBingo(mockClient, { punchedNumbers: [1, 2, 3, 4, 5] });

      expect(gameService.validateBingo).toHaveBeenCalledWith('player-456', [1, 2, 3, 4, 5]);
      expect(playerService.getPlayerById).toHaveBeenCalledWith('player-456');
      expect(gateway.server.to).toHaveBeenCalledWith('game:game-123');
      expect(gateway.server.to('game:game-123').emit).toHaveBeenCalledWith(
        'playerBingo',
        expect.objectContaining({
          playerId: 'player-456',
          playerName: 'Test Player',
        })
      );
      expect(result).toEqual({ valid: true });
    });

    it('should validate bingo and not broadcast if invalid', async () => {
      const mockClient = {
        id: 'socket-id',
      } as any;

      // Set up player socket mapping
      (gateway as any).socketPlayers.set('socket-id', 'player-456');

      gameService.validateBingo.mockResolvedValue(false);

      const result = await gateway.handleValidateBingo(mockClient, { punchedNumbers: [1, 2, 3, 4, 5] });

      expect(gameService.validateBingo).toHaveBeenCalledWith('player-456', [1, 2, 3, 4, 5]);
      expect(playerService.getPlayerById).not.toHaveBeenCalled();
      expect(gateway.server.to).not.toHaveBeenCalled();
      expect(result).toEqual({ valid: false });
    });
  });

  describe('handleAdminDrawNumber', () => {
    it('should draw a number successfully and broadcast', async () => {
      const mockClient = {
        id: 'socket-id',
      } as any;

      const mockResult = {
        game: {
          id: 'game-123',
          drawnNumbers: [1, 2, 3, 42],
        } as GameEntity,
        number: 42,
      };

      gameService.drawNumber.mockResolvedValue(mockResult);

      const result = await gateway.handleAdminDrawNumber(mockClient, { gameId: 'game-123' });

      expect(gameService.drawNumber).toHaveBeenCalledWith('game-123');
      expect(gateway.server.to).toHaveBeenCalledWith('game:game-123');
      expect(gateway.server.to('game:game-123').emit).toHaveBeenCalledWith(
        'numberDrawn',
        expect.any(OptimizedNumberDrawnDto)
      );
      expect(result).toEqual({ success: true, number: 42 });
    });
  });

  describe('notification methods', () => {
    it('should notify game state changed', () => {
      const mockGame = {
        id: 'game-123',
        status: GameStatus.ACTIVE,
      } as GameEntity;

      gateway.notifyGameStateChanged('game-123', mockGame);

      expect(gateway.server.to).toHaveBeenCalledWith('game:game-123');
      expect(gateway.server.to('game:game-123').emit).toHaveBeenCalledWith(
        'gameStateChanged',
        expect.any(OptimizedGameDto)
      );
    });

    it('should notify player joined', () => {
      gateway.notifyPlayerJoined('game-123', 'player-456', 'Test Player');

      expect(gateway.server.to).toHaveBeenCalledWith('game:game-123');
      expect(gateway.server.to('game:game-123').emit).toHaveBeenCalledWith(
        'playerJoined',
        expect.any(OptimizedPlayerJoinedDto)
      );
    });

    it('should notify number drawn', () => {
      gateway.notifyNumberDrawn('game-123', 42);

      expect(gateway.server.to).toHaveBeenCalledWith('game:game-123');
      expect(gateway.server.to('game:game-123').emit).toHaveBeenCalledWith(
        'numberDrawn',
        expect.any(OptimizedNumberDrawnDto)
      );
    });
  });
});