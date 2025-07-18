import { renderHook, act } from '@testing-library/react';
import { usePlayerStore, usePlayer, usePlayerCard, usePlayerActions } from '../playerStore';
import { BingoCard } from 'shared/types';

// Mock the socket service
jest.mock('../../services/socket', () => ({
  getSocketService: () => ({
    isConnected: jest.fn(() => true),
    punchNumber: jest.fn(),
    unpunchNumber: jest.fn(),
    requestSync: jest.fn(),
    onPlayerPunchedNumber: jest.fn(() => () => {}),
    onPlayerBingo: jest.fn(() => () => {}),
    onSyncResponse: jest.fn(() => () => {}),
    onConnect: jest.fn(() => () => {}),
    onDisconnect: jest.fn(() => () => {}),
    onReconnect: jest.fn(() => () => {}),
  }),
}));

describe('Player Store', () => {
  const mockCard: BingoCard = {
    grid: [
      [1, 16, 31, 46, 61],
      [2, 17, 32, 47, 62],
      [3, 18, 33, 48, 63],
      [4, 19, 34, 49, 64],
      [5, 20, 35, 50, 65],
    ],
  };

  const mockPlayer = {
    id: 'test-player',
    gameId: 'test-game',
    name: 'Test Player',
    card: mockCard,
    punchedNumbers: [],
    hasBingo: false,
    isOnline: true,
    lastSeenAt: new Date(),
  };

  beforeEach(() => {
    // Reset store state before each test
    usePlayerStore.getState().reset();
  });

  describe('usePlayer hook', () => {
    it('should return initial player state', () => {
      const { result } = renderHook(() => usePlayer());
      
      expect(result.current.player).toBeNull();
      expect(result.current.hasBingo).toBe(false);
      expect(result.current.bingoLines).toEqual([]);
    });
  });

  describe('usePlayerCard hook', () => {
    it('should provide card interaction methods', () => {
      const { result } = renderHook(() => usePlayerCard());
      
      expect(typeof result.current.isNumberPunched).toBe('function');
      expect(typeof result.current.getCardNumber).toBe('function');
      expect(typeof result.current.isPunchedPosition).toBe('function');
      expect(typeof result.current.punchNumber).toBe('function');
      expect(typeof result.current.unpunchNumber).toBe('function');
    });

    it('should handle card number retrieval', () => {
      const { result: actionsResult } = renderHook(() => usePlayerActions());
      const { result: cardResult } = renderHook(() => usePlayerCard());

      act(() => {
        actionsResult.current.setPlayer(mockPlayer);
      });

      expect(cardResult.current.getCardNumber(0, 0)).toBe(1);
      expect(cardResult.current.getCardNumber(2, 2)).toBe(33);
      expect(cardResult.current.getCardNumber(-1, 0)).toBeNull();
      expect(cardResult.current.getCardNumber(5, 0)).toBeNull();
    });
  });

  describe('usePlayerActions hook', () => {
    it('should provide player actions', () => {
      const { result } = renderHook(() => usePlayerActions());
      
      expect(typeof result.current.setPlayer).toBe('function');
      expect(typeof result.current.updatePlayerCard).toBe('function');
      expect(typeof result.current.setPunchedNumbers).toBe('function');
      expect(typeof result.current.setBingoStatus).toBe('function');
      expect(typeof result.current.setOnlineStatus).toBe('function');
      expect(typeof result.current.syncWithServer).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    it('should handle number punching', () => {
      const { result: playerResult } = renderHook(() => usePlayer());
      const { result: cardResult } = renderHook(() => usePlayerCard());
      const { result: actionsResult } = renderHook(() => usePlayerActions());

      act(() => {
        actionsResult.current.setPlayer(mockPlayer);
      });

      // Punch a number
      act(() => {
        cardResult.current.punchNumber(1);
      });

      expect(cardResult.current.isNumberPunched(1)).toBe(true);
      expect(playerResult.current.player?.punchedNumbers).toContain(1);

      // Unpunch the number
      act(() => {
        cardResult.current.unpunchNumber(1);
      });

      expect(cardResult.current.isNumberPunched(1)).toBe(false);
      expect(playerResult.current.player?.punchedNumbers).not.toContain(1);
    });

    it('should detect bingo correctly', () => {
      const { result: playerResult } = renderHook(() => usePlayer());
      const { result: cardResult } = renderHook(() => usePlayerCard());
      const { result: actionsResult } = renderHook(() => usePlayerActions());

      act(() => {
        actionsResult.current.setPlayer(mockPlayer);
      });

      // Punch a complete row (first row: 1, 16, 31, 46, 61)
      act(() => {
        cardResult.current.punchNumber(1);
        cardResult.current.punchNumber(16);
        cardResult.current.punchNumber(31);
        cardResult.current.punchNumber(46);
        cardResult.current.punchNumber(61);
      });

      expect(playerResult.current.hasBingo).toBe(true);
      expect(playerResult.current.bingoLines).toHaveLength(1);
      expect(playerResult.current.bingoLines[0]).toEqual({ type: 'row', index: 0 });
    });

    it('should detect diagonal bingo', () => {
      const { result: playerResult } = renderHook(() => usePlayer());
      const { result: cardResult } = renderHook(() => usePlayerCard());
      const { result: actionsResult } = renderHook(() => usePlayerActions());

      act(() => {
        actionsResult.current.setPlayer(mockPlayer);
      });

      // Punch diagonal (1, 17, 33, 49, 65)
      act(() => {
        cardResult.current.punchNumber(1);
        cardResult.current.punchNumber(17);
        cardResult.current.punchNumber(33);
        cardResult.current.punchNumber(49);
        cardResult.current.punchNumber(65);
      });

      expect(playerResult.current.hasBingo).toBe(true);
      expect(playerResult.current.bingoLines).toHaveLength(1);
      expect(playerResult.current.bingoLines[0]).toEqual({ type: 'diagonal', index: 0 });
    });
  });
});