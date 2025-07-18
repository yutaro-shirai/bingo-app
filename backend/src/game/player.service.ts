import { Injectable, Inject } from '@nestjs/common';
import { PlayerEntity } from './entities/player.entity';
import { IPlayerRepository } from './repositories/player.repository.interface';

@Injectable()
export class PlayerService {
  constructor(
    @Inject('IPlayerRepository')
    private readonly playerRepository: IPlayerRepository
  ) {}

  // プレイヤー登録
  async registerPlayer(player: PlayerEntity): Promise<PlayerEntity> {
    // TODO: バリデーション・重複チェック等
    return this.playerRepository.create(player);
  }

  // ビンゴカード生成
  async generateBingoCard(playerId: string): Promise<PlayerEntity> {
    // TODO: カード生成ロジック
    throw new Error('Not implemented');
  }

  // カード状態管理
  async updateCardState(
    playerId: string,
    cardState: number[][],
  ): Promise<PlayerEntity> {
    return this.playerRepository.updateCardState(playerId, cardState);
  }

  // 接続状態管理
  async updateConnectionState(
    playerId: string,
    connected: boolean,
  ): Promise<PlayerEntity> {
    return this.playerRepository.updateConnectionState(playerId, connected);
  }
}
