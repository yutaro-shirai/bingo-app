import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PlayerEntity } from '../entities/player.entity';
import { IPlayerRepository } from './player.repository.interface';
import { DynamoDBService } from '../../common/dynamodb/dynamodb.service';
import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = 'PlayerTable';

@Injectable()
export class PlayerRepository implements IPlayerRepository {
  private readonly logger = new Logger(PlayerRepository.name);

  constructor(
    @Inject(DynamoDBService)
    private readonly dynamodbService: DynamoDBService,
  ) {}

  async findById(id: string): Promise<PlayerEntity | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: { id },
    });
    const result = await this.dynamodbService.documentClient.send(command);
    return result.Item ? (result.Item as PlayerEntity) : null;
  }

  async findByGameId(gameId: string): Promise<PlayerEntity[]> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GameIdIndex',
      KeyConditionExpression: 'gameId = :gameId',
      ExpressionAttributeValues: { ':gameId': gameId },
    });
    const result = await this.dynamodbService.documentClient.send(command);
    return (result.Items as PlayerEntity[]) || [];
  }

  async create(player: PlayerEntity): Promise<PlayerEntity> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: player,
    });
    await this.dynamodbService.documentClient.send(command);
    return player;
  }

  async update(
    id: string,
    player: Partial<PlayerEntity>,
  ): Promise<PlayerEntity> {
    // 簡易実装: 全体上書き
    const existing = await this.findById(id);
    if (!existing) throw new Error('Player not found');
    const updated = { ...existing, ...player };
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: updated,
    });
    await this.dynamodbService.documentClient.send(command);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { id },
    });
    await this.dynamodbService.documentClient.send(command);
  }

  async updateCardState(
    id: string,
    cardState: number[][],
  ): Promise<PlayerEntity> {
    const player = await this.findById(id);
    if (!player) throw new Error('Player not found');
    player.card.grid = cardState;
    await this.update(id, player);
    return player;
  }

  async updateConnectionState(
    id: string,
    connected: boolean,
  ): Promise<PlayerEntity> {
    const player = await this.findById(id);
    if (!player) throw new Error('Player not found');
    player.isOnline = connected;
    player.lastSeenAt = new Date();
    await this.update(id, player);
    return player;
  }
}
