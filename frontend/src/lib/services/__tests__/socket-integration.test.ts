import { EnhancedSocketService } from '../enhanced-socket';
import { io } from 'socket.io-client';
import { GameStatus, DrawMode } from 'shared/types';

// Mock socket.io-client
jest.mock('socket.io-client');

describe('EnhancedSocketService Integration Tests', () => {
  let socketService: EnhancedSocketService;
  let mockSocket: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (EnhancedSocketService as any).instance = null;
    
    // Mock socket.io client
    mockSocket = {
      on: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
      close: jest.fn(),
      connected: false,
    };
    
    (io as jest.Mock).mockReturnValue(mockSocket);
    
    // Get fresh instance
    socketService = EnhancedSocketService.getInstance();
  });
  
  describe('Connection and Reconnection', () => {
    it('should handle successful connection', async () => {
      // Setup connect success
      mockSocket.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 100);
        }
      });
      
      // Connect
      const connectPromise = socketService.connect({
        gameId: 'game-123',
        playerId: 'player-456',
      });
      
      // Simulate successful connection
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Wait for connect to complete
      await connectPromise;
      
      // Verify connection state
      expect(socketService.isConnected).toBe(true);
      expect(socketService.isConnecting).toBe(false);
      expect(socketService.error).toBeNull();
    });
    
    it('should handle connection failure and retry', async () => {
      // Setup connect error
      mockSocket.once.mockImplementation((event, callback) => {
        if (event === 'connect_error') {
          setTimeout(() => callback(new Error('Connection refused')), 100);
        }
      });
      
      // Connect and expect error
      await expect(socketService.connect({
        gameId: 'game-123',
        playerId: 'player-456',
      })).rejects.toThrow();
      
      // Verify connection state
      expect(socketService.isConnected).toBe(false);
      expect(socketService.isConnecting).toBe(false);
      expect(socketService.error).not.toBeNull();
      
      // Verify reconnection timer was set
      expect((socketService as any).reconnectTimer).not.toBeNull();
      
      // Clear timer to prevent memory leaks
      if ((socketService as any).reconnectTimer) {
        clearTimeout((socketService as any).reconnectTimer);
      }
    });
    
    it('should handle disconnect and reconnect', async () => {
      // Setup initial connected state
      (socketService as any)._isConnected = true;
      (socketService as any).socket = mockSocket;
      (socketService as any)._connectionOptions = {
        gameId: 'game-123',
        playerId: 'player-456',
      };
      
      // Setup reconnect success
      mockSocket.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 100);
        }
      });
      
      // Simulate disconnect event
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];
      
      if (disconnectHandler) {
        disconnectHandler('transport close');
        
        // Verify reconnection timer was set
        expect((socketService as any).reconnectTimer).not.toBeNull();
        
        // Manually trigger reconnect
        if ((socketService as any).reconnectTimer) {
          clearTimeout((socketService as any).reconnectTimer);
          (socketService as any).reconnectTimer = null;
        }
        
        await (socketService as any).reconnect();
        
        // Verify socket was recreated
        expect(io).toHaveBeenCalledTimes(1);
      }
    });
  });
  
  describe('Event Handling', () => {
    beforeEach(async () => {
      // Setup connected socket
      (socketService as any)._isConnected = true;
      (socketService as any).socket = mockSocket;
    });
    
    it('should register and handle game events', () => {
      const gameStateHandler = jest.fn();
      const numberDrawnHandler = jest.fn();
      const playerBingoHandler = jest.fn();
      
      // Register event handlers
      socketService.onGameState(gameStateHandler);
      socketService.onNumberDrawn(numberDrawnHandler);
      socketService.onPlayerBingo(playerBingoHandler);
      
      // Verify event handlers were registered
      expect(mockSocket.on).toHaveBeenCalledWith('gameState', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('numberDrawn', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('playerBingo', expect.any(Function));
      
      // Simulate events
      const gameStateCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'gameState'
      )?.[1];
      
      const numberDrawnCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'numberDrawn'
      )?.[1];
      
      const playerBingoCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'playerBingo'
      )?.[1];
      
      // Trigger callbacks
      if (gameStateCallback) {
        gameStateCallback({
          id: 'game-123',
          status: GameStatus.ACTIVE,
          drawnNumbers: [1, 2, 3],
        });
      }
      
      if (numberDrawnCallback) {
        numberDrawnCallback({ number: 42 });
      }
      
      if (playerBingoCallback) {
        playerBingoCallback({ playerId: 'player-789', playerName: 'Winner' });
      }
      
      // Verify handlers were called
      expect(gameStateHandler).toHaveBeenCalledWith({
        id: 'game-123',
        status: GameStatus.ACTIVE,
        drawnNumbers: [1, 2, 3],
      });
      
      expect(numberDrawnHandler).toHaveBeenCalledWith({ number: 42 });
      
      expect(playerBingoHandler).toHaveBeenCalledWith({
        playerId: 'player-789',
        playerName: 'Winner',
      });
    });
    
    it('should emit events and handle responses', async () => {
      // Setup emit mock
      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'punchNumber') {
          setTimeout(() => callback({ success: true }), 100);
        } else if (event === 'validateBingo') {
          setTimeout(() => callback({ valid: true }), 100);
        }
      });
      
      // Emit events
      const punchPromise = socketService.emitPunchNumber(42);
      const validatePromise = socketService.emitValidateBingo([1, 2, 3, 4, 5]);
      
      // Wait for responses
      const [punchResult, validateResult] = await Promise.all([
        punchPromise,
        validatePromise,
      ]);
      
      // Verify results
      expect(punchResult).toEqual({ success: true });
      expect(validateResult).toEqual({ valid: true });
      
      // Verify emit calls
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'punchNumber',
        { number: 42 },
        expect.any(Function)
      );
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'validateBingo',
        { punchedNumbers: [1, 2, 3, 4, 5] },
        expect.any(Function)
      );
    });
    
    it('should handle emit errors', async () => {
      // Setup emit mock with error
      mockSocket.emit.mockImplementation((event, data, callback) => {
        setTimeout(() => callback({ error: { message: 'Invalid operation' } }), 100);
      });
      
      // Emit event and expect error
      await expect(socketService.emitPunchNumber(42)).rejects.toThrow();
    });
  });
  
  describe('Game Flow Integration', () => {
    beforeEach(async () => {
      // Setup connected socket
      (socketService as any)._isConnected = true;
      (socketService as any).socket = mockSocket;
      
      // Setup event callbacks storage
      (socketService as any).eventCallbacks = new Map();
    });
    
    it('should handle a complete game flow', async () => {
      // Mock event handlers
      const gameStateHandler = jest.fn();
      const gameStateChangedHandler = jest.fn();
      const numberDrawnHandler = jest.fn();
      const playerJoinedHandler = jest.fn();
      const playerBingoHandler = jest.fn();
      
      // Register event handlers
      socketService.onGameState(gameStateHandler);
      socketService.on('gameStateChanged', gameStateChangedHandler);
      socketService.onNumberDrawn(numberDrawnHandler);
      socketService.on('playerJoined', playerJoinedHandler);
      socketService.onPlayerBingo(playerBingoHandler);
      
      // Setup emit responses
      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'punchNumber') {
          setTimeout(() => callback({ success: true }), 50);
        } else if (event === 'validateBingo') {
          setTimeout(() => callback({ valid: true }), 50);
        }
      });
      
      // 1. Simulate initial game state
      const initialGameState = {
        id: 'game-123',
        code: 'ABC123',
        status: GameStatus.CREATED,
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [],
        playerCount: 1,
        activePlayerCount: 1,
        bingoCount: 0,
      };
      
      // Trigger gameState event
      const gameStateCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'gameState'
      )?.[1];
      
      if (gameStateCallback) {
        gameStateCallback(initialGameState);
      }
      
      // Verify handler was called
      expect(gameStateHandler).toHaveBeenCalledWith(initialGameState);
      
      // 2. Simulate game started
      const gameStartedState = {
        ...initialGameState,
        status: GameStatus.ACTIVE,
      };
      
      // Trigger gameStateChanged event
      const gameStateChangedCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'gameStateChanged'
      )?.[1];
      
      if (gameStateChangedCallback) {
        gameStateChangedCallback(gameStartedState);
      }
      
      // Verify handler was called
      expect(gameStateChangedHandler).toHaveBeenCalledWith(gameStartedState);
      
      // 3. Simulate player joined
      const playerJoinedData = {
        playerId: 'player-789',
        playerName: 'New Player',
      };
      
      // Trigger playerJoined event
      const playerJoinedCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'playerJoined'
      )?.[1];
      
      if (playerJoinedCallback) {
        playerJoinedCallback(playerJoinedData);
      }
      
      // Verify handler was called
      expect(playerJoinedHandler).toHaveBeenCalledWith(playerJoinedData);
      
      // 4. Simulate number drawn
      const numberDrawnData = { number: 42 };
      
      // Trigger numberDrawn event
      const numberDrawnCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'numberDrawn'
      )?.[1];
      
      if (numberDrawnCallback) {
        numberDrawnCallback(numberDrawnData);
      }
      
      // Verify handler was called
      expect(numberDrawnHandler).toHaveBeenCalledWith(numberDrawnData);
      
      // 5. Punch a number
      await socketService.emitPunchNumber(42);
      
      // Verify emit was called
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'punchNumber',
        { number: 42 },
        expect.any(Function)
      );
      
      // 6. Validate bingo
      await socketService.emitValidateBingo([42]);
      
      // Verify emit was called
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'validateBingo',
        { punchedNumbers: [42] },
        expect.any(Function)
      );
      
      // 7. Simulate player bingo
      const playerBingoData = {
        playerId: 'player-456',
        playerName: 'Winner',
      };
      
      // Trigger playerBingo event
      const playerBingoCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'playerBingo'
      )?.[1];
      
      if (playerBingoCallback) {
        playerBingoCallback(playerBingoData);
      }
      
      // Verify handler was called
      expect(playerBingoHandler).toHaveBeenCalledWith(playerBingoData);
      
      // 8. Simulate game ended
      const gameEndedState = {
        ...initialGameState,
        status: GameStatus.ENDED,
      };
      
      if (gameStateChangedCallback) {
        gameStateChangedCallback(gameEndedState);
      }
      
      // Verify handler was called
      expect(gameStateChangedHandler).toHaveBeenCalledWith(gameEndedState);
    });
  });
});