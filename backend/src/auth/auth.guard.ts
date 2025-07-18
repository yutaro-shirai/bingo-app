import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    try {
      const token = this.authService.extractTokenFromHeader(authHeader);
      const user = await this.authService.verifyToken(token);

      // Attach user to request for use in controllers
      request.user = user;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    try {
      const token = this.authService.extractTokenFromHeader(authHeader);
      const user = await this.authService.verifyToken(token);

      if (!user.isAdmin) {
        throw new UnauthorizedException('Admin privileges required');
      }

      // Attach user to request for use in controllers
      request.user = user;

      return true;
    } catch (error) {
      throw new UnauthorizedException(
        'Invalid token or insufficient privileges',
      );
    }
  }
}
