import {
  IsArray,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for bingo card
 */
export class BingoCardDto {
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
 * DTO for registering a player
 */
export class RegisterPlayerDto {
  /**
   * Game code to join
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(8)
  gameCode: string;

  /**
   * Player name
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;
}

/**
 * DTO for updating a player
 */
export class UpdatePlayerDto {
  /**
   * Numbers punched by player
   */
  @IsArray()
  @IsOptional()
  punchedNumbers?: number[];

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
  @IsOptional()
  isOnline?: boolean;
}

/**
 * DTO for player response
 */
export class PlayerResponseDto {
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
  @Type(() => BingoCardDto)
  card: BingoCardDto;

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
  @Type(() => Date)
  bingoAchievedAt?: Date;

  /**
   * Connection status
   */
  @IsBoolean()
  isOnline: boolean;

  /**
   * Last activity timestamp
   */
  @IsDate()
  @Type(() => Date)
  lastSeenAt: Date;
}
