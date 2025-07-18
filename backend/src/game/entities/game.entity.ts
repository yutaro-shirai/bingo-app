import { DrawMode, GameStatus } from '../../../shared/types';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Game entity for database storage
 */
export class GameEntity {
  /**
   * Unique identifier
   */
  @IsString()
  @IsNotEmpty()
  id: string;

  /**
   * Short code for joining the game
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(8)
  code: string;

  /**
   * Game status
   */
  @IsEnum(GameStatus)
  status: GameStatus;

  /**
   * Creation timestamp
   */
  @IsDate()
  createdAt: Date;

  /**
   * Game start timestamp
   */
  @IsDate()
  @IsOptional()
  startedAt?: Date;

  /**
   * Game end timestamp
   */
  @IsDate()
  @IsOptional()
  endedAt?: Date;

  /**
   * TTL for DynamoDB (max 12 hours)
   */
  @IsDate()
  expiresAt: Date;

  /**
   * Draw mode ('manual' or 'timed')
   */
  @IsEnum(DrawMode)
  drawMode: DrawMode;

  /**
   * Interval in seconds for timed mode
   */
  @IsInt()
  @IsPositive()
  @IsOptional()
  drawInterval?: number;

  /**
   * Numbers that have been called
   */
  @IsArray()
  @IsInt({ each: true })
  drawnNumbers: number[];

  /**
   * Timestamp of last number draw
   */
  @IsDate()
  @IsOptional()
  lastDrawnAt?: Date;

  /**
   * Number of registered players
   */
  @IsInt()
  @IsPositive()
  playerCount: number;

  /**
   * Number of currently connected players
   */
  @IsInt()
  @IsPositive()
  activePlayerCount: number;

  /**
   * Number of players who have reached bingo
   */
  @IsInt()
  @IsPositive()
  bingoCount: number;

  /**
   * Admin connection IDs
   */
  @IsArray()
  @IsString({ each: true })
  adminConnections: string[];
}
