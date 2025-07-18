import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { AuthGuard, AdminGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Admin login endpoint
   * @param loginDto Login credentials
   * @returns Login response with user and token
   */
  @Post('login')
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
  ): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  /**
   * Protected endpoint to verify authentication
   * @param req Request object with user information
   * @returns User information
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getProfile(@Request() req: any) {
    return {
      user: req.user,
      message: 'Authentication successful',
    };
  }

  /**
   * Admin-only protected endpoint
   * @param req Request object with user information
   * @returns Admin user information
   */
  @Get('admin')
  @UseGuards(AdminGuard)
  async getAdminProfile(@Request() req: any) {
    return {
      user: req.user,
      message: 'Admin authentication successful',
    };
  }
}
