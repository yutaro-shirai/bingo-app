import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import { Player, BingoCard } from 'shared/types';
import { getSocketService } from '../services/socket';
import { getOfflineService } from '../services/offline';

/**
 * Player store state interface
 */
interface PlayerState {
  // Current player data
  player: Player | null;
  
  // Local card state (for offline support)
  localPunchedNumbers: number[];
  
  // Player actions
  setPlayer: (player: Player | null) => void;
  updatePlayerCard: (card: BingoCard) => void;
  punchNumber: (number: number) => void;
  unpunchNumber: (number: number) => void;
  setPunchedNumbers: (numbers: number[]) => void;
  setBingoStatus: (hasBingo: boolean, bingoAchievedAt?: Date) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  
  // Utility methods
  isNumberPunched: (number: number) => boolean;
  hasBingo: () => boolean;
  getBingoLines: () => { type: 'row' | 'column' | 'diagonal'; index?: number }[];
  getCardNumber: (row: number, col: number) => number | null;
  isPunchedPosition: (row: number, col: number) => boolean;
  
  // Sync methods
  syncWithServer: () => void;
  mergePunchedNumbers: (serverNumbers: number[]) => void;
  
  // Reset state
  reset: () => void;
}

/**
 * Initial state
 */
const initialState = {
  player: null,
  localPunchedNumbers: [],
};

/**
 * Check if a bingo card has bingo (row, column, or diagonal)
 */
const checkBingo = (card: BingoCard, punchedNumbers: number[]): boolean => {
  const grid = card.grid;
  const size = 5;
  
  // Check rows
  for (let row = 0; row < size; row++) {
    let hasRow = true;
    for (let col = 0; col < size; col++) {
      const number = grid[row][col];
      // Skip free space if it exists
      if (card.freeSpace && card.freeSpace.row === row && card.freeSpace.col === col) {
        continue;
      }
      if (!punchedNumbers.includes(number)) {
        hasRow = false;
        break;
      }
    }
    if (hasRow) return true;
  }
  
  // Check columns
  for (let col = 0; col < size; col++) {
    let hasColumn = true;
    for (let row = 0; row < size; row++) {
      const number = grid[row][col];
      // Skip free space if it exists
      if (card.freeSpace && card.freeSpace.row === row && card.freeSpace.col === col) {
        continue;
      }
      if (!punchedNumbers.includes(number)) {
        hasColumn = false;
        break;
      }
    }
    if (hasColumn) return true;
  }
  
  // Check diagonal (top-left to bottom-right)
  let hasDiagonal1 = true;
  for (let i = 0; i < size; i++) {
    const number = grid[i][i];
    // Skip free space if it exists
    if (card.freeSpace && card.freeSpace.row === i && card.freeSpace.col === i) {
      continue;
    }
    if (!punchedNumbers.includes(number)) {
      hasDiagonal1 = false;
      break;
    }
  }
  if (hasDiagonal1) return true;
  
  // Check diagonal (top-right to bottom-left)
  let hasDiagonal2 = true;
  for (let i = 0; i < size; i++) {
    const number = grid[i][size - 1 - i];
    // Skip free space if it exists
    if (card.freeSpace && card.freeSpace.row === i && card.freeSpace.col === size - 1 - i) {
      continue;
    }
    if (!punchedNumbers.includes(number)) {
      hasDiagonal2 = false;
      break;
    }
  }
  
  return hasDiagonal2;
};

/**
 * Get all bingo lines (rows, columns, diagonals) that are complete
 */
