// This is a simplified version of the shared types for testing purposes

export enum GameStatus {
  CREATED = 'created',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended',
}

export enum DrawMode {
  MANUAL = 'manual',
  TIMED = 'timed',
}

export interface GameCreateDto {
  drawMode: DrawMode;
  drawInterval?: number | null;
}

export interface GameUpdateDto {
  drawMode?: DrawMode;
  drawInterval?: number | null;
}

export interface Game {
  id: string;
  code: string;
  status: GameStatus;
  createdAt: Date;
  expiresAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  drawMode: DrawMode;
  drawInterval?: number;
  lastDrawnAt?: Date;
  drawnNumbers: number[];
  playerCount: number;
  activePlayerCount: number;
  bingoCount: number;
}

export interface BingoCard {
  grid: number[][];
  freeSpace?: { row: number; col: number };
}

export interface Player {
  id: string;
  gameId: string;
  name: string;
  card: BingoCard;
  punchedNumbers: number[];
  hasBingo: boolean;
  bingoAchievedAt?: Date;
  isOnline: boolean;
  lastSeenAt: Date;
  connectionId?: string;
}