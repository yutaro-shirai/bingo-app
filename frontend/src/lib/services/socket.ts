import { io, Socket } from 'socket.io-client';
import { 
  MessageType, 
  WebSocketMessage,
  GameStateUpdateMessage,
  NumberDrawnMessage,
  PlayerJoinedMessage,
  PlayerPunchedNumberMessage,
  PlayerBingoMessage,
  ErrorMessage,
  SyncRequestMessage,
  SyncResponseMessage,
  JoinGameRequest,
  JoinGameResponse
} from 'shared/types';

// Define event handler types
type MessageHandler<T extends WebSocketMessage> = (message: T) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Error) => void;
type GenericHandler = (...args: unknown[]) => void;

// Define the WebSocket service interface
export interface WebSocketService {
  connect(gameId?: string, playerId?: string): Promise<void>;
  disconnect(): void;
  joinGame(gameId: string, playerName: string): Promise<JoinGameResponse>;
  punchNumber(number: number): void;
  unpunchNumber(number: number): void;
  requestSync(): void;
  emit(event: string, data: any): void;
  isConnected(): boolean;
  onConnect(handler: ConnectionHandler): () => void;
  onDisconnect(handler: ConnectionHandler): () => void;
  onReconnect(handler: ConnectionHandler): () => void;
  onError(handler: ErrorHandler): () => void;
  onGameStateUpdate(handler: MessageHandler<GameStateUpdateMessage>): () => void;
  onNumberDrawn(handler: MessageHandler<NumberDrawnMessage>): () => void;
  onPlayerJoined(handler: MessageHandler<PlayerJoinedMessage>): () => void;
  onPlayerPunchedNumber(handler: MessageHandler<PlayerPunchedNumberMessage>): () => void;
  onPlayerBingo(handler: MessageHandler<PlayerBingoMessage>): () => void;
  onSyncResponse(handler: MessageHandler<SyncResponseMessage>): () => void;
}

// Configuration options
interface SocketConfig {
  url: string;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  reconnectionDelayMax: number;
  timeout: number;
}

// Default configuration
const DEFAULT_CONFIG: SocketConfig = {
  url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001',
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
};

/**
 * WebSocket client service implementation using Socket.IO
 */
export class SocketIOService implements WebSocketService {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private gameId: string | undefined;
  private playerId: string | undefined;
  private reconnectAttempts = 0;
  private eventHandlers: Map<string, Set<GenericHandler>> = new Map();

