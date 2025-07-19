import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  Get,
  Param,
  Put,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PlayerService } from './player.service';
import { GameService } from './game.service';
import {
  PlayerRegisterDto,
  PlayerUpdateDto,
  PlayerResponseDto,
} from './dto/player.dto';
import { v4 as uuidv4 } from 'uuid';
import { PlayerEntity } from './entities/player.entity';

@Controller('players')
export class PlayerController {
  constructor(
    private readonly playerService: PlayerService,
    private readonly gameService: GameService,
  ) {}

  /**
   * Register a new player for a game
   * @param playerRegisterDto Player registration data
   * @returns Registered player with bingo card
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerPlayer(
    @Body(ValidationPipe) playerRegisterDto: PlayerRegisterDto,
  ): Promise<PlayerResponseDto> {
    try {
      // Find the game by code
      const game = await this.gameService.getGameByCode(
        playerRegisterDto.gameCode,
      );

      if (!game) {
        throw new NotFoundException(
          `Game with code ${playerRegisterDto.gameCode} not found`,
        );
      }

      if (game.status === 'ended') {
        throw new BadRequestException('Cannot join a game that has ended');
      }

      // Create a new player entity
      const newPlayer = new PlayerEntity();
      newPlayer.id = uuidv4();
      newPlayer.gameId = game.id;
      newPlayer.name = playerRegisterDto.name;
      newPlayer.punchedNumbers = [];
      newPlayer.hasBingo = false;
      newPlayer.isOnline = true;
      newPlayer.lastSeenAt = new Date();

      // Register the player
      const registeredPlayer =
        await this.playerService.registerPlayer(newPlayer);

      // Generate a bingo card for the player
      const playerWithCard = await this.playerService.generateBingoCard(
        registeredPlayer.id,
      );

      return new PlayerResponseDto(playerWithCard);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to register player: ' + error.message,
      );
    }
  }

  /**
   * Get player by ID
   * @param id Player ID
   * @returns Player data
   */
  @Get(':id')
  async getPlayerById(@Param('id') id: string): Promise<PlayerResponseDto> {
    try {
      return await this.playerService.getPlayerById(id);
    } catch (error) {
      throw new NotFoundException(`Player with ID ${id} not found`);
    }
  }

  /**
   * Update player's punched numbers
   * @param id Player ID
   * @param updateDto Update data
   * @returns Updated player
   */
  @Put(':id/punch')
  @HttpCode(HttpStatus.OK)
  async updatePunchedNumbers(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: { number: number },
  ): Promise<PlayerResponseDto> {
    try {
      const player = await this.playerService.getPlayerById(id);

      // Toggle the punched status of the number
      let punchedNumbers = [...player.punchedNumbers];

      if (punchedNumbers.includes(updateDto.number)) {
        // Remove the number if already punched
        punchedNumbers = punchedNumbers.filter(
          (num) => num !== updateDto.number,
        );
      } else {
        // Add the number if not punched
        punchedNumbers.push(updateDto.number);
      }

      // Update the player
      const updatedPlayer = await this.playerService.updateCardState(
        id,
        punchedNumbers,
      );
      return new PlayerResponseDto(updatedPlayer);
    } catch (error) {
      throw new NotFoundException(`Player with ID ${id} not found`);
    }
  }

  /**
   * Update player's connection status
   * @param id Player ID
   * @param updateDto Update data
   * @returns Updated player
   */
  @Put(':id/connection')
  @HttpCode(HttpStatus.OK)
  async updateConnectionStatus(
    @Param('id') id: string,
    @Body(ValidationPipe)
    updateDto: { isOnline: boolean; connectionId?: string },
  ): Promise<PlayerResponseDto> {
    try {
      const updatedPlayer = await this.playerService.updateConnectionState(
        id,
        updateDto.isOnline,
        updateDto.connectionId,
      );
      return new PlayerResponseDto(updatedPlayer);
    } catch (error) {
      throw new NotFoundException(`Player with ID ${id} not found`);
    }
  }

  /**
   * Claim bingo for a player
   * @param id Player ID
   * @returns Updated player
   */
  @Post(':id/bingo')
  @HttpCode(HttpStatus.OK)
  async claimBingo(@Param('id') id: string): Promise<PlayerResponseDto> {
    try {
      // Get the player
      const player = await this.playerService.getPlayerById(id);

      // Get the game
      const game = await this.gameService.getGameById(player.gameId);

      // Validate the bingo claim
      // This would typically involve checking if the player's punched numbers
      // form a valid bingo pattern against the game's drawn numbers

      // For now, we'll just update the player's bingo status
      const updateDto: PlayerUpdateDto = {
        hasBingo: true,
        bingoAchievedAt: new Date(),
      };

      const updatedPlayer = await this.playerService.updateBingoStatus(
        id,
        true,
      );
      return new PlayerResponseDto(updatedPlayer);
    } catch (error) {
      throw new NotFoundException(`Player with ID ${id} not found`);
    }
  }
}
