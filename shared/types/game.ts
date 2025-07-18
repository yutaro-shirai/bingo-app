import { z } from 'zod';

/**
 * Game status enum
 */
export enum GameStatus {
  CREATED = 'created',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended'
}

/**
 * Draw mode enum
 */
export enum DrawMode {
  MANUAL = 'manual',
  TIMED = 'timed'
}

/**
 * Game interface
 */
export interface Game {
  id: string;                  // Unique identifier
  code: string;                // Short code for joining
  status: GameStatus;          // 'created', 'active', 'paused', 'ended'
  createdAt: Date;             // Creation timestamp
  startedAt?: Date;            // Game start timestamp
  endedAt?: Date;              // Game end timestamp
  expiresAt: Date;             // TTL for DynamoDB (max 12 hours)
  drawMode: DrawMode;          // 'manual' or 'timed'
  drawInterval?: number;       // Interval in seconds for timed mode
  drawnNumbers: number[];      // Numbers that have been called
  lastDrawnAt?: Date;          // Timestamp of last number draw
  playerCount: number;         // Number of registered players
  activePlayerCount: number;   // Number of currently connected players
  bingoCount: number;          // Number of players who have reached bingo
  adminConnections: string[];  // Admin connection IDs
}

/**
 * Game creation DTO schema
 */
export const GameCreateSchema = z.object({
  drawMode: z.nativeEnum(DrawMode),
  drawInterval: z.number().optional().nullable(),
});

export type GameCreateDto = z.infer<typeof GameCreateSchema>;

/**
 * Game update DTO schema
 */
export const GameUpdateSchema = z.object({
  status: z.nativeEnum(GameStatus).optional(),
  drawMode: z.nativeEnum(DrawMode).optional(),
  drawInterval: z.number().optional().nullable(),
});

export type GameUpdateDto = z.infer<typeof GameUpdateSchema>;

/**
 * Game response DTO schema
 */
export const GameResponseSchema = z.object({
  id: z.string(),
  code: z.string(),
  status: z.nativeEnum(GameStatus),
  createdAt: z.date(),
  startedAt: z.date().optional(),
  endedAt: z.date().optional(),
  drawMode: z.nativeEnum(DrawMode),
  drawInterval: z.number().optional(),
  drawnNumbers: z.array(z.number()),
  lastDrawnAt: z.date().optional(),
  playerCount: z.number(),
  activePlayerCount: z.number(),
  bingoCount: z.number(),
});

export type GameResponseDto = z.infer<typeof GameResponseSchema>;