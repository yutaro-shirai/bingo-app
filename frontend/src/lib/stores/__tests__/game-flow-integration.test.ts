import { renderHook, act } from '@testing-library/react';
import { useGameStore } from '../gameStore';
import { usePlayerStore } from '../playerStore';
import { EnhancedSocketService } from '../../services/enhanced-socket';
import { GameStatus, DrawMode } from 'shared/types';

// Mock the socket service
jest.mock('../../services/enhanced-socket', () => {
  const mockSocketService = {
    isConnected: false,
    isConnecting: false,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    onGameState: jest.fn(),
    onGameStateChanged: jest.fn(),
    onNumberDrawn: jest.fn(),
    onPlayerState: jest.fn(),
    onPlayerJoined: jest.fn(),
    onPlayerBingo: jest.fn(),
    emitPunchNumber: jest.fn(),
    emitUnpunchNumber: jest.fn(),
    emitValidateBingo: jest.fn(),
    emitAdminDrawNumber: jest.fn(),
  };
  
  return {
    EnhancedSocketService: {
      getInstance: jest.fn(() => mockSocketService),
    },
  };
});

describe('Game Flow Integration', () => {
  let socketService: ReturnType<typeof EnhancedSocketService.getInstance>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset store state
    useGameStore.getState().reset();
    usePlayerStore.getState().reset();
    
    // Get mock socket service
    socketService = EnhancedSocketService.getInstance();
    
    // Setup default mock values
    (socketService.connect as jest.Mock).mockResolvedValue(undefined);
    (socketService.emitPunchNumber as jest.Mock).mockResolvedValue({ success: true });
    (socketService.emitUnpunchNumber as jest.Mock).mockResolvedValue({ success: true });
    (socketService.emitValidateBingo as jest.Mock).mockResolvedValue({ valid: true });
  });
  
  it('should handle a complete game flow', async () => {
    // Setup event handler registration
    const eventHandlers: Record<string, Function> = {};
    
    (socketService.onGameState as jest.Mock).mockImplementation((callback) => {
      eventHandlers.gameState = callback;
      return jest.fn();
    });
    
    (socketService.onGameStateChanged as jest.Mock).mockImplementation((callback) => {
      eventHandlers.gameStateChanged = callback;
      return jest.fn();
    });
    
    (socketService.onNumberDrawn as jest.Mock).mockImplementation((callback) => {
      eventHandlers.numberDrawn = callback;
      return jest.fn();
    });
    
    (socketService.onPlayerState as jest.Mock).mockImplementation((callback) => {
      eventHandlers.playerState = callback;
      return jest.fn();
    });
    
    (socketService.onPlayerJoined as jest.Mock).mockImplementation((callback) => {
      eventHandlers.playerJoined = callback;
      return jest.fn();
    });
    
    (socketService.onPlayerBingo as jest.Mock).mockImplementation((callback) => {
      eventHandlers.playerBingo = callback;
      return jest.fn();
    });
    
    // Render hooks
    const { result: gameResult } = renderHook(() => useGameStore());
    const { result: playerResult } = renderHook(() => usePlayerStore());
    
    // 1. Connect to game
    await act(async () => {
      await gameResult.current.connect({
        gameId: 'game-123',
        playerId: 'player-456',
      });
    });
    
    // Verify connect was called
    expect(socketService.connect).toHaveBeenCalledWith({
      gameId: 'game-123',
      playerId: 'player-456',
    });
    
    // Verify event handlers were registered
    expect(socketService.onGameState).toHaveBeenCalled();
    expect(socketService.onGameStateChanged).toHaveBeenCalled();
    expect(socketService.onNumberDrawn).toHaveBeenCalled();
    expect(socketService.onPlayerState).toHaveBeenCalled();
    expect(socketService.onPlayerJoined).toHaveBeenCalled();
    expect(socketService.onPlayerBingo).toHaveBeenCalled();
    
    // 2. Simulate receiving initial game state
    act(() => {
      eventHandlers.gameState({
        id: 'game-123',
        code: 'ABC123',
        status: GameStatus.CREATED,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [],
        playerCount: 1,
        activePlayerCount: 1,
        bingoCount: 0,
        adminConnections: [],
      });
    });
    
    // Verify game state was updated
    expect(gameResult.current.game).not.toBeNull();
    expect(gameResult.current.game?.id).toBe('game-123');
    expect(gameResult.current.game?.code).toBe('ABC123');
    expect(gameResult.current.game?.status).toBe(GameStatus.CREATED);
    
    // 3. Simulate receiving player state
    act(() => {
      eventHandlers.playerState({
        id: 'player-456',
        gameId: 'game-123',
        name: 'Test Player',
        card: {
          grid: [
            [1, 2, 3, 4, 5],
            [6, 7, 8, 9, 10],
            [11, 12, 13, 14, 15],
            [16, 17, 18, 19, 20],
            [21, 22, 23, 24, 25],
          ],
        },
        punchedNumbers: [],
        hasBingo: false,
        isOnline: true,
        lastSeenAt: new Date(),
      });
    });
    
    // Verify player state was updated
    expect(playerResult.current.player).not.toBeNull();
    expect(playerResult.current.player?.id).toBe('player-456');
    expect(playerResult.current.player?.name).toBe('Test Player');
    expect(playerResult.current.player?.card).toBeDefined();
    expect(playerResult.current.player?.punchedNumbers).toEqual([]);
    
    // 4. Simulate game started
    act(() => {
      eventHandlers.gameStateChanged({
        id: 'game-123',
        code: 'ABC123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [],
        playerCount: 1,
        activePlayerCount: 1,
        bingoCount: 0,
        adminConnections: [],
      });
    });
    
    // Verify game state was updated
    expect(gameResult.current.game?.status).toBe(GameStatus.ACTIVE);
    expect(gameResult.current.isGameActive).toBe(true);
    
    // 5. Simulate number drawn
    act(() => {
      eventHandlers.numberDrawn({ number: 7 });
    });
    
    // Verify drawn number was added
    expect(gameResult.current.game?.drawnNumbers).toContain(7);
    expect(gameResult.current.lastDrawnNumber).toBe(7);
    
    // 6. Punch a number
    await act(async () => {
      await playerResult.current.punchNumber(7);
    });
    
    // Verify punch number was called
    expect(socketService.emitPunchNumber).toHaveBeenCalledWith(7);
    expect(playerResult.current.player?.punchedNumbers).toContain(7);
    
    // 7. Simulate another player joining
    act(() => {
      eventHandlers.playerJoined({
        playerId: 'player-789',
        playerName: 'Another Player',
      });
    });
    
    // 8. Simulate another player getting bingo
    act(() => {
      eventHandlers.playerBingo({
        playerId: 'player-789',
        playerName: 'Another Player',
      });
    });
    
    // 9. Validate own bingo
    await act(async () => {
      await playerResult.current.validateBingo();
    });
    
    // Verify validate bingo was called
    expect(socketService.emitValidateBingo).toHaveBeenCalledWith([7]);
    
    // 10. Simulate game ended
    act(() => {
      eventHandlers.gameStateChanged({
        id: 'game-123',
        code: 'ABC123',
        status: GameStatus.ENDED,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: DrawMode.MANUAL,
        drawnNumbers: [7],
        playerCount: 2,
        activePlayerCount: 2,
        bingoCount: 1,
        adminConnections: [],
      });
    });
    
    // Verify game state was updated
    expect(gameResult.current.game?.status).toBe(GameStatus.ENDED);
    expect(gameResult.current.isGameEnded).toBe(true);
    
    // 11. Disconnect
    act(() => {
      gameResult.current.disconnect();
    });
    
    // Verify disconnect was called
    expect(socketService.disconnect).toHaveBeenCalled();
  });
  
  it('should handle connection errors', async () => {
    // Setup connect to fail
    (socketService.connect as jest.Mock).mockRejectedValue(new Error('Connection failed'));
    
    // Render hooks
    const { result: gameResult } = renderHook(() => useGameStore());
    
    // Try to connect
    await act(async () => {
      try {
        await gameResult.current.connect({
          gameId: 'game-123',
          playerId: 'player-456',
        });
      } catch (error) {
        // Expected error
      }
    });
    
    // Verify connection state
    expect(gameResult.current.isConnected).toBe(false);
    expect(gameResult.current.isConnecting).toBe(false);
    expect(gameResult.current.connectionError).not.toBeNull();
    expect(gameResult.current.connectionError?.message).toBe('Connection failed');
  });
  
  it('should handle punch/unpunch operations', async () => {
    // Setup event handler registration
    const eventHandlers: Record<string, Function> = {};
    
    (socketService.onPlayerState as jest.Mock).mockImplementation((callback) => {
      eventHandlers.playerState = callback;
      return jest.fn();
    });
    
    // Render hooks
    const { result: playerResult } = renderHook(() => usePlayerStore());
    
    // Simulate receiving player state
    act(() => {
      eventHandlers.playerState({
        id: 'player-456',
        gameId: 'game-123',
        name: 'Test Player',
        card: {
          grid: [
            [1, 2, 3, 4, 5],
            [6, 7, 8, 9, 10],
            [11, 12, 13, 14, 15],
            [16, 17, 18, 19, 20],
            [21, 22, 23, 24, 25],
          ],
        },
        punchedNumbers: [],
        hasBingo: false,
        isOnline: true,
        lastSeenAt: new Date(),
      });
    });
    
    // Punch a number
    await act(async () => {
      await playerResult.current.punchNumber(7);
    });
    
    // Verify punch number was called
    expect(socketService.emitPunchNumber).toHaveBeenCalledWith(7);
    expect(playerResult.current.player?.punchedNumbers).toContain(7);
    
    // Unpunch the number
    await act(async () => {
      await playerResult.current.unpunchNumber(7);
    });
    
    // Verify unpunch number was called
    expect(socketService.emitUnpunchNumber).toHaveBeenCalledWith(7);
    expect(playerResult.current.player?.punchedNumbers).not.toContain(7);
  });
  
  it('should handle offline mode operations', async () => {
    // Setup event handler registration
    const eventHandlers: Record<string, Function> = {};
    
    (socketService.onPlayerState as jest.Mock).mockImplementation((callback) => {
      eventHandlers.playerState = callback;
      return jest.fn();
    });
    
    // Setup emitPunchNumber to fail (simulate offline)
    (socketService.emitPunchNumber as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    // Render hooks
    const { result: playerResult } = renderHook(() => usePlayerStore());
    
    // Simulate receiving player state
    act(() => {
      eventHandlers.playerState({
        id: 'player-456',
        gameId: 'game-123',
        name: 'Test Player',
        card: {
          grid: [
            [1, 2, 3, 4, 5],
            [6, 7, 8, 9, 10],
            [11, 12, 13, 14, 15],
            [16, 17, 18, 19, 20],
            [21, 22, 23, 24, 25],
          ],
        },
        punchedNumbers: [],
        hasBingo: false,
        isOnline: true,
        lastSeenAt: new Date(),
      });
    });
    
    // Enable offline mode
    act(() => {
      playerResult.current.setOfflineMode(true);
    });
    
    // Punch a number in offline mode
    await act(async () => {
      await playerResult.current.punchNumber(7);
    });
    
    // Verify punch was still processed locally despite network error
    expect(socketService.emitPunchNumber).toHaveBeenCalledWith(7);
    expect(playerResult.current.player?.punchedNumbers).toContain(7);
    
    // Verify pending actions were recorded
    expect(playerResult.current.pendingActions.length).toBe(1);
    expect(playerResult.current.pendingActions[0]).toEqual({
      type: 'punch',
      number: 7,
    });
  });
});