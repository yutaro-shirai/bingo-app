import { useEffect, useRef } from 'react';
import { initializeGameStoreSync } from './gameStore';
import { initializePlayerStoreSync } from './playerStore';

/**
 * Store cleanup functions type
 */
type CleanupFunction = () => void;

/**
 * Hook to initialize all stores and their WebSocket synchronization
 * This should be called once at the app level
 */
export const useStoreInitialization = () => {
  const cleanupRef = useRef<CleanupFunction[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current) return;
    
    console.log('Initializing store synchronization...');
    
    // Initialize game store sync
    const gameStoreCleanup = initializeGameStoreSync();
    cleanupRef.current.push(gameStoreCleanup);
    
    // Initialize player store sync
    const playerStoreCleanup = initializePlayerStoreSync();
    cleanupRef.current.push(playerStoreCleanup);
    
    initializedRef.current = true;
    
    // Cleanup function
    return () => {
      console.log('Cleaning up store synchronization...');
      cleanupRef.current.forEach(cleanup => cleanup());
      cleanupRef.current = [];
      initializedRef.current = false;
    };
  }, []);
};

// Re-export store hooks for convenience
export {
  useGameStore,
  useGame,
  useGameConnection,
  useGameActions,
} from './gameStore';

export {
  usePlayerStore,
  usePlayer,
  usePlayerCard,
  usePlayerActions,
} from './playerStore';

// Re-export types
export type { Game, GameStatus, DrawMode } from 'shared/types';
export type { Player, BingoCard } from 'shared/types';