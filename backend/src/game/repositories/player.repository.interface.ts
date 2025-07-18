import { PlayerEntity } from '../entities/player.entity';

export interface IPlayerRepository {
  findById(id: string): Promise<PlayerEntity | null>;
  findByGameId(gameId: string): Promise<PlayerEntity[]>;
  create(player: PlayerEntity): Promise<PlayerEntity>;
  update(id: string, player: Partial<PlayerEntity>): Promise<PlayerEntity>;
  delete(id: string): Promise<void>;
  // カード状態の永続化
  updateCardState(id: string, cardState: number[][]): Promise<PlayerEntity>;
  // 接続状態の管理
  updateConnectionState(id: string, connected: boolean): Promise<PlayerEntity>;
}
