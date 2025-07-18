import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import * as crypto from 'crypto';

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  isAdmin: boolean;
}

@Injectable()
export class AuthService {
  // In a real application, this would be stored in a database
  // For now, we'll use hardcoded admin credentials
  private readonly adminUsers: AdminUser[] = [
    {
      id: '1',
      username: 'admin',
      password: 'admin123', // In production, this should be hashed
      isAdmin: true,
    },
    {
      id: '2',
      username: 'bingo-admin',
      password: 'bingo123', // In production, this should be hashed
      isAdmin: true,
    },
  ];

  private readonly secret = process.env.JWT_SECRET || 'bingo-secret-key';

  /**
   * Authenticate admin user with username and password
   * @param loginDto Login credentials
   * @returns Login response with user and token
   */
  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { username, password } = loginDto;

    // Find user by username
    const user = this.adminUsers.find(u => u.username === username);
    
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // In production, use bcrypt to compare hashed passwords
    if (user.password !== password) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // Generate simple token (in production, use proper JWT)
    const tokenData = {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    };
    
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');

    return {
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      },
      token,
    };
  }

  /**
   * Verify token and return user information
   * @param token Base64 encoded token
   * @returns User information
   */
  async verifyToken(token: string): Promise<{ id: string; username: string; isAdmin: boolean }> {
    try {
      const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Check if token is expired
      if (Date.now() > tokenData.exp) {
        throw new UnauthorizedException('Token expired');
      }
      
      return {
        id: tokenData.id,
        username: tokenData.username,
        isAdmin: tokenData.isAdmin,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Extract token from Authorization header
   * @param authHeader Authorization header value
   * @returns JWT token
   */
  extractTokenFromHeader(authHeader: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }
    return authHeader.substring(7);
  }
}