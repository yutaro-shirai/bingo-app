import { z } from 'zod';

/**
 * Bingo card interface
 */
export interface BingoCard {
  grid: number[][];            // 5x5 grid of numbers
  freeSpace?: {row: number, col: number}; // Optional free space position
}

/**
 * Player interface
 */
export interface Player {
  id: string;                  // Unique identifier
  gameId: string;              // Reference to game
  name: string;                // Player name
  card: BingoCard;             // Player's bingo card
  punchedNumbers: number[];    // Numbers punched by player
  hasBingo: boolean;           // Whether player has bingo
  bingoAchievedAt?: Date;      // When bingo was achieved
  connectionId?: string;       // Current WebSocket connection ID
  isOnline: boolean;           // Connection status
  lastSeenAt: Date;            // Last activity timestamp
}

/**
 * Player registration DTO schema
 */
export const PlayerRegisterSchema = z.object({
  gameCode: z.string().min(4).max(8),
  name: z.string().min(1).max(50),
});

export type PlayerRegisterDto = z.infer<typeof PlayerRegisterSchema>;

/**
 * Player response DTO schema
 */
export const PlayerResponseSchema = z.object({
  id: z.string(),
  gameId: z.string(),
  name: z.string(),
  card: z.object({
    grid: z.array(z.array(z.number())),
    freeSpace: z.object({
      row: z.number(),
      col: z.number(),
    }).optional(),
  }),
  punchedNumbers: z.array(z.number()),
  hasBingo: z.boolean(),
  bingoAchievedAt: z.date().optional(),
  isOnline: z.boolean(),
  lastSeenAt: z.date(),
});

export type PlayerResponseDto = z.infer<typeof PlayerResponseSchema>;

/**
 * Player update DTO schema
 */
export const PlayerUpdateSchema = z.object({
  punchedNumbers: z.array(z.number()).optional(),
});

export type PlayerUpdateDto = z.infer<typeof PlayerUpdateSchema>;