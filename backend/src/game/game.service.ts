import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { GameEntity } from './entities/game.entity';
import { PlayerEntity } from './entities/player.entity';
import { IGameRepository } from './repositories/game.repository.interface';
import { IPlayerRepository } from './repositories/player.repository.interface';
import { AppLoggerService } from '../common/logger/logger.service';
import {
  GameStatus,
  DrawMode,
  GameCreateDto,
  GameUpdateDto,
  Game,
  BingoCard,
} from 'shared';
import { string } from 'zod';
import { async } from 'rxjs';
import { async } from 'rxjs';

@Injectable()
export class GameService {
  private readonly logger: AppLoggerService;

  constructor(
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
    @Inject('IPlayerRepository')
    private readonly playerRepository: IPlayerRepository,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.setContext(GameService.name);
  }

  /**
   * Create a new game
   */
  async createGame(createDto: GameCreateDto): Promise<GameEntity> {
    const gameId = uuidv4();
    const gameCode = this.generateGameCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now

    const game: GameEntity = {
      id: gameId,
      code: gameCode,
      status: GameStatus.CREATED,
      createdAt: now,
      expiresAt,
      drawMode: createDto.drawMode,
      drawInterval: createDto.drawInterval ?? undefined,
      drawnNumbers: [],
      playerCount: 0,
      activePlayerCount: 0,
      bingoCount: 0,
      adminConnections: [],
    };

    this.logger.log(`Creating new game with ID: ${gameId}, Code: ${gameCode}`);
    return await this.gameRepository.create(game);
  }

