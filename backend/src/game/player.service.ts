import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PlayerEntity, BingoCardEntity } from './entities/player.entity';
import { IPlayerRepository } from './repositories/player.repository.interface';
import { PlayerResponseDto, PlayerUpdateDto } from './dto/player.dto';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  // Bingo card column ranges (standard bingo)
  private readonly COLUMN_RANGES = [
    { min: 1, max: 15 }, // B: 1-15
    { min: 16, max: 30 }, // I: 16-30
    { min: 31, max: 45 }, // N: 31-45
    { min: 46, max: 60 }, // G: 46-60
    { min: 61, max: 75 }, // O: 61-75
  ];

  constructor(
    @Inject('IPlayerRepository')
    private readonly playerRepository: IPlayerRepository,
  ) {}

  /**
   * Register a new player
   * @param player Player entity to register
   * @returns Registered player
   */
  async registerPlayer(player: PlayerEntity): Promise<PlayerEntity> {
    try {
      // TODO: Validation and duplicate checks
      return await this.playerRepository.create(player);
    } catch (error) {
      this.logger.error(
        `Failed to register player: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to register player: ${error.message}`,
      );
    }
  }

  /**
   * Generate a bingo card for a player
   * @param playerId Player ID
   * @returns Updated player with bingo card
   */
  async generateBingoCard(playerId: string): Promise<PlayerEntity> {
    try {
      // Get the player first
      const player = await this.playerRepository.findById(playerId);
      if (!player) {
        throw new NotFoundException(`Player with ID ${playerId} not found`);
      }

      // Generate a new bingo card
      const card = this.createBingoCard();

      // Save and return the updated player
      return await this.playerRepository.update(playerId, { card });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to generate bingo card: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to generate bingo card: ${error.message}`,
      );
    }
  }

  /**
   * Creates a standard 5x5 bingo card with the following properties:
   * - Each column contains numbers from a specific range (B: 1-15, I: 16-30, etc.)
   * - Numbers are randomly selected from their respective ranges
   * - No duplicate numbers on the card
   * - Center position (2,2) is a free space
   *
   * @returns A new BingoCardEntity
   */
  private createBingoCard(): BingoCardEntity {
    // Initialize 5x5 grid with zeros
    const grid: number[][] = Array(5)
      .fill(0)
      .map(() => Array(5).fill(0));

    // For each column
    for (let col = 0; col < 5; col++) {
      // Get the range for this column
      const { min, max } = this.COLUMN_RANGES[col];

      // Create an array of all possible numbers for this column
      const possibleNumbers = Array.from(
        { length: max - min + 1 },
        (_, i) => min + i,
      );

      // Shuffle the possible numbers
      this.shuffleArray(possibleNumbers);

      // For each row in this column
      for (let row = 0; row < 5; row++) {
        // Skip the center position (free space)
        if (row === 2 && col === 2) {
          continue;
        }

        // Assign the next number from our shuffled array
        grid[row][col] = possibleNumbers.pop() as number;
      }
    }

    // Create and return the bingo card entity
    const card = new BingoCardEntity();
    card.grid = grid;
    card.freeSpace = { row: 2, col: 2 };

    return card;
  }

  /**
   * Validates if a bingo card is valid according to standard bingo rules:
   * - 5x5 grid
   * - Each column contains numbers from specific ranges
   * - No duplicate numbers
   * - Center can be a free space
   *
   * @param card The bingo card to validate
   * @returns boolean indicating if the card is valid
   */
  private validateBingoCard(card: BingoCardEntity): boolean {
    if (!card.grid || card.grid.length !== 5) {
      return false;
    }

    // Check each row has 5 columns
    for (const row of card.grid) {
      if (row.length !== 5) {
        return false;
      }
    }

    // Check for duplicates (excluding free space)
    const allNumbers = card.grid.flat().filter((n) => n !== 0);
    const uniqueNumbers = new Set(allNumbers);
    if (uniqueNumbers.size !== allNumbers.length) {
      return false;
    }

    // Check column ranges
    for (let col = 0; col < 5; col++) {
      const { min, max } = this.COLUMN_RANGES[col];

      for (let row = 0; row < 5; row++) {
        // Skip free space
        if (
          card.freeSpace &&
          row === card.freeSpace.row &&
          col === card.freeSpace.col
        ) {
          continue;
        }

        const value = card.grid[row][col];
        if (value < min || value > max) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Shuffles an array in-place using the Fisher-Yates algorithm
   * @param array The array to shuffle
   */
  private shuffleArray(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Update a player's card state (punched numbers)
   * @param playerId Player ID
   * @param punchedNumbers Array of punched numbers
   * @returns Updated player
   */
  async updateCardState(
    playerId: string,
    punchedNumbers: number[],
  ): Promise<PlayerEntity> {
    try {
      const player = await this.playerRepository.findById(playerId);
      if (!player) {
        throw new NotFoundException(`Player with ID ${playerId} not found`);
      }

      return await this.playerRepository.update(playerId, { punchedNumbers });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to update card state: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to update card state: ${error.message}`,
      );
    }
  }

  /**
   * Update a player's connection state
   * @param playerId Player ID
   * @param connected Whether the player is connected
   * @param connectionId Optional WebSocket connection ID
   * @returns Updated player
   */
  async updateConnectionState(
    playerId: string,
    connected: boolean,
    connectionId?: string,
  ): Promise<PlayerEntity> {
    try {
      const player = await this.playerRepository.findById(playerId);
      if (!player) {
        throw new NotFoundException(`Player with ID ${playerId} not found`);
      }

      return await this.playerRepository.updateConnectionState(
        playerId,
        connected,
        connectionId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to update connection state: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to update connection state: ${error.message}`,
      );
    }
  }

  /**
   * Update a player's bingo status
   * @param playerId Player ID
   * @param hasBingo Whether the player has bingo
   * @returns Updated player
   */
  async updateBingoStatus(
    playerId: string,
    hasBingo: boolean,
  ): Promise<PlayerEntity> {
    try {
      const player = await this.playerRepository.findById(playerId);
      if (!player) {
        throw new NotFoundException(`Player with ID ${playerId} not found`);
      }

      // Update the player with bingo status and timestamp if achieved
      return await this.playerRepository.update(playerId, {
        hasBingo,
        bingoAchievedAt: hasBingo ? new Date() : undefined,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to update bingo status: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to update bingo status: ${error.message}`,
      );
    }
  }

  /**
   * Get all players for a game
   * @param gameId Game ID
   * @returns Array of players
   */
  async getPlayersByGameId(gameId: string): Promise<PlayerResponseDto[]> {
    try {
      const players = await this.playerRepository.findByGameId(gameId);
      return players.map((player) => new PlayerResponseDto(player));
    } catch (error) {
      this.logger.error(
        `Failed to get players by game ID: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to get players by game ID: ${error.message}`,
      );
    }
  }

  /**
   * Get a player by ID
   * @param playerId Player ID
   * @returns Player data
   */
  async getPlayerById(playerId: string): Promise<PlayerResponseDto> {
    try {
      const player = await this.playerRepository.findById(playerId);
      if (!player) {
        throw new NotFoundException(`Player with ID ${playerId} not found`);
      }
      return new PlayerResponseDto(player);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to get player by ID: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to get player by ID: ${error.message}`,
      );
    }
  }
}
