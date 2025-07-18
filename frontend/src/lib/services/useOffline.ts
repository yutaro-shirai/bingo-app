import { useEffect } from 'react';
import { useOfflineSupport } from './offline';
import { useSocket } from './useSocket';
import { initializeGameStoreSync } from '../stores/gameStore';
import { initializePlayerStoreSync } from '../stores/playerStore';

/**
 * Hook to initialize offline support and store synchronization
 */
export const useOfflineInit = () => {
  const { syncPendingActions } = useOfflineSupport();
  const { isConnected } = useSocket();

  useEffect(() => {
    // Initialize store synchronization
    const cleanupGameSync = initializeGameStoreSync();
    const cleanupPlayerSync = initializePlayerStoreSync();

    return () => {
      cleanupGameSync();
      cleanupPlayerSync();
    };
  }, []);

  useEffect(() => {
    // Sync pending actions when connection is restored
    if (isConnected) {
      syncPendingActions();
    }
  }, [isConnected, syncPendingActions]);

  return {
    // Return offline support hook for components that need it
    useOfflineSupport,
  };
};