  /**
   * Start a game
   */
  async startGame(gameId: string): Promise<GameEntity> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }

    if (game.status !== GameStatus.CREATED) {
      throw new BadRequestException(
        `Game cannot be started from status: ${game.status}`,
      );
    }

    const now = new Date();
    const updatedGame = await this.gameRepository.update(gameId, {
      status: GameStatus.ACTIVE,
      startedAt: now,
    });

    this.logger.log(`Game ${gameId} started`);
    return updatedGame;
  }

  /**
   * Pause a game
   */
  async pauseGame(gameId: string): Promise<GameEntity> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }

    if (game.status !== GameStatus.ACTIVE) {
      throw new BadRequestException(
        `Game cannot be paused from status: ${game.status}`,
      );
    }

    const updatedGame = await this.gameRepository.update(gameId, {
      status: GameStatus.PAUSED,
    });

    this.logger.log(`Game ${gameId} paused`);
    return updatedGame;
  }

  /**
   * Resume a paused game
   */
  async resumeGame(gameId: string): Promise<GameEntity> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }

    if (game.status !== GameStatus.PAUSED) {
      throw new BadRequestException(
        `Game cannot be resumed from status: ${game.status}`,
      );
    }

    const updatedGame = await this.gameRepository.update(gameId, {
      status: GameStatus.ACTIVE,
    });

    this.logger.log(`Game ${gameId} resumed`);
    return updatedGame;
  }

  /**
   * End a game
   */
  async endGame(gameId: string): Promise<GameEntity> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }

    if (game.status === GameStatus.ENDED) {
      throw new BadRequestException('Game is already ended');
    }

    const now = new Date();
    const updatedGame = await this.gameRepository.update(gameId, {
      status: GameStatus.ENDED,
      endedAt: now,
    });

    this.logger.log(`Game ${gameId} ended`);
    return updatedGame;
  }

  /**
   * Update game settings
   */
  async updateGame(
    gameId: string,
    updateDto: GameUpdateDto,
  ): Promise<GameEntity> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }

    // Convert null to undefined for drawInterval
    const sanitizedUpdateDto = {
      ...updateDto,
      drawInterval: updateDto.drawInterval ?? undefined,
    };

    const updatedGame = await this.gameRepository.update(gameId, sanitizedUpdateDto);
    this.logger.log(`Game ${gameId} updated`);
    return updatedGame;
  }

  /**
   * Get game by ID
   */
  async getGameById(gameId: string): Promise<GameEntity> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }
    return game;
  }

  /**
   * Get game by code
   */
  async getGameByCode(code: string): Promise<GameEntity> {
    const game = await this.gameRepository.findByCode(code);
    if (!game) {
      throw new NotFoundException(`Game with code ${code} not found`);
    }
    return game;
  }

  /**
   * Draw next number manually
   */
  async drawNumber(gameId: string): Promise<{ game: GameEntity; number: number }> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }

    if (game.status !== GameStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot draw number when game status is: ${game.status}`,
      );
    }

    const availableNumbers = this.getAvailableNumbers(game.drawnNumbers);
    if (availableNumbers.length === 0) {
      throw new BadRequestException('All numbers have been drawn');
    }

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const drawnNumber = availableNumbers[randomIndex];

    const updatedGame = await this.gameRepository.addDrawnNumber(
      gameId,
      drawnNumber,
    );

    this.logger.log(`Number ${drawnNumber} drawn for game ${gameId}`);
    return { game: updatedGame, number: drawnNumber };
  }

  /**
   * Get next number for automatic drawing (used by scheduled tasks)
   */
  async getNextAutoDrawNumber(gameId: string): Promise<number | null> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      return null;
    }

    if (
      game.status !== GameStatus.ACTIVE ||
      game.drawMode !== DrawMode.TIMED
    ) {
      return null;
    }

    // Check if enough time has passed since last draw
    if (game.lastDrawnAt && game.drawInterval) {
      const timeSinceLastDraw =
        Date.now() - game.lastDrawnAt.getTime();
      const intervalMs = game.drawInterval * 1000;

      if (timeSinceLastDraw < intervalMs) {
        return null; // Not time for next draw yet
      }
    }

    const availableNumbers = this.getAvailableNumbers(game.drawnNumbers);
    if (availableNumbers.length === 0) {
      return null; // All numbers drawn
    }

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    return availableNumbers[randomIndex];
  }

  /**
   * Validate bingo for a player
   */
  async validateBingo(
    playerId: string,
    punchedNumbers: number[],
  ): Promise<boolean> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundException(`Player with ID ${playerId} not found`);
    }

    const game = await this.gameRepository.findById(player.gameId);
    if (!game) {
      throw new NotFoundException(`Game with ID ${player.gameId} not found`);
    }

    // Check if all punched numbers have been drawn
    const validPunchedNumbers = punchedNumbers.filter((num) =>
      game.drawnNumbers.includes(num),
    );

    if (validPunchedNumbers.length !== punchedNumbers.length) {
      return false; // Player punched numbers that haven't been drawn
    }

    // Check for bingo patterns on the card
    const hasBingo = this.checkBingoPatterns(player.card, punchedNumbers);

    if (hasBingo && !player.hasBingo) {
      // Player achieved bingo for the first time
      await this.playerRepository.update(playerId, {
        hasBingo: true,
        bingoAchievedAt: new Date(),
        punchedNumbers: validPunchedNumbers,
      });

      // Increment game bingo count
      await this.gameRepository.incrementBingoCount(player.gameId);

      this.logger.log(`Player ${playerId} achieved bingo in game ${player.gameId}`);
    }

    return hasBingo;
  }

  /**
   * Get game statistics
   */
  async getGameStatistics(gameId: string): Promise<{
    totalPlayers: number;
    activePlayers: number;
    playersWithBingo: number;
    drawnNumbersCount: number;
    remainingNumbers: number;
    gameStatus: GameStatus;
  }> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }

    const remainingNumbers = this.getAvailableNumbers(game.drawnNumbers).length;

    return {
      totalPlayers: game.playerCount,
      activePlayers: game.activePlayerCount,
      playersWithBingo: game.bingoCount,
      drawnNumbersCount: game.drawnNumbers.length,
      remainingNumbers,
      gameStatus: game.status,
    };
  }

  /**
   * Generate a unique game code
   */
  private generateGameCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get available numbers that haven't been drawn yet
   */
  private getAvailableNumbers(drawnNumbers: number[]): number[] {
    const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1); // Bingo numbers 1-75
    return allNumbers.filter((num) => !drawnNumbers.includes(num));
  }

  /**
   * Check if the punched numbers form a bingo pattern
   */
  private checkBingoPatterns(card: BingoCard, punchedNumbers: number[]): boolean {
    const grid = card.grid;
    const size = 5;

    // Create a boolean grid of punched positions
    const punchedGrid: boolean[][] = Array(size)
      .fill(null)
      .map(() => Array(size).fill(false));

    // Mark punched positions
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const cellValue = grid[row][col];
        if (punchedNumbers.includes(cellValue)) {
          punchedGrid[row][col] = true;
        }
      }
    }

    // Handle free space if it exists
    if (card.freeSpace) {
      punchedGrid[card.freeSpace.row][card.freeSpace.col] = true;
    }

    // Check rows
    for (let row = 0; row < size; row++) {
      if (punchedGrid[row].every((cell) => cell)) {
        return true;
      }
    }

    // Check columns
    for (let col = 0; col < size; col++) {
      if (punchedGrid.every((row) => row[col])) {
        return true;
      }
    }

    // Check diagonal (top-left to bottom-right)
    if (punchedGrid.every((row, index) => row[index])) {
      return true;
    }

    // Check diagonal (top-right to bottom-left)
    if (punchedGrid.every((row, index) => row[size - 1 - index])) {
      return true;
    }

    return false;
  }
}  /**
 
  * Log metrics about game activity
   */
  async logGameMetrics(gameId: string): Promise<void> {
    try {
      const game = await this.gameRepository.findById(gameId);
      if (!game) {
        return;
      }
      
      // Log concurrent players metric
      this.logger.logMetric('ConcurrentPlayers', game.activePlayerCount, 'Count', {
        GameId: gameId,
        GameStatus: game.status,
      });
      
      // Log total players metric
      this.logger.logMetric('TotalPlayers', game.playerCount, 'Count', {
        GameId: gameId,
        GameStatus: game.status,
      });
      
      // Log bingo count metric
      this.logger.logMetric('BingoCount', game.bingoCount, 'Count', {
        GameId: gameId,
        GameStatus: game.status,
      });
      
      // Log drawn numbers count
      this.logger.logMetric('DrawnNumbersCount', game.drawnNumbers.length, 'Count', {
        GameId: gameId,
        GameStatus: game.status,
      });
      
      // Log game duration if active
      if (game.status === GameStatus.ACTIVE && game.startedAt) {
        const durationMinutes = (Date.now() - game.startedAt.getTime()) / (1000 * 60);
        this.logger.logMetric('GameDuration', durationMinutes, 'Minutes', {
          GameId: gameId,
        });
      }
    } catch (error) {
      // Don't let metric logging failures affect the application
      this.logger.warn(`Failed to log game metrics: ${error.message}`);
    }
  }