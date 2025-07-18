import { BingoCard } from '../../../shared/types';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * BingoCard entity for database storage
 */
export class BingoCardEntity implements BingoCard {
  /**
   * 5x5 grid of numbers
   */
  @IsArray()
  @IsArray({ each: true })
  grid: number[][];

  /**
   * Optional free space position
   */
  @IsObject()
  @IsOptional()
  freeSpace?: { row: number; col: number };
}

/**
 * Player entity for database storage
 */
export class PlayerEntity {
  /**
   * Unique identifier
   */
  @IsString()
  @IsNotEmpty()
  id: string;

  /**
   * Reference to game
   */
  @IsString()
  @IsNotEmpty()
  gameId: string;

  /**
   * Player name
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  /**
   * Player's bingo card
   */
  @IsObject()
  @ValidateNested()
  @Type(() => BingoCardEntity)
  card: BingoCardEntity;

  /**
   * Numbers punched by player
   */
  @IsArray()
  punchedNumbers: number[];

  /**
   * Whether player has bingo
   */
  @IsBoolean()
  hasBingo: boolean;

  /**
   * When bingo was achieved
   */
  @IsDate()
  @IsOptional()
  bingoAchievedAt?: Date;

  /**
   * Current WebSocket connection ID
   */
  @IsString()
  @IsOptional()
  connectionId?: string;

  /**
   * Connection status
   */
  @IsBoolean()
  isOnline: boolean;

  /**
   * Last activity timestamp
   */
  @IsDate()
  lastSeenAt: Date;
}
