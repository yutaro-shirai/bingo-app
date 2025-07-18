import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { WsPlayerGuard } from '../auth/guards/ws-player.guard';
import {
  OptimizedGameDto,
  OptimizedNumberDrawnDto,
  OptimizedPlayerJoinedDto,
  OptimizedPlayerBingoDto,
} from './dto/optimized-game.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);
  private readonly playerSockets = new Map<string, string>(); // playerId -> socketId
  private readonly socketPlayers = new Map<string, string>(); // socketId -> playerId
  private readonly gameRooms = new Map<string, Set<string>>(); // gameId -> Set of socketIds

  constructor(
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const gameId = client.handshake.headers['game-id'] as string;
      if (!gameId) {
        this.logger.error('No game ID provided in connection');
        client.disconnect();
        return;
      }

      // Check if this is an admin connection
      const authHeader = client.handshake.headers.authorization as string;
      if (authHeader?.startsWith('Bearer ')) {
        // Admin connection
        this.logger.log(`Admin connected to game ${gameId}`);
        this.joinGameRoom(client, gameId);

        // Update admin connection in game
        await this.gameService.updateAdminConnection(gameId, client.id, true);

        // Send initial game state
        const game = await this.gameService.getGameById(gameId);
        client.emit('gameState', OptimizedGameDto.fromEntity(game));
        return;
      }

      // Player connection
      const playerId = client.handshake.headers['player-id'] as string;
      if (!playerId) {
        this.logger.error('No player ID provided in connection');
        client.disconnect();
        return;
      }

      this.logger.log(`Player ${playerId} connected to game ${gameId}`);

      // Store player connection
      this.playerSockets.set(playerId, client.id);
      this.socketPlayers.set(client.id, playerId);
      this.joinGameRoom(client, gameId);

      // Update player connection status
      await this.playerService.updateConnectionState(playerId, true);

      // Send initial game and player state
      const [game, player] = await Promise.all([
        this.gameService.getGameById(gameId),
        this.playerService.getPlayerById(playerId),
      ]);

      client.emit('gameState', OptimizedGameDto.fromEntity(game));
      client.emit('playerState', player);
    } catch (error) {
      this.logger.error(`Error handling connection: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const playerId = this.socketPlayers.get(client.id);
      if (playerId) {
        this.logger.log(`Player ${playerId} disconnected`);

        // Update player connection status
        await this.playerService.updateConnectionState(playerId, false);

        // Clean up maps
        this.playerSockets.delete(playerId);
        this.socketPlayers.delete(client.id);
      } else {
        // Check if this was an admin connection
        const gameId = this.findGameIdForSocket(client.id);
        if (gameId) {
          this.logger.log(`Admin disconnected from game ${gameId}`);
          await this.gameService.updateAdminConnection(
            gameId,
            client.id,
            false,
          );
        }
      }

      // Remove from all game rooms
      this.leaveAllGameRooms(client);
    } catch (error) {
      this.logger.error(`Error handling disconnection: ${error.message}`);
    }
  }

  @UseGuards(WsPlayerGuard)
  @SubscribeMessage('punchNumber')
  async handlePunchNumber(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { number: number },
  ) {
    try {
      const playerId = this.socketPlayers.get(client.id);
      if (!playerId) {
        throw new WsException('Player not found');
      }

      await this.playerService.punchNumber(playerId, data.number);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error punching number: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  @UseGuards(WsPlayerGuard)
  @SubscribeMessage('unpunchNumber')
  async handleUnpunchNumber(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { number: number },
  ) {
    try {
      const playerId = this.socketPlayers.get(client.id);
      if (!playerId) {
        throw new WsException('Player not found');
      }

      await this.playerService.unpunchNumber(playerId, data.number);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error unpunching number: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  @UseGuards(WsPlayerGuard)
  @SubscribeMessage('validateBingo')
  async handleValidateBingo(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { punchedNumbers: number[] },
  ) {
    try {
      const playerId = this.socketPlayers.get(client.id);
      if (!playerId) {
        throw new WsException('Player not found');
      }

      const isValid = await this.gameService.validateBingo(
        playerId,
        data.punchedNumbers,
      );

      if (isValid) {
        // Get player info to broadcast bingo event
        const player = await this.playerService.getPlayerById(playerId);

        // Broadcast bingo event to all players in the game
        this.server
          .to(`game:${player.gameId}`)
          .emit(
            'playerBingo',
            OptimizedPlayerBingoDto.create(player.id, player.name),
          );
      }

      return { valid: isValid };
    } catch (error) {
      this.logger.error(`Error validating bingo: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('adminDrawNumber')
  async handleAdminDrawNumber(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    try {
      const result = await this.gameService.drawNumber(data.gameId);

      // Broadcast number drawn event to all players in the game
      this.server
        .to(`game:${data.gameId}`)
        .emit('numberDrawn', OptimizedNumberDrawnDto.create(result.number));

      return { success: true, number: result.number };
    } catch (error) {
      this.logger.error(`Error drawing number: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  /**
   * Notify all clients in a game room about a game state change
   */
  notifyGameStateChanged(gameId: string, game: any) {
    this.server
      .to(`game:${gameId}`)
      .emit('gameStateChanged', OptimizedGameDto.fromEntity(game));
  }

  /**
   * Notify all clients in a game room about a new player joining
   */
  notifyPlayerJoined(gameId: string, playerId: string, playerName: string) {
    this.server
      .to(`game:${gameId}`)
      .emit(
        'playerJoined',
        OptimizedPlayerJoinedDto.create(playerId, playerName),
      );
  }

  /**
   * Notify all clients in a game room about a number being drawn
   */
  notifyNumberDrawn(gameId: string, number: number) {
    this.server
      .to(`game:${gameId}`)
      .emit('numberDrawn', OptimizedNumberDrawnDto.create(number));
  }

  /**
   * Join a client to a game room
   */
  private joinGameRoom(client: Socket, gameId: string) {
    client.join(`game:${gameId}`);

    // Track game room membership
    if (!this.gameRooms.has(gameId)) {
      this.gameRooms.set(gameId, new Set());
    }
    this.gameRooms.get(gameId).add(client.id);
  }

  /**
   * Leave all game rooms
   */
  private leaveAllGameRooms(client: Socket) {
    for (const [gameId, socketIds] of this.gameRooms.entries()) {
      if (socketIds.has(client.id)) {
        socketIds.delete(client.id);
        client.leave(`game:${gameId}`);

        // Clean up empty game rooms
        if (socketIds.size === 0) {
          this.gameRooms.delete(gameId);
        }
      }
    }
  }

  /**
   * Find game ID for a socket
   */
  private findGameIdForSocket(socketId: string): string | null {
    for (const [gameId, socketIds] of this.gameRooms.entries()) {
      if (socketIds.has(socketId)) {
        return gameId;
      }
    }
    return null;
  }
}
