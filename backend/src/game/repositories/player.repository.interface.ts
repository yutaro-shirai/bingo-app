import { PlayerEntity } from '../entities/player.entity';

export interface IPlayerRepository {
  findById(id: string): Promise<PlayerEntity | null>;
  findByGameId(gameId: string): Promise<PlayerEntity[]>;
  findByConnectionId(connectionId: string): Promise<PlayerEntity | null>;
  findBingoPlayersByGameId(gameId: string): Promise<PlayerEntity[]>;
  create(player: PlayerEntity): Promise<PlayerEntity>;
  update(id: string, player: Partial<PlayerEntity>): Promise<PlayerEntity>;
  delete(id: string): Promise<void>;
  // Card state persistence
  updateCardState(id: string, cardState: number[][]): Promise<PlayerEntity>;
  // Connection state management
  updateConnectionState(
    id: string,
    connected: boolean,
    connectionId?: string,
  ): Promise<PlayerEntity>;
  // Bingo status management
  updateBingoStatus(id: string, hasBingo: boolean): Promise<PlayerEntity>;
}
