import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GameStatus, DrawMode } from '../src/shared/types';
import { JwtService } from '@nestjs/jwt';
import { io, Socket } from 'socket.io-client';

describe('Game Flow (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let adminToken: string;
  let gameId: string;
  let gameCode: string;
  let player1Id: string;
  let player2Id: string;
  let player1Socket: Socket;
  let player2Socket: Socket;
  let adminSocket: Socket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();

    // Create admin token for authentication
    adminToken = jwtService.sign({
      sub: 'admin',
      username: 'admin',
      isAdmin: true,
    });
  });

  afterAll(async () => {
    if (player1Socket && player1Socket.connected) {
      player1Socket.disconnect();
    }

    if (player2Socket && player2Socket.connected) {
      player2Socket.disconnect();
    }

    if (adminSocket && adminSocket.connected) {
      adminSocket.disconnect();
    }

    await app.close();
  });

  it('should simulate a complete game flow', async () => {
    // Step 1: Admin creates a new game
    const createGameResponse = await request(app.getHttpServer())
      .post('/game')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        drawMode: DrawMode.MANUAL,
        drawInterval: null,
      })
      .expect(201);

    gameId = createGameResponse.body.id;
    gameCode = createGameResponse.body.code;

    expect(gameId).toBeDefined();
    expect(gameCode).toBeDefined();
    expect(createGameResponse.body.status).toBe(GameStatus.CREATED);

    // Step 2: Player 1 joins the game
    const player1Response = await request(app.getHttpServer())
      .post('/player/join')
      .send({
        gameCode,
        playerName: 'Player 1',
      })
      .expect(201);

    player1Id = player1Response.body.id;
    expect(player1Id).toBeDefined();
    expect(player1Response.body.name).toBe('Player 1');
    expect(player1Response.body.card).toBeDefined();

    // Step 3: Player 2 joins the game
    const player2Response = await request(app.getHttpServer())
      .post('/player/join')
      .send({
        gameCode,
        playerName: 'Player 2',
      })
      .expect(201);

    player2Id = player2Response.body.id;
    expect(player2Id).toBeDefined();
    expect(player2Response.body.name).toBe('Player 2');
    expect(player2Response.body.card).toBeDefined();

    // Step 4: Connect WebSockets
    const wsUrl = 'http://localhost:3001'; // Adjust to match your WebSocket server URL

    player1Socket = io(wsUrl, {
      extraHeaders: {
        'player-id': player1Id,
        'game-id': gameId,
      },
      autoConnect: true,
    });

    player2Socket = io(wsUrl, {
      extraHeaders: {
        'player-id': player2Id,
        'game-id': gameId,
      },
      autoConnect: true,
    });

    adminSocket = io(wsUrl, {
      extraHeaders: {
        authorization: `Bearer ${adminToken}`,
        'game-id': gameId,
      },
      autoConnect: true,
    });

    // Wait for connections to establish
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 5: Admin starts the game
    const startGameResponse = await request(app.getHttpServer())
      .post(`/game/${gameId}/start`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(startGameResponse.body.status).toBe(GameStatus.ACTIVE);

    // Step 6: Admin draws several numbers
    const drawnNumbers = [];
    for (let i = 0; i < 10; i++) {
      const drawResponse = await request(app.getHttpServer())
        .post(`/game/${gameId}/draw`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      drawnNumbers.push(drawResponse.body.number);
    }

    expect(drawnNumbers.length).toBe(10);

    // Step 7: Get player 1's card to simulate punching numbers
    const player1GetResponse = await request(app.getHttpServer())
      .get(`/player/${player1Id}`)
      .expect(200);

    const player1Card = player1GetResponse.body.card;

    // Find numbers on player's card that have been drawn
    const punchedNumbers = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const number = player1Card.grid[row][col];
        if (drawnNumbers.includes(number)) {
          punchedNumbers.push(number);
        }
      }
    }

    // Step 8: Player 1 validates bingo (this will likely return false since we haven't drawn enough numbers)
    await request(app.getHttpServer())
      .post(`/player/${player1Id}/validate-bingo`)
      .send({
        punchedNumbers,
      })
      .expect(200);

    // Step 9: Admin pauses the game
    const pauseGameResponse = await request(app.getHttpServer())
      .post(`/game/${gameId}/pause`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(pauseGameResponse.body.status).toBe(GameStatus.PAUSED);

    // Step 10: Admin resumes the game
    const resumeGameResponse = await request(app.getHttpServer())
      .post(`/game/${gameId}/resume`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(resumeGameResponse.body.status).toBe(GameStatus.ACTIVE);

    // Step 11: Get game statistics
    const statsResponse = await request(app.getHttpServer())
      .get(`/game/${gameId}/stats`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(statsResponse.body.totalPlayers).toBe(2);
    expect(statsResponse.body.drawnNumbersCount).toBe(10);
    expect(statsResponse.body.remainingNumbers).toBe(65); // 75 - 10 = 65

    // Step 12: End the game
    const endGameResponse = await request(app.getHttpServer())
      .post(`/game/${gameId}/end`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(endGameResponse.body.status).toBe(GameStatus.ENDED);
  });
});
