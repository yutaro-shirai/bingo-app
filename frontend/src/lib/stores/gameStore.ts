import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import { Game, GameStatus } from 'shared/types';
import { getSocketService } from '../services/socket';

/**
 * Game store state interface
 */
interface GameState {
  // Current game data
  game: Game | null;
  
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Game actions
  setGame: (game: Game | null) => void;
  updateGameStatus: (status: GameStatus) => void;
  addDrawnNumber: (number: number) => void;
  setDrawnNumbers: (numbers: number[]) => void;
  updatePlayerCounts: (playerCount: number, activePlayerCount: number) => void;
  updateBingoCount: (bingoCount: number) => void;
  
  // Connection actions
  setConnectionState: (isConnected: boolean, isConnecting?: boolean) => void;
  setConnectionError: (error: string | null) => void;
  
  // Utility methods
  isGameActive: () => boolean;
  isGamePaused: () => boolean;
  isGameEnded: () => boolean;
  getLastDrawnNumber: () => number | null;
  getDrawnNumbersCount: () => number;
  
  // Reset state
  reset: () => void;
}

/**
 * Initial state
 */
const initialState = {
  game: null,
  isConnected: false,
  isConnecting: false,
  connectionError: null,
};

/**
 * Game store using Zustand with persistence and WebSocket synchronization
 */
export const useGameStore = create<GameState>()(
  persist(
    subscribeWithSelector((set, get) => ({
    ...initialState,

    // Game actions
    setGame: (game: Game | null) => {
      set({ game });
    },

    updateGameStatus: (status: GameStatus) => {
      set((state) => ({
        game: state.game ? { ...state.game, status } : null,
      }));
    },

    addDrawnNumber: (number: number) => {
      set((state) => {
        if (!state.game) return state;
        
        const drawnNumbers = [...state.game.drawnNumbers];
        if (!drawnNumbers.includes(number)) {
          drawnNumbers.push(number);
        }
        
        return {
          game: {
            ...state.game,
            drawnNumbers,
            lastDrawnAt: new Date(),
          },
        };
      });
    },

    setDrawnNumbers: (numbers: number[]) => {
      set((state) => ({
        game: state.game ? { ...state.game, drawnNumbers: numbers } : null,
      }));
    },

    updatePlayerCounts: (playerCount: number, activePlayerCount: number) => {
      set((state) => ({
        game: state.game 
          ? { ...state.game, playerCount, activePlayerCount }
          : null,
      }));
    },

    updateBingoCount: (bingoCount: number) => {
      set((state) => ({
        game: state.game ? { ...state.game, bingoCount } : null,
      }));
    },

    // Connection actions
    setConnectionState: (isConnected: boolean, isConnecting = false) => {
      set({ 
        isConnected, 
        isConnecting,
        connectionError: isConnected ? null : get().connectionError,
      });
    },

    setConnectionError: (error: string | null) => {
      set({ connectionError: error, isConnecting: false });
    },

    // Utility methods
    isGameActive: () => {
      const { game } = get();
      return game?.status === GameStatus.ACTIVE;
    },

    isGamePaused: () => {
      const { game } = get();
      return game?.status === GameStatus.PAUSED;
    },

    isGameEnded: () => {
      const { game } = get();
      return game?.status === GameStatus.ENDED;
    },

    getLastDrawnNumber: () => {
      const { game } = get();
      if (!game || game.drawnNumbers.length === 0) return null;
      return game.drawnNumbers[game.drawnNumbers.length - 1];
    },

    getDrawnNumbersCount: () => {
      const { game } = get();
      return game?.drawnNumbers.length || 0;
    },

    // Reset state
    reset: () => {
      set(initialState);
    },
  })),
    {
      name: 'game-storage',
      partialize: (state) => ({
        game: state.game,
      }),
    }
  )
);

/**
 * Initialize WebSocket event listeners for game store
 */
export const initializeGameStoreSync = () => {
  const socketService = getSocketService();
  const { setGame, updateGameStatus, addDrawnNumber, setConnectionState, setConnectionError } = useGameStore.getState();

  // Connection events
  const unsubscribeConnect = socketService.onConnect(() => {
    setConnectionState(true, false);
  });

  const unsubscribeDisconnect = socketService.onDisconnect(() => {
    setConnectionState(false, false);
  });

  const unsubscribeReconnect = socketService.onReconnect(() => {
    setConnectionState(true, false);
    // Request fresh game state after reconnection
    socketService.requestSync();
  });

  const unsubscribeError = socketService.onError((error: Error) => {
    setConnectionError(error.message);
  });

  // Game state events
  const unsubscribeGameStateUpdate = socketService.onGameStateUpdate((message) => {
    // Ensure the payload has all required Game properties
    const gameData = message.payload as Game;
    setGame(gameData);
  });

  const unsubscribeNumberDrawn = socketService.onNumberDrawn((message) => {
    addDrawnNumber(message.payload.number);
  });

  const unsubscribeGamePaused = socketService.onConnect(() => {
    updateGameStatus(GameStatus.PAUSED);
  });

  const unsubscribeGameResumed = socketService.onConnect(() => {
    updateGameStatus(GameStatus.ACTIVE);
  });

  const unsubscribeGameEnded = socketService.onConnect(() => {
    updateGameStatus(GameStatus.ENDED);
  });

  const unsubscribeSyncResponse = socketService.onSyncResponse((message) => {
    if (message.payload.game) {
      // Ensure the payload has all required Game properties
      const gameData = message.payload.game as Game;
      setGame(gameData);
    }
  });

  // Return cleanup function
  return () => {
    unsubscribeConnect();
    unsubscribeDisconnect();
    unsubscribeReconnect();
    unsubscribeError();
    unsubscribeGameStateUpdate();
    unsubscribeNumberDrawn();
    unsubscribeGamePaused();
    unsubscribeGameResumed();
    unsubscribeGameEnded();
    unsubscribeSyncResponse();
  };
};

/**
 * Hook to get game connection status
 */
export const useGameConnection = () => {
  return useGameStore((state) => ({
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    connectionError: state.connectionError,
  }));
};

/**
 * Hook to get game state
 */
export const useGame = () => {
  return useGameStore((state) => ({
    game: state.game,
    isGameActive: state.isGameActive(),
    isGamePaused: state.isGamePaused(),
    isGameEnded: state.isGameEnded(),
    lastDrawnNumber: state.getLastDrawnNumber(),
    drawnNumbersCount: state.getDrawnNumbersCount(),
  }));
};

/**
 * Hook to get game actions
 */
export const useGameActions = () => {
  return useGameStore((state) => ({
    setGame: state.setGame,
    updateGameStatus: state.updateGameStatus,
    addDrawnNumber: state.addDrawnNumber,
    setDrawnNumbers: state.setDrawnNumbers,
    updatePlayerCounts: state.updatePlayerCounts,
    updateBingoCount: state.updateBingoCount,
    reset: state.reset,
  }));
};