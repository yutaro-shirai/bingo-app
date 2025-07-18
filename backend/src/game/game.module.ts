import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { GameRepository } from './repositories/game.repository';
import { PlayerRepository } from './repositories/player.repository';
import { GameGateway } from './game.gateway';
import { AuthModule } from '../auth/auth.module';
import { DynamoDBModule } from '../common/dynamodb/dynamodb.module';
import { OptimizedGameRepository } from './repositories/optimized-game.repository';

@Module({
  imports: [AuthModule, DynamoDBModule],
  controllers: [GameController],
  providers: [
    GameService,
    PlayerService,
    GameGateway,
    {
      provide: 'IGameRepository',
      // Use optimized repository for better performance
      useClass: OptimizedGameRepository,
    },
    {
      provide: 'IPlayerRepository',
      useClass: PlayerRepository,
    },
  ],
  exports: [GameService, PlayerService],
})
export class GameModule {}
