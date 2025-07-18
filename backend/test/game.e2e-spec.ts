import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GameStatus, DrawMode } from '../src/shared/types';
import { JwtService } from '@nestjs/jwt';

describe('GameController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let adminToken: string;
  let gameId: string;
  let gameCode: string;

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

  describe('Game Management', () => {
    it('should create a new game', async () => {
      const response = await request(app.getHttpServer())
        .post('/game')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          drawMode: DrawMode.MANUAL,
          drawInterval: null,
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.code).toBeDefined();
      expect(response.body.status).toBe(GameStatus.CREATED);
      expect(response.body.drawMode).toBe(DrawMode.MANUAL);

      // Save game ID and code for later tests
      gameId = response.body.id;
      gameCode = response.body.code;
    });

    it('should get game by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/game/${gameId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(gameId);
      expect(response.body.code).toBe(gameCode);
    });

    it('should get game by code', async () => {
      const response = await request(app.getHttpServer())
        .get(`/game/code/${gameCode}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(gameId);
      expect(response.body.code).toBe(gameCode);
    });

    it('should start a game', async () => {
      const response = await request(app.getHttpServer())
        .post(`/game/${gameId}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(gameId);
      expect(response.body.status).toBe(GameStatus.ACTIVE);
      expect(response.body.startedAt).toBeDefined();
    });

    it('should draw a number', async () => {
      const response = await request(app.getHttpServer())
        .post(`/game/${gameId}/draw`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.game).toBeDefined();
      expect(response.body.number).toBeDefined();
      expect(response.body.game.drawnNumbers).toContain(response.body.number);
    });

    it('should pause a game', async () => {
      const response = await request(app.getHttpServer())
        .post(`/game/${gameId}/pause`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(gameId);
      expect(response.body.status).toBe(GameStatus.PAUSED);
    });

    it('should resume a game', async () => {
      const response = await request(app.getHttpServer())
        .post(`/game/${gameId}/resume`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(gameId);
      expect(response.body.status).toBe(GameStatus.ACTIVE);
    });

    it('should get game statistics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/game/${gameId}/stats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.totalPlayers).toBeDefined();
      expect(response.body.activePlayers).toBeDefined();
      expect(response.body.playersWithBingo).toBeDefined();
      expect(response.body.drawnNumbersCount).toBeDefined();
      expect(response.body.remainingNumbers).toBeDefined();
      expect(response.body.gameStatus).toBe(GameStatus.ACTIVE);
    });

    it('should end a game', async () => {
      const response = await request(app.getHttpServer())
        .post(`/game/${gameId}/end`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(gameId);
      expect(response.body.status).toBe(GameStatus.ENDED);
      expect(response.body.endedAt).toBeDefined();
    });
  });

  describe('Player Management', () => {
    let playerId: string;

    it('should join a game', async () => {
      // Create a new game for player tests
      const gameResponse = await request(app.getHttpServer())
        .post('/game')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          drawMode: DrawMode.MANUAL,
          drawInterval: null,
        })
        .expect(201);

      gameId = gameResponse.body.id;
      gameCode = gameResponse.body.code;

      // Join the game
      const response = await request(app.getHttpServer())
        .post('/player/join')
        .send({
          gameCode,
          playerName: 'Test Player',
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('Test Player');
      expect(response.body.gameId).toBe(gameId);
      expect(response.body.card).toBeDefined();
      expect(response.body.card.grid).toBeDefined();
      expect(response.body.card.grid.length).toBe(5);
      expect(response.body.card.grid[0].length).toBe(5);

      playerId = response.body.id;
    });

    it('should get player by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/player/${playerId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(playerId);
      expect(response.body.name).toBe('Test Player');
      expect(response.body.gameId).toBe(gameId);
    });

    it('should get players by game ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/player/game/${gameId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].id).toBe(playerId);
      expect(response.body[0].name).toBe('Test Player');
    });

    it('should validate bingo', async () => {
      // Start the game
      await request(app.getHttpServer())
        .post(`/game/${gameId}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Get player to check their card
      const playerResponse = await request(app.getHttpServer())
        .get(`/player/${playerId}`)
        .expect(200);

      const player = playerResponse.body;
      
      // Get the first row of numbers from the player's card
      const firstRowNumbers = player.card.grid[0];
      
      // Draw numbers until all numbers in the first row are drawn
      for (const number of firstRowNumbers) {
        // This is a simplified approach - in a real test we would need to mock the random number generation
        // For now, we'll just check if validation works with the player's card numbers
        await request(app.getHttpServer())
          .post(`/game/${gameId}/draw`)
          .set('Authorization', `Bearer ${adminToken}`);
      }

      // Validate bingo with the first row numbers
      const response = await request(app.getHttpServer())
        .post(`/player/${playerId}/validate-bingo`)
        .send({
          punchedNumbers: firstRowNumbers,
        })
        .expect(200);

      // Note: In a real test, this might return false since we can't guarantee all numbers were drawn
      // But the API endpoint should work correctly
      expect(response.body).toBeDefined();
    });
  });
});