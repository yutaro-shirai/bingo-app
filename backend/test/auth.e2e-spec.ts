import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    it('should authenticate admin user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'admin', // This should match the configured admin password
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.access_token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'wrong-password',
        })
        .expect(401);
    });

    it('should validate JWT token', async () => {
      // First login to get a token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'admin',
        })
        .expect(201);

      const token = loginResponse.body.access_token;

      // Then validate the token
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.username).toBe('admin');
      expect(response.body.isAdmin).toBe(true);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject requests without token', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });
  });
});
