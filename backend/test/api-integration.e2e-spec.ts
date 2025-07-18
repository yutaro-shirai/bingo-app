import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GameStatus, DrawMode } from '../src/shared/types';
import { JwtService } from '@nestjs/jwt';

describe('API Integration Tests (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let adminToken: string;

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
      isAdmin: true 
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    it('should authenticate admin with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'admin', // This should match the configured admin password
        })
        .expect(201);

      expect(response.body.access_token).toBeDefined();
    });

    it('should reject admin with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'wrong-password',
        })
        .expect(401);
    });

    it('should reject unauthorized access to protected routes', async () => {
      await request(app.getHttpServer())
        .post('/game')
        .send({
          drawMode: DrawMode.MANUAL,
        })
        .expect(401);
    });
  });

  describe('Game Management API', () => {
    let gameId: string;
    let gameCode: string;

    it('should create a new game', async () => {
      const response = await request(app.getHttpServer())
        .post('/game')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          drawMode: DrawMode.MANUAL,
          drawInterval: null,
        })
        .expect(201);

      gameId = response.body.id;
      gameCode = response.body.code;

      expect(gameId).toBeDefined();
      expect(gameCode).toBeDefined();
      expect(response.body.status).toBe(GameStatus.CREATED);
      expect(response.body.drawMode).toBe(DrawMode.MANUAL);
      expect(response.body.drawnNumbers).toEqual([]);
      expect(response.body.playerCount).toBe(0);
    });

    it('should get game by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/game/${gameId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(gameId);
      expect(response.body.code).toBe(gameCode);
    });

    it('should get game by code', async () => {
      const response = await request(app.getHttpServer())
        .get(`/game/code/${gameCode}`)
        .expect(200);

      expect(response.body.id).toBe(gameId);
      expect(response.body.code).toBe(gameCode);
    });

    it('should update game settings', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/game/${gameId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          drawMode: DrawMode.TIMED,
          drawInterval: 30,
        })
        .expect(200);

      expect(response.body.drawMode).toBe(DrawMode.TIMED);
      expect(response.body.drawInterval).toBe(30);
    });

    it('should start a game', async () => {
      const response = await request(app.getHttpServer())
        .post(`/game/${gameId}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe(GameStatus.ACTIVE);
      expect(response.body.startedAt).toBeDefined();
    });

    it('should draw a number', async () => {
      const response = await request(app.getHttpServer())
        .post(`/game/${gameId}/draw`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.number).toBeDefined();
      expect(typeof response.body.number).toBe('number');
      expect(response.body.number).toBeGreaterThan(0);
      expect(response.body.number).toBeLessThanOrEqual(75);
    });

    it('should pause a game', async () => {
      const response = await request(app.getHttpServer())
        .post(`/game/${gameId}/pause`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe(GameStatus.PAUSED);
    });

    it('should resume a game', async () => {
      const response = await request(app.getHttpServer())
        .post(`/game/${gameId}/resume`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe(GameStatus.ACTIVE);
    });

    it('should get game statistics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/game/${gameId}/stats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.totalPlayers).toBeDefined();
      expect(response.body.activePlayers).toBeDefined();
      expect(response.body.drawnNumbersCount).toBeDefined();
      expect(response.body.remainingNumbers).toBeDefined();
      expect(response.body.gameStatus).toBe(GameStatus.ACTIVE);
    });

    it('should end a game', async () => {
      const response = await request(app.getHttpServer())
        .post(`/game/${gameId}/end`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe(GameStatus.ENDED);
      expect(response.body.endedAt).toBeDefined();
    });

    it('should handle not found game', async () => {
      await request(app.getHttpServer())
        .get('/game/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Player Management API', () => {
    let gameId: string;
    let gameCode: string;
    let playerId: string;

    beforeAll(async () => {
      // Create a new game for player tests
      const gameResponse = await request(app.getHttpServer())
        .post('/game')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          drawMode: DrawMode.MANUAL,
          drawInterval: null,
        });

      gameId = gameResponse.body.id;
      gameCode = gameResponse.body.code;

      // Start the game
      await request(app.getHttpServer())
        .post(`/game/${gameId}/start`)
        .set('Authorization', `Bearer ${adminToken}`);
    });

    it('should register a new player', async () => {
      const response = await request(app.getHttpServer())
        .post('/player/join')
        .send({
          gameCode,
          playerName: 'Test Player',
        })
        .expect(201);

      playerId = response.body.id;

      expect(playerId).toBeDefined();
      expect(response.body.name).toBe('Test Player');
      expect(response.body.gameId).toBe(gameId);
      expect(response.body.card).toBeDefined();
      expect(response.body.card.grid).toBeDefined();
      expect(response.body.card.grid.length).toBe(5);
      expect(response.body.card.grid[0].length).toBe(5);
      expect(response.body.punchedNumbers).toEqual([]);
      expect(response.body.hasBingo).toBe(false);
    });

    it('should get player by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/player/${playerId}`)
        .expect(200);

      expect(response.body.id).toBe(playerId);
      expect(response.body.name).toBe('Test Player');
      expect(response.body.gameId).toBe(gameId);
    });

    it('should punch a number', async () => {
      // Draw a number first
      const drawResponse = await request(app.getHttpServer())
        .post(`/game/${gameId}/draw`)
        .set('Authorization', `Bearer ${adminToken}`);

      const drawnNumber = drawResponse.body.number;

      // Punch the drawn number
      const response = await request(app.getHttpServer())
        .post(`/player/${playerId}/punch`)
        .send({
          number: drawnNumber,
        })
        .expect(200);

      expect(response.body.punchedNumbers).toContain(drawnNumber);
    });

    it('should unpunch a number', async () => {
      // Get current player state
      const playerResponse = await request(app.getHttpServer())
        .get(`/player/${playerId}`);

      const punchedNumber = playerResponse.body.punchedNumbers[0];

      // Unpunch the number
      const response = await request(app.getHttpServer())
        .post(`/player/${playerId}/unpunch`)
        .send({
          number: punchedNumber,
        })
        .expect(200);

      expect(response.body.punchedNumbers).not.toContain(punchedNumber);
    });

    it('should validate bingo (likely false)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/player/${playerId}/validate-bingo`)
        .send({
          punchedNumbers: [],
        })
        .expect(200);

      expect(response.body.valid).toBeDefined();
    });

    it('should handle not found player', async () => {
      await request(app.getHttpServer())
        .get('/player/non-existent-id')
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    let gameId: string;

    beforeAll(async () => {
      // Create a new game for error handling tests
      const gameResponse = await request(app.getHttpServer())
        .post('/game')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          drawMode: DrawMode.MANUAL,
          drawInterval: null,
        });

      gameId = gameResponse.body.id;
    });

    it('should handle invalid game state transitions', async () => {
      // Try to pause a game that is not active
      await request(app.getHttpServer())
        .post(`/game/${gameId}/pause`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should handle invalid player operations', async () => {
      // Try to validate bingo for non-existent player
      await request(app.getHttpServer())
        .post('/player/non-existent-id/validate-bingo')
        .send({
          punchedNumbers: [1, 2, 3, 4, 5],
        })
        .expect(404);
    });

    it('should handle invalid game code', async () => {
      await request(app.getHttpServer())
        .post('/player/join')
        .send({
          gameCode: 'INVALID',
          playerName: 'Test Player',
        })
        .expect(404);
    });
  });
});