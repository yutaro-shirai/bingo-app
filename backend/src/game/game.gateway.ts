import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict this to your frontend domain
  },
})
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('GameGateway');

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    this.logger.log(`Ping from ${client.id}`);
    return { event: 'pong', data: { message: 'pong', timestamp: new Date() } };
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    client: Socket,
    payload: { gameId: string; playerName: string },
  ) {
    this.logger.log(
      `Player ${payload.playerName} joining game ${payload.gameId}`,
    );

    // Join the socket to a room with the game ID
    client.join(payload.gameId);

    // Broadcast to all clients in the game room that a new player has joined
    this.server.to(payload.gameId).emit('playerJoined', {
      playerId: client.id,
      playerName: payload.playerName,
      timestamp: new Date(),
    });

    return {
      event: 'gameJoined',
      data: {
        message: `Successfully joined game ${payload.gameId}`,
        gameId: payload.gameId,
        playerId: client.id,
      },
    };
  }
}
