import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameGateway } from './game.gateway';
import { DynamoDBModule } from '../common/dynamodb/dynamodb.module';
import { GameRepository } from './repositories/game.repository';
import { PlayerRepository } from './repositories/player.repository';
import { PlayerService } from './player.service';

@Module({
  imports: [ConfigModule, DynamoDBModule],
  providers: [
    GameGateway,
    {
      provide: 'IGameRepository',
      useClass: GameRepository,
    },
    {
      provide: 'IPlayerRepository',
      useClass: PlayerRepository,
    },
    PlayerService,
  ],
  exports: ['IGameRepository', 'IPlayerRepository', PlayerService],
})
export class GameModule {}
