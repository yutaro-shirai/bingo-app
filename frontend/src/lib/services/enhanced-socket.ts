import { io, Socket } from 'socket.io-client';
import { ErrorHandlerService, ErrorCategory } from './error-handler';
import { NotificationService } from './notifications';

/**
 * Connection options for the socket service
 */
interface ConnectionOptions {
  gameId: string;
  playerId?: string;
  adminToken?: string;
}

/**
 * Enhanced Socket Service with better error handling and reconnection logic
 */
export class EnhancedSocketService {
  private static instance: EnhancedSocketService;
  
  // Socket instance
  public socket: Socket | null = null;
  
  // Connection state
  private _isConnected = false;
  private _isConnecting = false;
  private _connectionError: Error | null = null;
  private _connectionOptions: ConnectionOptions | null = null;
  
  // Reconnection settings
  private readonly maxReconnectAttempts = 5;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  // Services
  private errorHandler: ErrorHandlerService;
  private notificationService: NotificationService;
  
  // Event callbacks
  private eventCallbacks: Map<string, Set<Function>> = new Map();

  private constructor() {
    this.errorHandler = ErrorHandlerService.getInstance();
    this.notificationService = NotificationService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EnhancedSocketService {
    if (!EnhancedSocketService.instance) {
      EnhancedSocketService.instance = new EnhancedSocketService();
    }
    return EnhancedSocketService.instance;
  }

  /**
   * Get connection state
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  get isConnecting(): boolean {
    return this._isConnecting;
  }

  get error(): Error | null {
    return this._connectionError;
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(options: ConnectionOptions): Promise<void> {
    // Don't connect if already connected or connecting
    if (this._isConnected || this._isConnecting) {
      return;
    }
    
    this._isConnecting = true;
    this._connectionError = null;
    this._connectionOptions = options;
    
    try {
      // Close existing socket if any
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      
      // Prepare headers
      const headers: Record<string, string> = {
        'game-id': options.gameId,
      };
      
      if (options.playerId) {
        headers['player-id'] = options.playerId;
      }
      
      if (options.adminToken) {
        headers['authorization'] = `Bearer ${options.adminToken}`;
      }
      
      // Create socket
      this.socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001', {
        extraHeaders: headers,
        reconnection: false, // We'll handle reconnection manually
        timeout: 10000, // 10 seconds
        autoConnect: true,
      });
      
      // Set up event listeners
      this.setupSocketEventListeners();
      
      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not initialized'));
          return;
        }
        
        // Set timeout
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);
        
        // Handle connect event
        this.socket.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        // Handle connect error
        this.socket.once('connect_error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
      
      // Connection successful
      this._isConnected = true;
      this._isConnecting = false;
      this.reconnectAttempts = 0;
      
      console.log('WebSocket connected');
    } catch (error) {
      // Connection failed
      this._isConnected = false;
      this._isConnecting = false;
      this._connectionError = error instanceof Error ? error : new Error(String(error));
      
      console.error('WebSocket connection failed:', error);
      
      // Handle reconnection
      this.handleReconnection();
      
      // Throw error
      throw this.errorHandler.handleError(error, 'WebSocket');
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    // Clear reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Close socket
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    // Reset state
    this._isConnected = false;
    this._isConnecting = false;
    this._connectionError = null;
    this.reconnectAttempts = 0;
    
    console.log('WebSocket disconnected');
  }

  /**
   * Set up socket event listeners
   */
  private setupSocketEventListeners(): void {
    if (!this.socket) return;
    
    // Connection events
    this.socket.on('connect', () => {
      this._isConnected = true;
      this._isConnecting = false;
      this._connectionError = null;
      this.reconnectAttempts = 0;
      
      // Notify connection status
      this.notificationService.add({
        type: 'success',
        title: 'Connected',
        message: 'Successfully connected to the game server',
        duration: 3000,
      });
    });
    
    this.socket.on('disconnect', (reason) => {
      this._isConnected = false;
      
      console.log('WebSocket disconnected:', reason);
      
      // Handle reconnection for certain disconnect reasons
      if (
        reason === 'io server disconnect' ||
        reason === 'io client disconnect' ||
        reason === 'forced close'
      ) {
        // Don't reconnect automatically
      } else {
        // Try to reconnect
        this.handleReconnection();
      }
    });
    
    this.socket.on('connect_error', (error) => {
      this._isConnected = false;
      this._isConnecting = false;
      this._connectionError = error;
      
      console.error('WebSocket connection error:', error);
      
      // Handle reconnection
      this.handleReconnection();
    });
    
    // Server error events
    this.socket.on('exception', (error) => {
      this.errorHandler.handleError({
        message: error.message || 'Server error',
        status: error.status,
      }, 'WebSocket');
    });
    
    // Forward registered events to callbacks
    for (const [event, callbacks] of this.eventCallbacks.entries()) {
      this.socket.on(event, (data) => {
        callbacks.forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            console.error(`Error in ${event} event handler:`, error);
          }
        });
      });
    }
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(): void {
    // Clear existing timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Check if we should reconnect
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Too many attempts, give up
      this.notificationService.add({
        type: 'error',
        title: 'Connection Failed',
        message: 'Unable to connect to the game server after multiple attempts',
        actions: [
          {
            label: 'Try Again',
            action: () => {
              this.reconnectAttempts = 0;
              this.reconnect();
            },
            style: 'primary',
          },
        ],
        persistent: true,
      });
      return;
    }
    
    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    // Show notification on first attempt
    if (this.reconnectAttempts === 1) {
      this.notificationService.add({
        type: 'warning',
        title: 'Connection Lost',
        message: 'Attempting to reconnect...',
        duration: 5000,
      });
    }
    
    // Schedule reconnection
    this.reconnectTimer = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  /**
   * Reconnect to the WebSocket server
   */
  private async reconnect(): Promise<void> {
    if (!this._connectionOptions) return;
    
    try {
      await this.connect(this._connectionOptions);
    } catch (error) {
      // Error is already handled in connect method
    }
  }

  /**
   * Register event listener
   */
  on<T = any>(event: string, callback: (data: T) => void): () => void {
    // Initialize callback set if needed
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set());
      
      // Register with socket if already connected
      if (this.socket) {
        this.socket.on(event, (data) => {
          const callbacks = this.eventCallbacks.get(event);
          if (callbacks) {
            callbacks.forEach((cb) => {
              try {
                cb(data);
              } catch (error) {
                console.error(`Error in ${event} event handler:`, error);
              }
            });
          }
        });
      }
    }
    
    // Add callback
    this.eventCallbacks.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.eventCallbacks.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Emit event with error handling and timeout
   */
  async emit<T = any>(event: string, data?: any, timeout = 5000): Promise<T> {
    if (!this.socket || !this._isConnected) {
      throw this.errorHandler.handleError({
        message: 'Socket not connected',
        category: ErrorCategory.NETWORK,
      }, 'WebSocket');
    }
    
    return new Promise<T>((resolve, reject) => {
      // Set timeout
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);
      
      // Emit event
      this.socket!.emit(event, data, (response: any) => {
        clearTimeout(timeoutId);
        
        if (response && response.error) {
          reject(response.error);
        } else {
          resolve(response);
        }
      });
    }).catch((error) => {
      throw this.errorHandler.handleError(error, `WebSocket.${event}`);
    });
  }

  /**
   * Game-specific event handlers
   */
  onGameState(callback: (gameState: any) => void): () => void {
    return this.on('gameState', callback);
  }
  
  onGameStateChanged(callback: (gameState: any) => void): () => void {
    return this.on('gameStateChanged', callback);
  }
  
  onPlayerState(callback: (playerState: any) => void): () => void {
    return this.on('playerState', callback);
  }
  
  onNumberDrawn(callback: (data: { number: number }) => void): () => void {
    return this.on('numberDrawn', callback);
  }
  
  onPlayerJoined(callback: (data: { id: string; name: string }) => void): () => void {
    return this.on('playerJoined', callback);
  }
  
  onPlayerBingo(callback: (data: { id: string; name: string }) => void): () => void {
    return this.on('playerBingo', callback);
  }
  
  /**
   * Game-specific emit methods
   */
  async emitPunchNumber(number: number): Promise<{ success: boolean }> {
    return this.emit('punchNumber', { number });
  }
  
  async emitUnpunchNumber(number: number): Promise<{ success: boolean }> {
    return this.emit('unpunchNumber', { number });
  }
  
  async emitValidateBingo(punchedNumbers: number[]): Promise<{ valid: boolean }> {
    return this.emit('validateBingo', { punchedNumbers });
  }
  
  async emitAdminDrawNumber(gameId: string): Promise<{ success: boolean; number: number }> {
    return this.emit('adminDrawNumber', { gameId });
  }
}