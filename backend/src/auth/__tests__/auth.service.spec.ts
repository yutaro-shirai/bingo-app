import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { LoginDto } from '../dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto: LoginDto = {
        username: 'admin',
        password: 'admin123',
      };

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.username).toBe('admin');
      expect(result.user.isAdmin).toBe(true);
      expect(typeof result.token).toBe('string');
    });

    it('should throw UnauthorizedException for invalid username', async () => {
      const loginDto: LoginDto = {
        username: 'invalid',
        password: 'admin123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const loginDto: LoginDto = {
        username: 'admin',
        password: 'invalid',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      // First login to get a token
      const loginDto: LoginDto = {
        username: 'admin',
        password: 'admin123',
      };
      const loginResult = await service.login(loginDto);

      // Then verify the token
      const result = await service.verifyToken(loginResult.token);

      expect(result.username).toBe('admin');
      expect(result.isAdmin).toBe(true);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(service.verifyToken(invalidToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const authHeader = 'Bearer valid.jwt.token';
      const result = service.extractTokenFromHeader(authHeader);
      expect(result).toBe('valid.jwt.token');
    });

    it('should throw UnauthorizedException for invalid header format', () => {
      const authHeader = 'Invalid header';
      expect(() => service.extractTokenFromHeader(authHeader)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for missing header', () => {
      expect(() => service.extractTokenFromHeader('')).toThrow(
        UnauthorizedException,
      );
    });
  });
});
