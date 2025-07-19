import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  UseGuards,
  Get,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Put,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { AdminGuard } from './auth.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Admin login endpoint
   * @param loginDto Login credentials
   * @returns JWT token
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
  ): Promise<LoginResponseDto> {
    const result = await this.authService.login(loginDto);

    if (!result.user.isAdmin) {
      throw new UnauthorizedException('Admin privileges required');
    }

    return result;
  }

  /**
   * Get current admin profile
   * @param req Request with user data
   * @returns Admin user data
   */
  @Get('profile')
  @UseGuards(AdminGuard)
  getProfile(@Request() req) {
    return {
      user: req.user,
      message: 'Admin profile retrieved successfully',
    };
  }

  /**
   * Verify admin token
   * @param req Request with user data
   * @returns Token validity status
   */
  @Get('verify')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  verifyToken(@Request() req) {
    return {
      valid: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        isAdmin: req.user.isAdmin,
      },
    };
  }
}
