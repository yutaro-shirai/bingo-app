import { renderHook, act } from '@testing-library/react';
import { useGameStore, useGame, useGameConnection, useGameActions } from '../gameStore';
import { GameStatus } from 'shared/types';

// Mock the socket service
jest.mock('../../services/socket', () => ({
  getSocketService: () => ({
    onConnect: jest.fn(() => () => {}),
    onDisconnect: jest.fn(() => () => {}),
    onReconnect: jest.fn(() => () => {}),
    onError: jest.fn(() => () => {}),
    onGameStateUpdate: jest.fn(() => () => {}),
    onNumberDrawn: jest.fn(() => () => {}),
    onSyncResponse: jest.fn(() => () => {}),
  }),
}));

describe('Game Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGameStore.getState().reset();
  });

  describe('useGame hook', () => {
    it('should return initial game state', () => {
      const { result } = renderHook(() => useGame());
      
      expect(result.current.game).toBeNull();
      expect(result.current.isGameActive).toBe(false);
      expect(result.current.isGamePaused).toBe(false);
      expect(result.current.isGameEnded).toBe(false);
      expect(result.current.lastDrawnNumber).toBeNull();
      expect(result.current.drawnNumbersCount).toBe(0);
    });
  });

  describe('useGameConnection hook', () => {
    it('should return initial connection state', () => {
      const { result } = renderHook(() => useGameConnection());
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.connectionError).toBeNull();
    });
  });

  describe('useGameActions hook', () => {
    it('should provide game actions', () => {
      const { result } = renderHook(() => useGameActions());
      
      expect(typeof result.current.setGame).toBe('function');
      expect(typeof result.current.updateGameStatus).toBe('function');
      expect(typeof result.current.addDrawnNumber).toBe('function');
      expect(typeof result.current.setDrawnNumbers).toBe('function');
      expect(typeof result.current.updatePlayerCounts).toBe('function');
      expect(typeof result.current.updateBingoCount).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    it('should update game status', () => {
      const { result: gameResult } = renderHook(() => useGame());
      const { result: actionsResult } = renderHook(() => useGameActions());

      const mockGame = {
        id: 'test-game',
        code: 'TEST123',
        status: GameStatus.CREATED,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: 'manual' as const,
        drawnNumbers: [],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      act(() => {
        actionsResult.current.setGame(mockGame);
      });

      expect(gameResult.current.game).toEqual(mockGame);

      act(() => {
        actionsResult.current.updateGameStatus(GameStatus.ACTIVE);
      });

      expect(gameResult.current.game?.status).toBe(GameStatus.ACTIVE);
      expect(gameResult.current.isGameActive).toBe(true);
    });

    it('should add drawn numbers', () => {
      const { result: gameResult } = renderHook(() => useGame());
      const { result: actionsResult } = renderHook(() => useGameActions());

      const mockGame = {
        id: 'test-game',
        code: 'TEST123',
        status: GameStatus.ACTIVE,
        createdAt: new Date(),
        expiresAt: new Date(),
        drawMode: 'manual' as const,
        drawnNumbers: [],
        playerCount: 0,
        activePlayerCount: 0,
        bingoCount: 0,
        adminConnections: [],
      };

      act(() => {
        actionsResult.current.setGame(mockGame);
      });

      act(() => {
        actionsResult.current.addDrawnNumber(15);
      });

      expect(gameResult.current.game?.drawnNumbers).toContain(15);
      expect(gameResult.current.lastDrawnNumber).toBe(15);
      expect(gameResult.current.drawnNumbersCount).toBe(1);

      // Adding the same number should not duplicate
      act(() => {
        actionsResult.current.addDrawnNumber(15);
      });

      expect(gameResult.current.drawnNumbersCount).toBe(1);
    });
  });
});