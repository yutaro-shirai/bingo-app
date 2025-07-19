import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  Get,
  UseGuards,
  Request,
  Param,
  Put,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { CreateGameDto, UpdateGameDto, GameResponseDto } from './dto/game.dto';
import { PlayerResponseDto } from './dto/player.dto';
import { AdminGuard } from '../auth/auth.guard';

@Controller('games')
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
  ) {}

  /**
   * Create a new game (admin only)
   * @param createGameDto Game creation data
   * @returns Created game
   */
  @Post()
  @UseGuards(AdminGuard)
  async createGame(
    @Body(ValidationPipe) createGameDto: CreateGameDto,
  ): Promise<GameResponseDto> {
    return this.gameService.createGame(createGameDto);
  }

  /**
   * Get game by ID
   * @param id Game ID
   * @returns Game data
   */
  @Get(':id')
  async getGameById(@Param('id') id: string): Promise<GameResponseDto> {
    return this.gameService.getGameById(id);
  }

  /**
   * Get game by code
   * @param code Game code
   * @returns Game data
   */
  @Get('code/:code')
  async getGameByCode(@Param('code') code: string): Promise<GameResponseDto> {
    return this.gameService.getGameByCode(code);
  }

  /**
   * Get all players for a game (admin only)
   * @param id Game ID
   * @returns Array of players
   */
  @Get(':id/players')
  @UseGuards(AdminGuard)
  async getPlayersByGameId(
    @Param('id') id: string,
  ): Promise<PlayerResponseDto[]> {
    return this.playerService.getPlayersByGameId(id);
  }

  /**
   * Start a game (admin only)
   * @param id Game ID
   * @returns Updated game
   */
  @Put(':id/start')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async startGame(@Param('id') id: string): Promise<GameResponseDto> {
    return this.gameService.startGame(id);
  }

  /**
   * Pause a game (admin only)
   * @param id Game ID
   * @returns Updated game
   */
  @Put(':id/pause')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async pauseGame(@Param('id') id: string): Promise<GameResponseDto> {
    return this.gameService.pauseGame(id);
  }

  /**
   * Resume a game (admin only)
   * @param id Game ID
   * @returns Updated game
   */
  @Put(':id/resume')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async resumeGame(@Param('id') id: string): Promise<GameResponseDto> {
    return this.gameService.resumeGame(id);
  }

  /**
   * End a game (admin only)
   * @param id Game ID
   * @returns Updated game
   */
  @Put(':id/end')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async endGame(@Param('id') id: string): Promise<GameResponseDto> {
    return this.gameService.endGame(id);
  }

  /**
   * Update game settings (admin only)
   * @param id Game ID
   * @param updateGameDto Game update data
   * @returns Updated game
   */
  @Put(':id')
  @UseGuards(AdminGuard)
  async updateGame(
    @Param('id') id: string,
    @Body(ValidationPipe) updateGameDto: UpdateGameDto,
  ): Promise<GameResponseDto> {
    return this.gameService.updateGame(id, updateGameDto);
  }

  /**
   * Draw a number manually (admin only)
   * @param id Game ID
   * @returns Drawn number and updated game
   */
  @Post(':id/draw')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async drawNumber(
    @Param('id') id: string,
  ): Promise<{ game: GameResponseDto; number: number }> {
    return this.gameService.drawNumber(id);
  }

  /**
   * Get game statistics (admin only)
   * @param id Game ID
   * @returns Game statistics
   */
  @Get(':id/statistics')
  @UseGuards(AdminGuard)
  async getGameStatistics(@Param('id') id: string) {
    return this.gameService.getGameStatistics(id);
  }
}