const getBingoLines = (card: BingoCard, punchedNumbers: number[]): { type: 'row' | 'column' | 'diagonal'; index?: number }[] => {
  const lines: { type: 'row' | 'column' | 'diagonal'; index?: number }[] = [];
  const grid = card.grid;
  const size = 5;
  
  // Check rows
  for (let row = 0; row < size; row++) {
    let hasRow = true;
    for (let col = 0; col < size; col++) {
      const number = grid[row][col];
      // Skip free space if it exists
      if (card.freeSpace && card.freeSpace.row === row && card.freeSpace.col === col) {
        continue;
      }
      if (!punchedNumbers.includes(number)) {
        hasRow = false;
        break;
      }
    }
    if (hasRow) {
      lines.push({ type: 'row', index: row });
    }
  }
  
  // Check columns
  for (let col = 0; col < size; col++) {
    let hasColumn = true;
    for (let row = 0; row < size; row++) {
      const number = grid[row][col];
      // Skip free space if it exists
      if (card.freeSpace && card.freeSpace.row === row && card.freeSpace.col === col) {
        continue;
      }
      if (!punchedNumbers.includes(number)) {
        hasColumn = false;
        break;
      }
    }
    if (hasColumn) {
      lines.push({ type: 'column', index: col });
    }
  }
  
  // Check diagonal (top-left to bottom-right)
  let hasDiagonal1 = true;
  for (let i = 0; i < size; i++) {
    const number = grid[i][i];
    // Skip free space if it exists
    if (card.freeSpace && card.freeSpace.row === i && card.freeSpace.col === i) {
      continue;
    }
    if (!punchedNumbers.includes(number)) {
      hasDiagonal1 = false;
      break;
    }
  }
  if (hasDiagonal1) {
    lines.push({ type: 'diagonal', index: 0 });
  }
  
  // Check diagonal (top-right to bottom-left)
  let hasDiagonal2 = true;
  for (let i = 0; i < size; i++) {
    const number = grid[i][size - 1 - i];
    // Skip free space if it exists
    if (card.freeSpace && card.freeSpace.row === i && card.freeSpace.col === size - 1 - i) {
      continue;
    }
    if (!punchedNumbers.includes(number)) {
      hasDiagonal2 = false;
      break;
    }
  }
  if (hasDiagonal2) {
    lines.push({ type: 'diagonal', index: 1 });
  }
  
  return lines;
};

/**
 * Player store using Zustand with persistence and WebSocket synchronization
 */
export const usePlayerStore = create<PlayerState>()(
  persist(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // Player actions
      setPlayer: (player: Player | null) => {
        set({ 
          player,
          // Sync local punched numbers with player data
          localPunchedNumbers: player?.punchedNumbers || [],
        });
      },

      updatePlayerCard: (card: BingoCard) => {
        set((state) => ({
          player: state.player ? { ...state.player, card } : null,
        }));
      },

      punchNumber: (number: number) => {
        const { player, localPunchedNumbers } = get();
        if (!player || localPunchedNumbers.includes(number)) return;

        const newPunchedNumbers = [...localPunchedNumbers, number];
        const hasBingo = checkBingo(player.card, newPunchedNumbers);
        
        set({
          localPunchedNumbers: newPunchedNumbers,
          player: {
            ...player,
            punchedNumbers: newPunchedNumbers,
            hasBingo,
            bingoAchievedAt: hasBingo && !player.hasBingo ? new Date() : player.bingoAchievedAt,
          },
        });

        // Send to server or queue for offline
        const socketService = getSocketService();
        if (socketService.isConnected()) {
          socketService.punchNumber(number);
        } else {
          // Add to offline queue
          getOfflineService().addPendingAction('punch', number);
        }
      },

      unpunchNumber: (number: number) => {
        const { player, localPunchedNumbers } = get();
        if (!player || !localPunchedNumbers.includes(number)) return;

        const newPunchedNumbers = localPunchedNumbers.filter(n => n !== number);
        const hasBingo = checkBingo(player.card, newPunchedNumbers);
        
        set({
          localPunchedNumbers: newPunchedNumbers,
          player: {
            ...player,
            punchedNumbers: newPunchedNumbers,
            hasBingo,
            bingoAchievedAt: hasBingo ? player.bingoAchievedAt : undefined,
          },
        });

        // Send to server or queue for offline
        const socketService = getSocketService();
        if (socketService.isConnected()) {
          socketService.unpunchNumber(number);
        } else {
          // Add to offline queue
          getOfflineService().addPendingAction('unpunch', number);
        }
      },

      setPunchedNumbers: (numbers: number[]) => {
        const { player } = get();
        if (!player) return;

        const hasBingo = checkBingo(player.card, numbers);
        
        set({
          localPunchedNumbers: numbers,
          player: {
            ...player,
            punchedNumbers: numbers,
            hasBingo,
          },
        });
      },

      setBingoStatus: (hasBingo: boolean, bingoAchievedAt?: Date) => {
        set((state) => ({
          player: state.player 
            ? { ...state.player, hasBingo, bingoAchievedAt }
            : null,
        }));
      },

      setOnlineStatus: (isOnline: boolean) => {
        set((state) => ({
          player: state.player 
            ? { ...state.player, isOnline, lastSeenAt: new Date() }
            : null,
        }));
      },

      // Utility methods
      isNumberPunched: (number: number) => {
        const { localPunchedNumbers } = get();
        return localPunchedNumbers.includes(number);
      },

      hasBingo: () => {
        const { player, localPunchedNumbers } = get();
        if (!player) return false;
        return checkBingo(player.card, localPunchedNumbers);
      },

      getBingoLines: () => {
        const { player, localPunchedNumbers } = get();
        if (!player) return [];
        return getBingoLines(player.card, localPunchedNumbers);
      },

      getCardNumber: (row: number, col: number) => {
        const { player } = get();
        if (!player || row < 0 || row >= 5 || col < 0 || col >= 5) return null;
        return player.card.grid[row][col];
      },

      isPunchedPosition: (row: number, col: number) => {
        const { player, localPunchedNumbers } = get();
        if (!player) return false;
        const number = player.card.grid[row][col];
        return localPunchedNumbers.includes(number);
      },

      // Sync methods
      syncWithServer: () => {
        const socketService = getSocketService();
        if (socketService.isConnected()) {
          socketService.requestSync();
        }
      },

      mergePunchedNumbers: (serverNumbers: number[]) => {
        const { localPunchedNumbers } = get();
        
        // Merge local and server numbers, prioritizing local changes
        const mergedNumbers = Array.from(new Set([...serverNumbers, ...localPunchedNumbers]));
        
        set({ localPunchedNumbers: mergedNumbers });
      },

      // Reset state
      reset: () => {
        set(initialState);
      },
    })),
    {
      name: 'player-storage',
      partialize: (state) => ({
        player: state.player,
        localPunchedNumbers: state.localPunchedNumbers,
      }),
    }
  )
);

