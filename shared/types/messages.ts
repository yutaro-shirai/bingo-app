import { z } from 'zod';
import { GameResponseSchema } from './game';
import { PlayerResponseSchema } from './player';

/**
 * WebSocket message types
 */
export enum MessageType {
  // Game state messages
  GAME_STATE_UPDATE = 'game_state_update',
  NUMBER_DRAWN = 'number_drawn',
  GAME_PAUSED = 'game_paused',
  GAME_RESUMED = 'game_resumed',
  GAME_ENDED = 'game_ended',
  
  // Player messages
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_STATUS_CHANGE = 'player_status_change',
  PLAYER_PUNCHED_NUMBER = 'player_punched_number',
  PLAYER_UNPUNCHED_NUMBER = 'player_unpunched_number',
  PLAYER_BINGO = 'player_bingo',
  
  // Connection messages
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  RECONNECT = 'reconnect',
  SYNC_REQUEST = 'sync_request',
  SYNC_RESPONSE = 'sync_response',
  
  // Authentication messages
  ADMIN_LOGIN = 'admin_login',
  ADMIN_LOGIN_SUCCESS = 'admin_login_success',
  ADMIN_LOGIN_FAILURE = 'admin_login_failure',
  ADMIN_LOGOUT = 'admin_logout',
  
  // Error messages
  ERROR = 'error',
  
  // Socket.io specific events
  PING = 'ping',
  PONG = 'pong',
  JOIN_GAME = 'joinGame',
  GAME_JOINED = 'gameJoined'
}

/**
 * Base WebSocket message interface
 */
export interface WebSocketMessage {
  type: MessageType;
  payload: any;
  timestamp: Date;
}

/**
 * Game state update message schema
 */
export const GameStateUpdateSchema = z.object({
  type: z.literal(MessageType.GAME_STATE_UPDATE),
  payload: GameResponseSchema,
  timestamp: z.date(),
});

export type GameStateUpdateMessage = z.infer<typeof GameStateUpdateSchema>;

/**
 * Number drawn message schema
 */
export const NumberDrawnSchema = z.object({
  type: z.literal(MessageType.NUMBER_DRAWN),
  payload: z.object({
    gameId: z.string(),
    number: z.number(),
    drawnNumbers: z.array(z.number()),
  }),
  timestamp: z.date(),
});

export type NumberDrawnMessage = z.infer<typeof NumberDrawnSchema>;

/**
 * Player joined message schema
 */
export const PlayerJoinedSchema = z.object({
  type: z.literal(MessageType.PLAYER_JOINED),
  payload: z.object({
    playerId: z.string(),
    playerName: z.string(),
    timestamp: z.date(),
  }),
  timestamp: z.date(),
});

export type PlayerJoinedMessage = z.infer<typeof PlayerJoinedSchema>;

/**
 * Player punched number message schema
 */
export const PlayerPunchedNumberSchema = z.object({
  type: z.literal(MessageType.PLAYER_PUNCHED_NUMBER),
  payload: z.object({
    playerId: z.string(),
    number: z.number(),
  }),
  timestamp: z.date(),
});

export type PlayerPunchedNumberMessage = z.infer<typeof PlayerPunchedNumberSchema>;

/**
 * Player bingo message schema
 */
export const PlayerBingoSchema = z.object({
  type: z.literal(MessageType.PLAYER_BINGO),
  payload: z.object({
    playerId: z.string(),
    playerName: z.string(),
    bingoAchievedAt: z.date(),
  }),
  timestamp: z.date(),
});

export type PlayerBingoMessage = z.infer<typeof PlayerBingoSchema>;

/**
 * Error message schema
 */
export const ErrorMessageSchema = z.object({
  type: z.literal(MessageType.ERROR),
  payload: z.object({
    code: z.string(),
    message: z.string(),
  }),
  timestamp: z.date(),
});

export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;

/**
 * Sync request message schema
 */
export const SyncRequestSchema = z.object({
  type: z.literal(MessageType.SYNC_REQUEST),
  payload: z.object({
    gameId: z.string(),
    playerId: z.string().optional(),
  }),
  timestamp: z.date(),
});

export type SyncRequestMessage = z.infer<typeof SyncRequestSchema>;

/**
 * Sync response message schema
 */
export const SyncResponseSchema = z.object({
  type: z.literal(MessageType.SYNC_RESPONSE),
  payload: z.object({
    game: GameResponseSchema,
    player: PlayerResponseSchema.optional(),
  }),
  timestamp: z.date(),
});

export type SyncResponseMessage = z.infer<typeof SyncResponseSchema>;

/**
 * Join game request schema
 */
export const JoinGameRequestSchema = z.object({
  gameId: z.string(),
  playerName: z.string(),
});

export type JoinGameRequest = z.infer<typeof JoinGameRequestSchema>;

/**
 * Join game response schema
 */
export const JoinGameResponseSchema = z.object({
  message: z.string(),
  gameId: z.string(),
  playerId: z.string(),
});

export type JoinGameResponse = z.infer<typeof JoinGameResponseSchema>;

/**
 * Ping response schema
 */
export const PingResponseSchema = z.object({
  message: z.string(),
  timestamp: z.date(),
});

export type PingResponse = z.infer<typeof PingResponseSchema>;

/**
 * Admin login request schema
 */
export const AdminLoginRequestSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type AdminLoginRequest = z.infer<typeof AdminLoginRequestSchema>;

/**
 * Admin login response schema
 */
export const AdminLoginResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    username: z.string(),
    isAdmin: z.boolean(),
  }),
  token: z.string(),
});

export type AdminLoginResponse = z.infer<typeof AdminLoginResponseSchema>;

/**
 * Admin login message schema
 */
export const AdminLoginMessageSchema = z.object({
  type: z.literal(MessageType.ADMIN_LOGIN),
  payload: AdminLoginRequestSchema,
  timestamp: z.date(),
});

export type AdminLoginMessage = z.infer<typeof AdminLoginMessageSchema>;

/**
 * Admin login success message schema
 */
export const AdminLoginSuccessMessageSchema = z.object({
  type: z.literal(MessageType.ADMIN_LOGIN_SUCCESS),
  payload: AdminLoginResponseSchema,
  timestamp: z.date(),
});

export type AdminLoginSuccessMessage = z.infer<typeof AdminLoginSuccessMessageSchema>;