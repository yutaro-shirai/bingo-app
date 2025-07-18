import { GameEntity } from '../entities/game.entity';
import { PlayerEntity } from '../entities/player.entity';
import { GameStatus, DrawMode } from 'shared';
import {
  MessageOptimizer,
  PropertyMaps,
} from '../../common/utils/message-optimizer';

/**
 * Optimized DTO for game state
 * Uses message optimizer to reduce payload size
 */
export class OptimizedGameDto {
  // Game ID
  i: string;

  // Game code
  c: string;

  // Game status
  s: GameStatus;

  // Draw mode
  dm: DrawMode;

  // Drawn numbers
  dn: number[];

  // Player count
  pc: number;

  // Active player count
  ap: number;

  // Bingo count
  bc: number;

  /**
   * Convert from entity to optimized DTO
   */
  static fromEntity(entity: GameEntity): OptimizedGameDto {
    // Use message optimizer to compress the entity
    return MessageOptimizer.optimizeForTransmission(
      entity,
      PropertyMaps.Game,
    ) as OptimizedGameDto;
  }
}

/**
 * Optimized DTO for number drawn event
 */
export class OptimizedNumberDrawnDto {
  // Drawn number
  n: number;

  /**
   * Create from number
   */
  static create(number: number): OptimizedNumberDrawnDto {
    // Use message optimizer to compress the data
    return MessageOptimizer.optimizeForTransmission(
      { number },
      { number: 'n' },
    ) as OptimizedNumberDrawnDto;
  }
}

/**
 * Optimized DTO for player joined event
 */
export class OptimizedPlayerJoinedDto {
  // Player ID
  i: string;

  // Player name
  n: string;

  /**
   * Create from player data
   */
  static create(
    playerId: string,
    playerName: string,
  ): OptimizedPlayerJoinedDto {
    // Use message optimizer to compress the data
    return MessageOptimizer.optimizeForTransmission(
      { playerId, playerName },
      { playerId: 'i', playerName: 'n' },
    ) as OptimizedPlayerJoinedDto;
  }
}

/**
 * Optimized DTO for player bingo event
 */
export class OptimizedPlayerBingoDto {
  // Player ID
  i: string;

  // Player name
  n: string;

  /**
   * Create from player data
   */
  static create(playerId: string, playerName: string): OptimizedPlayerBingoDto {
    // Use message optimizer to compress the data
    return MessageOptimizer.optimizeForTransmission(
      { playerId, playerName },
      { playerId: 'i', playerName: 'n' },
    ) as OptimizedPlayerBingoDto;
  }
}