/**
 * Initialize WebSocket event listeners for player store
 */
export const initializePlayerStoreSync = () => {
  const socketService = getSocketService();
  const { setPlayer, setPunchedNumbers, setBingoStatus, setOnlineStatus } = usePlayerStore.getState();

  // Player events
  const unsubscribePlayerPunchedNumber = socketService.onPlayerPunchedNumber((message) => {
    // Only update if it's our player
    const { player } = usePlayerStore.getState();
    if (player && message.payload.playerId === player.id) {
      const currentNumbers = player.punchedNumbers;
      if (!currentNumbers.includes(message.payload.number)) {
        setPunchedNumbers([...currentNumbers, message.payload.number]);
      }
    }
  });

  const unsubscribePlayerBingo = socketService.onPlayerBingo((message) => {
    // Only update if it's our player
    const { player } = usePlayerStore.getState();
    if (player && message.payload.playerId === player.id) {
      setBingoStatus(true, message.payload.bingoAchievedAt);
    }
  });

  const unsubscribeSyncResponse = socketService.onSyncResponse((message) => {
    if (message.payload.player) {
      setPlayer(message.payload.player);
    }
  });

  const unsubscribeConnect = socketService.onConnect(() => {
    setOnlineStatus(true);
  });

  const unsubscribeDisconnect = socketService.onDisconnect(() => {
    setOnlineStatus(false);
  });

  const unsubscribeReconnect = socketService.onReconnect(() => {
    setOnlineStatus(true);
    // Request sync after reconnection
    const { syncWithServer } = usePlayerStore.getState();
    syncWithServer();
  });

  // Return cleanup function
  return () => {
    unsubscribePlayerPunchedNumber();
    unsubscribePlayerBingo();
    unsubscribeSyncResponse();
    unsubscribeConnect();
    unsubscribeDisconnect();
    unsubscribeReconnect();
  };
};

/**
 * Hook to get player data
 */
export const usePlayer = () => {
  return usePlayerStore((state) => ({
    player: state.player,
    hasBingo: state.hasBingo(),
    bingoLines: state.getBingoLines(),
  }));
};

/**
 * Hook to get player card interactions
 */
export const usePlayerCard = () => {
  return usePlayerStore((state) => ({
    isNumberPunched: state.isNumberPunched,
    getCardNumber: state.getCardNumber,
    isPunchedPosition: state.isPunchedPosition,
    punchNumber: state.punchNumber,
    unpunchNumber: state.unpunchNumber,
  }));
};

/**
 * Hook to get player actions
 */
export const usePlayerActions = () => {
  return usePlayerStore((state) => ({
    setPlayer: state.setPlayer,
    updatePlayerCard: state.updatePlayerCard,
    setPunchedNumbers: state.setPunchedNumbers,
    setBingoStatus: state.setBingoStatus,
    setOnlineStatus: state.setOnlineStatus,
    syncWithServer: state.syncWithServer,
    reset: state.reset,
  }));
};