  constructor(config: Partial<SocketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to the WebSocket server
   * @param gameId Optional game ID to join a specific game room
   * @param playerId Optional player ID for reconnection
   */
  public async connect(gameId?: string, playerId?: string): Promise<void> {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
      return;
    }

    this.gameId = gameId || this.gameId;
    this.playerId = playerId || this.playerId;

    return new Promise((resolve, reject) => {
      try {
        // Initialize socket with enhanced reconnection options
        this.socket = io(this.config.url, {
          reconnection: true,
          reconnectionAttempts: this.config.reconnectionAttempts,
          reconnectionDelay: this.config.reconnectionDelay,
          reconnectionDelayMax: this.config.reconnectionDelayMax,
          timeout: this.config.timeout,
          // Exponential backoff for reconnection
          randomizationFactor: 0.5,
          // Keep alive with ping-pong
          pingInterval: 10000,
          pingTimeout: 5000,
          query: {
            ...(this.gameId && { gameId: this.gameId }),
            ...(this.playerId && { playerId: this.playerId }),
          },
        });

        // Set up connection event handlers
        this.socket.on('connect', () => {
          console.log('Socket connected');
          this.reconnectAttempts = 0;
          this.notifyHandlers(MessageType.CONNECT);
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('Socket disconnected');
          this.notifyHandlers(MessageType.DISCONNECT);
        });

        this.socket.on('reconnect', () => {
          console.log('Socket reconnected');
          this.notifyHandlers(MessageType.RECONNECT);
          
          // Request sync after reconnection if we have game and player IDs
          if (this.gameId) {
            this.requestSync();
          }

          // Trigger offline service sync
          if (typeof window !== 'undefined') {
            // Import dynamically to avoid circular dependencies
            import('../services/offline').then(({ getOfflineService }) => {
              getOfflineService().syncPendingActions();
            });
          }
        });

        this.socket.on('reconnect_attempt', (attemptNumber: number) => {
          this.reconnectAttempts = attemptNumber;
          console.log(`Reconnection attempt ${this.reconnectAttempts}`);
          
          // Notify handlers with detailed reconnection information
          this.notifyHandlers(MessageType.ERROR, {
            name: 'ReconnectAttempt',
            message: `Attempting to reconnect (${attemptNumber}/${this.config.reconnectionAttempts})`,
            attemptNumber,
            maxAttempts: this.config.reconnectionAttempts
          });
        });

        this.socket.on('reconnect_failed', () => {
          console.error('Socket reconnection failed');
          const error = new Error('Connection lost. Please check your internet connection and try again.');
          this.notifyHandlers(MessageType.ERROR, error);
          reject(error);
        });

        this.socket.on('reconnect_error', (error: Error) => {
          console.error('Socket reconnection error:', error);
          this.notifyHandlers(MessageType.ERROR, {
            name: 'ReconnectError',
            message: 'Failed to reconnect: ' + (error.message || 'Unknown error'),
            originalError: error
          });
        });

        this.socket.on('error', (error: Error) => {
          console.error('Socket error:', error);
          
          // Create a more user-friendly error message
          const userError = new Error(this.getUserFriendlyErrorMessage(error));
          userError.name = 'ConnectionError';
          
          this.notifyHandlers(MessageType.ERROR, userError);
          reject(userError);
        });

        // Set up message event handlers
        this.setupMessageHandlers();

      } catch (error) {
        console.error('Socket connection error:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Join a game with the given ID and player name
   * @param gameId Game ID or code
   * @param playerName Player name
   */
  public async joinGame(gameId: string, playerName: string): Promise<JoinGameResponse> {
    if (!this.socket || !this.socket.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      const request: JoinGameRequest = {
        gameId,
        playerName,
      };

      this.socket.emit(MessageType.JOIN_GAME, request, (response: JoinGameResponse | { error: string }) => {
        if ('error' in response) {
          reject(new Error(response.error));
        } else {
          this.gameId = response.gameId;
          this.playerId = response.playerId;
          resolve(response);
        }
      });
    });
  }

  /**
   * Punch a number on the player's bingo card
   * @param number The number to punch
   */
  public punchNumber(number: number): void {
    if (!this.socket || !this.socket.connected || !this.playerId) {
      console.error('Cannot punch number: not connected or no player ID');
      return;
    }

    this.socket.emit(MessageType.PLAYER_PUNCHED_NUMBER, {
      playerId: this.playerId,
      number,
    });
  }

  /**
   * Unpunch a number on the player's bingo card
   * @param number The number to unpunch
   */
  public unpunchNumber(number: number): void {
    if (!this.socket || !this.socket.connected || !this.playerId) {
      console.error('Cannot unpunch number: not connected or no player ID');
      return;
    }

    this.socket.emit(MessageType.PLAYER_UNPUNCHED_NUMBER, {
      playerId: this.playerId,
      number,
    });
  }
  
  /**
   * Emit a custom event to the server
   * @param event The event name
   * @param data The event data
   */
  public emit(event: string, data: any): void {
    if (!this.socket || !this.socket.connected) {
      console.error(`Cannot emit ${event}: not connected`);
      return;
    }
    
    this.socket.emit(event, data);
  }

  /**
   * Request synchronization with the server
   */
  public requestSync(): void {
    if (!this.socket || !this.socket.connected || !this.gameId) {
      console.error('Cannot request sync: not connected or no game ID');
      return;
    }

    const syncRequest: SyncRequestMessage = {
      type: MessageType.SYNC_REQUEST,
      payload: {
        gameId: this.gameId,
        playerId: this.playerId,
      },
      timestamp: new Date(),
    };

    this.socket.emit(MessageType.SYNC_REQUEST, syncRequest);
  }

  /**
   * Check if the socket is connected
   */
  public isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  /**
   * Register a handler for connection events
   * @param handler The handler function
   * @returns A function to unregister the handler
   */
  public onConnect(handler: ConnectionHandler): () => void {
    return this.registerHandler(MessageType.CONNECT, handler as GenericHandler);
  }

  /**
   * Register a handler for disconnection events
   * @param handler The handler function
   * @returns A function to unregister the handler
   */
  public onDisconnect(handler: ConnectionHandler): () => void {
    return this.registerHandler(MessageType.DISCONNECT, handler as GenericHandler);
  }

  /**
   * Register a handler for reconnection events
   * @param handler The handler function
   * @returns A function to unregister the handler
   */
  public onReconnect(handler: ConnectionHandler): () => void {
    return this.registerHandler(MessageType.RECONNECT, handler as GenericHandler);
  }

  /**
   * Register a handler for error events
   * @param handler The handler function
   * @returns A function to unregister the handler
   */
  public onError(handler: ErrorHandler): () => void {
    return this.registerHandler(MessageType.ERROR, handler as GenericHandler);
  }

  /**
   * Register a handler for game state update events
   * @param handler The handler function
   * @returns A function to unregister the handler
   */
  public onGameStateUpdate(handler: MessageHandler<GameStateUpdateMessage>): () => void {
    return this.registerHandler(MessageType.GAME_STATE_UPDATE, handler as GenericHandler);
  }

  /**
   * Register a handler for number drawn events
   * @param handler The handler function
   * @returns A function to unregister the handler
   */
  public onNumberDrawn(handler: MessageHandler<NumberDrawnMessage>): () => void {
    return this.registerHandler(MessageType.NUMBER_DRAWN, handler as GenericHandler);
  }

  /**
   * Register a handler for player joined events
   * @param handler The handler function
   * @returns A function to unregister the handler
   */
  public onPlayerJoined(handler: MessageHandler<PlayerJoinedMessage>): () => void {
    return this.registerHandler(MessageType.PLAYER_JOINED, handler as GenericHandler);
  }

  /**
   * Register a handler for player punched number events
   * @param handler The handler function
   * @returns A function to unregister the handler
   */
  public onPlayerPunchedNumber(handler: MessageHandler<PlayerPunchedNumberMessage>): () => void {
    return this.registerHandler(MessageType.PLAYER_PUNCHED_NUMBER, handler as GenericHandler);
  }

  /**
   * Register a handler for player bingo events
   * @param handler The handler function
   * @returns A function to unregister the handler
   */
  public onPlayerBingo(handler: MessageHandler<PlayerBingoMessage>): () => void {
    return this.registerHandler(MessageType.PLAYER_BINGO, handler as GenericHandler);
  }

  /**
   * Register a handler for sync response events
   * @param handler The handler function
   * @returns A function to unregister the handler
   */
  public onSyncResponse(handler: MessageHandler<SyncResponseMessage>): () => void {
    return this.registerHandler(MessageType.SYNC_RESPONSE, handler as GenericHandler);
  }

  /**
   * Set up message event handlers
   * @private
   */
  private setupMessageHandlers(): void {
    if (!this.socket) return;

    // Game state messages
    this.socket.on(MessageType.GAME_STATE_UPDATE, (message: GameStateUpdateMessage) => {
      this.notifyHandlers(MessageType.GAME_STATE_UPDATE, message);
    });

    this.socket.on(MessageType.NUMBER_DRAWN, (message: NumberDrawnMessage) => {
      this.notifyHandlers(MessageType.NUMBER_DRAWN, message);
    });

    this.socket.on(MessageType.GAME_PAUSED, (message: WebSocketMessage) => {
      this.notifyHandlers(MessageType.GAME_PAUSED, message);
    });

    this.socket.on(MessageType.GAME_RESUMED, (message: WebSocketMessage) => {
      this.notifyHandlers(MessageType.GAME_RESUMED, message);
    });

    this.socket.on(MessageType.GAME_ENDED, (message: WebSocketMessage) => {
      this.notifyHandlers(MessageType.GAME_ENDED, message);
    });

    // Player messages
    this.socket.on(MessageType.PLAYER_JOINED, (message: PlayerJoinedMessage) => {
      this.notifyHandlers(MessageType.PLAYER_JOINED, message);
    });

    this.socket.on(MessageType.PLAYER_LEFT, (message: WebSocketMessage) => {
      this.notifyHandlers(MessageType.PLAYER_LEFT, message);
    });

    this.socket.on(MessageType.PLAYER_STATUS_CHANGE, (message: WebSocketMessage) => {
      this.notifyHandlers(MessageType.PLAYER_STATUS_CHANGE, message);
    });

    this.socket.on(MessageType.PLAYER_PUNCHED_NUMBER, (message: PlayerPunchedNumberMessage) => {
      this.notifyHandlers(MessageType.PLAYER_PUNCHED_NUMBER, message);
    });

    this.socket.on(MessageType.PLAYER_UNPUNCHED_NUMBER, (message: WebSocketMessage) => {
      this.notifyHandlers(MessageType.PLAYER_UNPUNCHED_NUMBER, message);
    });

    this.socket.on(MessageType.PLAYER_BINGO, (message: PlayerBingoMessage) => {
      this.notifyHandlers(MessageType.PLAYER_BINGO, message);
    });

    // Connection messages
    this.socket.on(MessageType.SYNC_RESPONSE, (message: SyncResponseMessage) => {
      this.notifyHandlers(MessageType.SYNC_RESPONSE, message);
    });

    // Error messages
    this.socket.on(MessageType.ERROR, (message: ErrorMessage) => {
      this.notifyHandlers(MessageType.ERROR, message);
    });
  }

  /**
   * Register an event handler
   * @param event The event type
   * @param handler The handler function
   * @returns A function to unregister the handler
   * @private
   */
  private registerHandler(event: string, handler: GenericHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    const handlers = this.eventHandlers.get(event)!;
    handlers.add(handler);

    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Notify all registered handlers for an event
   * @param event The event type
   * @param data The event data
   * @private
   */
  private notifyHandlers(event: string, data?: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }
  
  /**
   * Convert technical error messages to user-friendly messages
   * @param error The original error
   * @returns A user-friendly error message
   * @private
   */
  private getUserFriendlyErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();
    
    // Network-related errors
    if (message.includes('network') || message.includes('failed to connect')) {
      return 'Unable to connect to the game server. Please check your internet connection.';
    }
    
    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'Connection timed out. The server might be busy or your internet connection is slow.';
    }
    
    // Server errors
    if (message.includes('500') || message.includes('server error')) {
      return 'The game server encountered an error. Please try again later.';
    }
    
    // Authentication errors
    if (message.includes('unauthorized') || message.includes('403') || message.includes('authentication')) {
      return 'Unable to join the game. Your session may have expired.';
    }
    
    // Default message
    return 'Connection issue. Please try reconnecting.';
  }
}

// Create a singleton instance
let socketService: WebSocketService | null = null;

/**
 * Get the WebSocket service instance
 * @returns The WebSocket service instance
 */
export const getSocketService = (): WebSocketService => {
  if (!socketService) {
    socketService = new SocketIOService();
  }
  return socketService;
};