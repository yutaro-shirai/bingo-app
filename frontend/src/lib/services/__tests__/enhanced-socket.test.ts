import { EnhancedSocketService } from '../enhanced-socket';
import { ErrorHandlerService } from '../error-handler';
import { NotificationService } from '../notifications';
import { io, Socket } from 'socket.io-client';

// Mock dependencies
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    close: jest.fn(),
  };
  
  return {
    io: jest.fn(() => mockSocket),
  };
});

jest.mock('../error-handler', () => ({
  ErrorHandlerService: {
    getInstance: jest.fn(() => ({
      handleError: jest.fn(error => error),
    })),
  },
  ErrorCategory: {
    NETWORK: 'network',
  },
}));

jest.mock('../notifications', () => ({
  NotificationService: {
    getInstance: jest.fn(() => ({
      add: jest.fn(),
    })),
  },
}));

describe('EnhancedSocketService', () => {
  let socketService: EnhancedSocketService;
  let mockSocket: any;
  let mockErrorHandler: any;
  let mockNotificationService: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (EnhancedSocketService as any).instance = null;
    
    // Get fresh instance
    socketService = EnhancedSocketService.getInstance();
    
    // Get mock references
    mockSocket = (io as jest.Mock)();
    mockErrorHandler = ErrorHandlerService.getInstance();
    mockNotificationService = NotificationService.getInstance();
    
    // Reset timers
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = EnhancedSocketService.getInstance();
      const instance2 = EnhancedSocketService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
  
  describe('connect', () => {
    const connectionOptions = {
      gameId: 'game-123',
      playerId: 'player-456',
    };
    
    it('should connect to the WebSocket server with correct options', async () => {
      // Setup connect success
      mockSocket.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 100);
        }
      });
      
      // Connect
      const connectPromise = socketService.connect(connectionOptions);
      
      // Advance timers to trigger connect callback
      jest.advanceTimersByTime(100);
      
      // Wait for connect to complete
      await connectPromise;
      
      // Verify socket.io was called with correct options
      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          extraHeaders: {
            'game-id': 'game-123',
            'player-id': 'player-456',
          },
          reconnection: false,
          timeout: 10000,
          autoConnect: true,
        })
      );
      
      // Verify connection state
      expect(socketService.isConnected).toBe(true);
      expect(socketService.isConnecting).toBe(false);
      expect(socketService.error).toBeNull();
    });
    
    it('should handle connection errors', async () => {
      // Setup connect error
      const mockError = new Error('Connection refused');
      mockSocket.once.mockImplementation((event, callback) => {
        if (event === 'connect_error') {
          setTimeout(() => callback(mockError), 100);
        }
      });
      
      // Connect and expect error
      await expect(socketService.connect(connectionOptions)).rejects.toThrow();
      
      // Verify connection state
      expect(socketService.isConnected).toBe(false);
      expect(socketService.isConnecting).toBe(false);
      expect(socketService.error).toBe(mockError);
      
      // Verify error was handled
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(mockError, 'WebSocket');
    });
    
    it('should handle connection timeout', async () => {
      // Don't trigger any callbacks to cause timeout
      
      // Connect and expect timeout
      const connectPromise = socketService.connect(connectionOptions);
      
      // Advance timers to trigger timeout
      jest.advanceTimersByTime(10000);
      
      // Wait for connect to fail
      await expect(connectPromise).rejects.toThrow('Connection timeout');
      
      // Verify connection state
      expect(socketService.isConnected).toBe(false);
      expect(socketService.isConnecting).toBe(false);
      expect(socketService.error).toBeInstanceOf(Error);
    });
    
    it('should not connect if already connected', async () => {
      // Setup initial connected state
      (socketService as any)._isConnected = true;
      
      // Try to connect
      await socketService.connect(connectionOptions);
      
      // Verify socket.io was not called
      expect(io).not.toHaveBeenCalled();
    });
    
    it('should not connect if already connecting', async () => {
      // Setup initial connecting state
      (socketService as any)._isConnecting = true;
      
      // Try to connect
      await socketService.connect(connectionOptions);
      
      // Verify socket.io was not called
      expect(io).not.toHaveBeenCalled();
    });
    
    it('should include admin token in headers if provided', async () => {
      // Setup connect success
      mockSocket.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 100);
        }
      });
      
      // Connect with admin token
      const connectPromise = socketService.connect({
        ...connectionOptions,
        adminToken: 'admin-token-123',
      });
      
      // Advance timers to trigger connect callback
      jest.advanceTimersByTime(100);
      
      // Wait for connect to complete
      await connectPromise;
      
      // Verify socket.io was called with correct headers
      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          extraHeaders: expect.objectContaining({
            'authorization': 'Bearer admin-token-123',
          }),
        })
      );
    });
  });
  
  describe('disconnect', () => {
    it('should close the socket and reset state', () => {
      // Setup initial state
      (socketService as any)._isConnected = true;
      (socketService as any)._isConnecting = false;
      (socketService as any)._connectionError = new Error('Test error');
      (socketService as any).reconnectAttempts = 3;
      (socketService as any).reconnectTimer = setTimeout(() => {}, 1000);
      
      // Disconnect
      socketService.disconnect();
      
      // Verify socket was closed
      expect(mockSocket.close).toHaveBeenCalled();
      
      // Verify state was reset
      expect(socketService.isConnected).toBe(false);
      expect(socketService.isConnecting).toBe(false);
      expect(socketService.error).toBeNull();
      expect((socketService as any).reconnectAttempts).toBe(0);
      expect((socketService as any).reconnectTimer).toBeNull();
    });
  });
  
  describe('event handling', () => {
    beforeEach(async () => {
      // Setup connected socket
      mockSocket.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 100);
        }
      });
      
      const connectPromise = socketService.connect({ gameId: 'game-123' });
      jest.advanceTimersByTime(100);
      await connectPromise;
      
      // Clear mock calls
      jest.clearAllMocks();
    });
    
    it('should register event listeners', () => {
      const callback = jest.fn();
      
      // Register event listener
      const unsubscribe = socketService.on('testEvent', callback);
      
      // Verify event was registered
      expect(typeof unsubscribe).toBe('function');
      
      // Simulate event
      const eventCallbacks = (socketService as any).eventCallbacks.get('testEvent');
      expect(eventCallbacks.has(callback)).toBe(true);
      
      // Unsubscribe
      unsubscribe();
      
      // Verify callback was removed
      expect(eventCallbacks.has(callback)).toBe(false);
    });
    
    it('should emit events and handle responses', async () => {
      // Setup emit mock
      mockSocket.emit.mockImplementation((event, data, callback) => {
        setTimeout(() => callback({ success: true }), 100);
      });
      
      // Emit event
      const promise = socketService.emit('testEvent', { foo: 'bar' });
      
      // Advance timers to trigger callback
      jest.advanceTimersByTime(100);
      
      // Wait for emit to complete
      const result = await promise;
      
      // Verify emit was called
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'testEvent',
        { foo: 'bar' },
        expect.any(Function)
      );
      
      // Verify result
      expect(result).toEqual({ success: true });
    });
    
    it('should handle emit errors', async () => {
      // Setup emit mock with error
      mockSocket.emit.mockImplementation((event, data, callback) => {
        setTimeout(() => callback({ error: new Error('Test error') }), 100);
      });
      
      // Emit event and expect error
      const promise = socketService.emit('testEvent', { foo: 'bar' });
      
      // Advance timers to trigger callback
      jest.advanceTimersByTime(100);
      
      // Wait for emit to fail
      await expect(promise).rejects.toThrow();
      
      // Verify error was handled
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
    
    it('should handle emit timeout', async () => {
      // Don't trigger callback to cause timeout
      
      // Emit event with short timeout
      const promise = socketService.emit('testEvent', { foo: 'bar' }, 500);
      
      // Advance timers to trigger timeout
      jest.advanceTimersByTime(500);
      
      // Wait for emit to fail
      await expect(promise).rejects.toThrow('Request timeout');
    });
    
    it('should throw error when emitting without connection', async () => {
      // Disconnect
      socketService.disconnect();
      
      // Emit event and expect error
      await expect(socketService.emit('testEvent')).rejects.toThrow('Socket not connected');
    });
  });
  
  describe('game-specific methods', () => {
    beforeEach(async () => {
      // Setup connected socket
      mockSocket.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 100);
        }
      });
      
      const connectPromise = socketService.connect({ gameId: 'game-123' });
      jest.advanceTimersByTime(100);
      await connectPromise;
      
      // Setup emit mock
      mockSocket.emit.mockImplementation((event, data, callback) => {
        setTimeout(() => callback({ success: true }), 100);
      });
      
      // Clear mock calls
      jest.clearAllMocks();
    });
    
    it('should register game-specific event handlers', () => {
      const callback = jest.fn();
      
      // Register event handlers
      const unsubscribeGameState = socketService.onGameState(callback);
      const unsubscribeGameStateChanged = socketService.onGameStateChanged(callback);
      const unsubscribePlayerState = socketService.onPlayerState(callback);
      const unsubscribeNumberDrawn = socketService.onNumberDrawn(callback);
      const unsubscribePlayerJoined = socketService.onPlayerJoined(callback);
      const unsubscribePlayerBingo = socketService.onPlayerBingo(callback);
      
      // Verify event handlers were registered
      expect(typeof unsubscribeGameState).toBe('function');
      expect(typeof unsubscribeGameStateChanged).toBe('function');
      expect(typeof unsubscribePlayerState).toBe('function');
      expect(typeof unsubscribeNumberDrawn).toBe('function');
      expect(typeof unsubscribePlayerJoined).toBe('function');
      expect(typeof unsubscribePlayerBingo).toBe('function');
      
      // Verify callbacks were registered
      expect((socketService as any).eventCallbacks.get('gameState').has(callback)).toBe(true);
      expect((socketService as any).eventCallbacks.get('gameStateChanged').has(callback)).toBe(true);
      expect((socketService as any).eventCallbacks.get('playerState').has(callback)).toBe(true);
      expect((socketService as any).eventCallbacks.get('numberDrawn').has(callback)).toBe(true);
      expect((socketService as any).eventCallbacks.get('playerJoined').has(callback)).toBe(true);
      expect((socketService as any).eventCallbacks.get('playerBingo').has(callback)).toBe(true);
    });
    
    it('should emit game-specific events', async () => {
      // Emit events
      await socketService.emitPunchNumber(42);
      await socketService.emitUnpunchNumber(42);
      await socketService.emitValidateBingo([1, 2, 3]);
      await socketService.emitAdminDrawNumber('game-123');
      
      // Verify emits were called
      expect(mockSocket.emit).toHaveBeenCalledWith('punchNumber', { number: 42 }, expect.any(Function));
      expect(mockSocket.emit).toHaveBeenCalledWith('unpunchNumber', { number: 42 }, expect.any(Function));
      expect(mockSocket.emit).toHaveBeenCalledWith('validateBingo', { punchedNumbers: [1, 2, 3] }, expect.any(Function));
      expect(mockSocket.emit).toHaveBeenCalledWith('adminDrawNumber', { gameId: 'game-123' }, expect.any(Function));
    });
  });
  
  describe('reconnection logic', () => {
    beforeEach(() => {
      // Mock console methods
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });
    
    it('should attempt to reconnect on disconnect', async () => {
      // Setup initial connected state
      (socketService as any)._isConnected = true;
      (socketService as any).socket = mockSocket;
      (socketService as any)._connectionOptions = { gameId: 'game-123' };
      
      // Simulate disconnect event
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1];
      expect(disconnectHandler).toBeDefined();
      
      // Trigger disconnect
      disconnectHandler('transport close');
      
      // Verify reconnect timer was set
      expect((socketService as any).reconnectTimer).not.toBeNull();
      
      // Verify notification was shown
      expect(mockNotificationService.add).toHaveBeenCalledWith(expect.objectContaining({
        type: 'warning',
        title: 'Connection Lost',
      }));
      
      // Advance timers to trigger reconnect
      jest.advanceTimersByTime(1000);
      
      // Verify connect was called
      expect(mockSocket.close).toHaveBeenCalled();
      expect(io).toHaveBeenCalled();
    });
    
    it('should use exponential backoff for reconnection attempts', async () => {
      // Setup initial state
      (socketService as any)._isConnected = false;
      (socketService as any).socket = mockSocket;
      (socketService as any)._connectionOptions = { gameId: 'game-123' };
      
      // Setup connect to always fail
      mockSocket.once.mockImplementation((event, callback) => {
        if (event === 'connect_error') {
          setTimeout(() => callback(new Error('Connection refused')), 100);
        }
      });
      
      // Trigger first reconnection attempt
      (socketService as any).handleReconnection();
      
      // Verify first attempt uses 1 second delay
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000);
      
      // Advance timers to trigger first reconnect
      jest.advanceTimersByTime(1000);
      jest.advanceTimersByTime(100); // For the connect_error callback
      
      // Verify second attempt uses 2 second delay
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 2000);
      
      // Advance timers to trigger second reconnect
      jest.advanceTimersByTime(2000);
      jest.advanceTimersByTime(100); // For the connect_error callback
      
      // Verify third attempt uses 4 second delay
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 4000);
    });
    
    it('should stop reconnecting after max attempts', async () => {
      // Setup initial state
      (socketService as any)._isConnected = false;
      (socketService as any).socket = mockSocket;
      (socketService as any)._connectionOptions = { gameId: 'game-123' };
      (socketService as any).reconnectAttempts = 5; // Max attempts
      
      // Trigger reconnection
      (socketService as any).handleReconnection();
      
      // Verify no reconnect timer was set
      expect((socketService as any).reconnectTimer).toBeNull();
      
      // Verify failure notification was shown
      expect(mockNotificationService.add).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        title: 'Connection Failed',
        persistent: true,
      }));
    });
    
    it('should reset reconnect attempts on successful connection', async () => {
      // Setup initial state
      (socketService as any)._isConnected = false;
      (socketService as any).socket = mockSocket;
      (socketService as any)._connectionOptions = { gameId: 'game-123' };
      (socketService as any).reconnectAttempts = 3;
      
      // Setup connect success
      mockSocket.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 100);
        }
      });
      
      // Connect
      const connectPromise = socketService.connect({ gameId: 'game-123' });
      jest.advanceTimersByTime(100);
      await connectPromise;
      
      // Verify reconnect attempts were reset
      expect((socketService as any).reconnectAttempts).toBe(0);
    });
  });
});