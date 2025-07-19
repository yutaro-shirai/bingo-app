import { PlayerEntity, BingoCardEntity } from '../entities/player.entity';
import { BingoCard, Player } from 'shared';

/**
 * Player response DTO
 */
export class PlayerResponseDto implements Player {
  id: string;
  gameId: string;
  name: string;
  card: BingoCard;
  punchedNumbers: number[];
  hasBingo: boolean;
  bingoAchievedAt?: Date;
  connectionId?: string;
  isOnline: boolean;
  lastSeenAt: Date;

  constructor(entity: PlayerEntity) {
    this.id = entity.id;
    this.gameId = entity.gameId;
    this.name = entity.name;
    this.card = {
      grid: entity.card.grid,
      freeSpace: entity.card.freeSpace,
    };
    this.punchedNumbers = entity.punchedNumbers;
    this.hasBingo = entity.hasBingo;
    this.bingoAchievedAt = entity.bingoAchievedAt;
    this.connectionId = entity.connectionId;
    this.isOnline = entity.isOnline;
    this.lastSeenAt = entity.lastSeenAt;
  }
}

/**
 * Player registration DTO
 */
export class PlayerRegisterDto {
  gameCode: string;
  name: string;
}

/**
 * Player update DTO
 */
export class PlayerUpdateDto {
  punchedNumbers?: number[];
  hasBingo?: boolean;
  bingoAchievedAt?: Date;
  isOnline?: boolean;
  connectionId?: string;
  lastSeenAt?: Date;
}
