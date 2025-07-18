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
import { Type } from 'class-transformer';

/**
 * DTO for creating a new game
 */
export class CreateGameDto {
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
}

/**
 * DTO for updating a game
 */
export class UpdateGameDto {
  /**
   * Game status
   */
  @IsEnum(GameStatus)
  @IsOptional()
  status?: GameStatus;

  /**
   * Draw mode ('manual' or 'timed')
   */
  @IsEnum(DrawMode)
  @IsOptional()
  drawMode?: DrawMode;

  /**
   * Interval in seconds for timed mode
   */
  @IsInt()
  @IsPositive()
  @IsOptional()
  drawInterval?: number;
}

/**
 * DTO for drawing a number in a game
 */
export class DrawNumberDto {
  /**
   * Game ID
   */
  @IsString()
  @IsNotEmpty()
  gameId: string;
}

/**
 * DTO for game response
 */
export class GameResponseDto {
  /**
   * Unique identifier
   */
  @IsString()
  @IsNotEmpty()
  id: string;

  /**
   * Short code for joining
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
  @Type(() => Date)
  createdAt: Date;

  /**
   * Game start timestamp
   */
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startedAt?: Date;

  /**
   * Game end timestamp
   */
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endedAt?: Date;

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
  @Type(() => Date)
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
}
