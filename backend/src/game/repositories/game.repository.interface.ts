import { GameEntity } from '../entities/game.entity';
import { GameStatus } from 'shared';

export interface IGameRepository {
  /**
   * Find a game by its ID
   * @param id Game ID
   */
  findById(id: string): Promise<GameEntity | null>;

  /**
   * Find a game by its code
   * @param code Game code
   */
  findByCode(code: string): Promise<GameEntity | null>;

  /**
   * Create a new game
   * @param game Game entity
   */
  create(game: GameEntity): Promise<GameEntity>;

  /**
   * Update an existing game
   * @param id Game ID
   * @param game Partial game entity with updates
   */
  update(id: string, game: Partial<GameEntity>): Promise<GameEntity>;

  /**
   * Delete a game
   * @param id Game ID
   */
  delete(id: string): Promise<void>;

  /**
   * Find games by status
   * @param status Game status
   */
  findByStatus(status: GameStatus): Promise<GameEntity[]>;

  /**
   * Add a drawn number to a game
   * @param id Game ID
   * @param number Number to add
   */
  addDrawnNumber(id: string, number: number): Promise<GameEntity>;

  /**
   * Update game expiration time
   * @param id Game ID
   * @param expiresAt New expiration time
   */
  updateExpiration(id: string, expiresAt: Date): Promise<GameEntity>;

  /**
   * Update admin connections
   * @param id Game ID
   * @param connectionId Connection ID to add or remove
   * @param isConnected Whether the admin is connecting or disconnecting
   */
  updateAdminConnection(
    id: string,
    connectionId: string,
    isConnected: boolean,
  ): Promise<GameEntity>;

  /**
   * Increment player count
   * @param id Game ID
   * @param active Whether to increment active player count as well
   */
  incrementPlayerCount(id: string, active: boolean): Promise<GameEntity>;

  /**
   * Decrement player count
   * @param id Game ID
   * @param active Whether to decrement active player count as well
   */
  decrementPlayerCount(id: string, active: boolean): Promise<GameEntity>;

  /**
   * Increment bingo count
   * @param id Game ID
   */
  incrementBingoCount(id: string): Promise<GameEntity>;
}
