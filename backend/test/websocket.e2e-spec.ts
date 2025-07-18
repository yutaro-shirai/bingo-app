import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { GameStatus, DrawMode } from '../src/shared/types';

describe('WebSocket Gateway (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let adminToken: string;
  let gameId: string;
  let gameCode: string;
  let playerSocket: Socket;
  let adminSocket: Socket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();

    // Get the HTTP server
    const httpServer = app.getHttpServer();

    // Create admin token for authentication
    adminToken = jwtService.sign({
      sub: 'admin',
      username: 'admin',
      isAdmin: true,
    });

    // Create a game for testing
    const gameResponse = await request(httpServer)
      .post('/game')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        drawMode: DrawMode.MANUAL,
        drawInterval: null,
      });

    gameId = gameResponse.body.id;
    gameCode = gameResponse.body.code;

    // Create a player for testing
    const playerResponse = await request(httpServer).post('/player/join').send({
      gameCode,
      playerName: 'Test Player',
    });

    const playerId = playerResponse.body.id;

    // Connect WebSocket clients
    const wsUrl = 'http://localhost:3001'; // Adjust to match your WebSocket server URL

    // Connect player socket
    playerSocket = io(wsUrl, {
      extraHeaders: {
        'player-id': playerId,
        'game-id': gameId,
      },
      autoConnect: false,
    });

    // Connect admin socket
    adminSocket = io(wsUrl, {
      extraHeaders: {
        authorization: `Bearer ${adminToken}`,
        'game-id': gameId,
      },
      autoConnect: false,
    });
  });

  afterAll(async () => {
    if (playerSocket && playerSocket.connected) {
      playerSocket.disconnect();
    }

    if (adminSocket && adminSocket.connected) {
      adminSocket.disconnect();
    }

    await app.close();
  });

  describe('WebSocket Communication', () => {
    it('should connect player socket', (done) => {
      playerSocket.on('connect', () => {
        expect(playerSocket.connected).toBe(true);
        done();
      });

      playerSocket.on('connect_error', (err) => {
        done.fail(`Connection error: ${err.message}`);
      });

      playerSocket.connect();
    });

    it('should connect admin socket', (done) => {
      adminSocket.on('connect', () => {
        expect(adminSocket.connected).toBe(true);
        done();
      });

      adminSocket.on('connect_error', (err) => {
        done.fail(`Connection error: ${err.message}`);
      });

      adminSocket.connect();
    });

    it('should receive game state on connection', (done) => {
      playerSocket.on('gameState', (data) => {
        expect(data).toBeDefined();
        expect(data.id).toBe(gameId);
        expect(data.code).toBe(gameCode);
        done();
      });
    });

    it('should receive player joined event', (done) => {
      // Create a new player
      request(app.getHttpServer())
        .post('/player/join')
        .send({
          gameCode,
          playerName: 'Another Player',
        })
        .then(() => {
          // Event should be received by existing players
        });

      playerSocket.on('playerJoined', (data) => {
        expect(data).toBeDefined();
        expect(data.playerName).toBe('Another Player');
        done();
      });
    });

    it('should receive game started event', (done) => {
      // Start the game
      request(app.getHttpServer())
        .post(`/game/${gameId}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .then(() => {
          // Event should be received by players
        });

      playerSocket.on('gameStateChanged', (data) => {
        if (data.status === GameStatus.ACTIVE) {
          expect(data).toBeDefined();
          expect(data.id).toBe(gameId);
          expect(data.status).toBe(GameStatus.ACTIVE);
          done();
        }
      });
    });

    it('should receive number drawn event', (done) => {
      // Draw a number
      request(app.getHttpServer())
        .post(`/game/${gameId}/draw`)
        .set('Authorization', `Bearer ${adminToken}`)
        .then(() => {
          // Event should be received by players
        });

      playerSocket.on('numberDrawn', (data) => {
        expect(data).toBeDefined();
        expect(data.number).toBeDefined();
        expect(typeof data.number).toBe('number');
        expect(data.number).toBeGreaterThan(0);
        expect(data.number).toBeLessThanOrEqual(75);
        done();
      });
    });

    it('should receive game paused event', (done) => {
      // Pause the game
      request(app.getHttpServer())
        .post(`/game/${gameId}/pause`)
        .set('Authorization', `Bearer ${adminToken}`)
        .then(() => {
          // Event should be received by players
        });

      playerSocket.on('gameStateChanged', (data) => {
        if (data.status === GameStatus.PAUSED) {
          expect(data).toBeDefined();
          expect(data.id).toBe(gameId);
          expect(data.status).toBe(GameStatus.PAUSED);
          done();
        }
      });
    });

    it('should receive game resumed event', (done) => {
      // Resume the game
      request(app.getHttpServer())
        .post(`/game/${gameId}/resume`)
        .set('Authorization', `Bearer ${adminToken}`)
        .then(() => {
          // Event should be received by players
        });

      playerSocket.on('gameStateChanged', (data) => {
        if (data.status === GameStatus.ACTIVE) {
          expect(data).toBeDefined();
          expect(data.id).toBe(gameId);
          expect(data.status).toBe(GameStatus.ACTIVE);
          done();
        }
      });
    });

    it('should receive game ended event', (done) => {
      // End the game
      request(app.getHttpServer())
        .post(`/game/${gameId}/end`)
        .set('Authorization', `Bearer ${adminToken}`)
        .then(() => {
          // Event should be received by players
        });

      playerSocket.on('gameStateChanged', (data) => {
        if (data.status === GameStatus.ENDED) {
          expect(data).toBeDefined();
          expect(data.id).toBe(gameId);
          expect(data.status).toBe(GameStatus.ENDED);
          done();
        }
      });
    });
  });
});
