import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { usePlayerStore } from '../stores/playerStore';
import { getSocketService } from './socket';

/**
 * Offline state interface
 */
export interface OfflineState {
  isOnline: boolean;
  isConnected: boolean;
  lastSyncTime: Date | null;
  pendingActions: PendingAction[];
  syncStatus: 'idle' | 'syncing' | 'error';
  syncError: string | null;
}

/**
 * Pending action interface for offline queue
 */
export interface PendingAction {
  id: string;
  type: 'punch' | 'unpunch';
  number: number;
  timestamp: Date;
  retryCount: number;
}

/**
 * Offline support service
 */
class OfflineService {
  private pendingActions: PendingAction[] = [];
  private syncInProgress = false;
  private syncCallbacks: Set<(state: OfflineState) => void> = new Set();
  private lastSyncTime: Date | null = null;
  private syncError: string | null = null;

  constructor() {
    // Load pending actions from localStorage
    this.loadPendingActions();
    
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
  }

  /**
   * Get current offline state
   */
  getState(): OfflineState {
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isConnected: getSocketService().isConnected(),
      lastSyncTime: this.lastSyncTime,
      pendingActions: [...this.pendingActions],
      syncStatus: this.syncInProgress ? 'syncing' : this.syncError ? 'error' : 'idle',
      syncError: this.syncError,
    };
  }

  /**
   * Subscribe to offline state changes
   */
  subscribe(callback: (state: OfflineState) => void): () => void {
    this.syncCallbacks.add(callback);
    return () => {
      this.syncCallbacks.delete(callback);
    };
  }

  /**
   * Add a pending action to the queue
   */
  addPendingAction(type: 'punch' | 'unpunch', number: number): void {
    const action: PendingAction = {
      id: `${type}-${number}-${Date.now()}`,
      type,
      number,
      timestamp: new Date(),
      retryCount: 0,
    };

    this.pendingActions.push(action);
    this.savePendingActions();
    this.notifySubscribers();

    // Try to sync immediately if connected
    if (getSocketService().isConnected()) {
      this.syncPendingActions();
    }
  }

  /**
   * Sync pending actions with the server
   */
  async syncPendingActions(): Promise<void> {
    if (this.syncInProgress || this.pendingActions.length === 0) {
      return;
    }

    const socketService = getSocketService();
    if (!socketService.isConnected()) {
      return;
    }

    this.syncInProgress = true;
    this.syncError = null;
    this.notifySubscribers();

    try {
      // Process actions in chronological order
      const actionsToProcess = [...this.pendingActions].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );

      for (const action of actionsToProcess) {
        try {
          if (action.type === 'punch') {
            socketService.punchNumber(action.number);
          } else {
            socketService.unpunchNumber(action.number);
          }

          // Remove successful action
          this.pendingActions = this.pendingActions.filter(a => a.id !== action.id);
        } catch (error) {
          // Increment retry count
          action.retryCount++;
          
          // Remove action if it has failed too many times
          if (action.retryCount >= 3) {
            this.pendingActions = this.pendingActions.filter(a => a.id !== action.id);
            console.warn(`Dropping action ${action.id} after ${action.retryCount} retries`);
          }
        }
      }

      this.lastSyncTime = new Date();
      this.savePendingActions();
    } catch (error) {
      this.syncError = error instanceof Error ? error.message : 'Sync failed';
      console.error('Failed to sync pending actions:', error);
    }

    this.syncInProgress = false;
    this.notifySubscribers();
  }

  /**
   * Request full state synchronization
   */
  async requestFullSync(): Promise<void> {
    const socketService = getSocketService();
    if (!socketService.isConnected()) {
      throw new Error('Cannot sync: not connected to server');
    }

    this.syncInProgress = true;
    this.syncError = null;
    this.notifySubscribers();

    try {
      // Request sync from server
      socketService.requestSync();
      
      // Also sync pending actions
      await this.syncPendingActions();
      
      this.lastSyncTime = new Date();
    } catch (error) {
      this.syncError = error instanceof Error ? error.message : 'Full sync failed';
      throw error;
    } finally {
      this.syncInProgress = false;
      this.notifySubscribers();
    }
  }

  /**
   * Clear all pending actions
   */
  clearPendingActions(): void {
    this.pendingActions = [];
    this.savePendingActions();
    this.notifySubscribers();
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('Device came online');
    this.notifySubscribers();
    
    // Try to reconnect and sync
    setTimeout(() => {
      const socketService = getSocketService();
      if (!socketService.isConnected()) {
        // Attempt to reconnect
        socketService.connect().then(() => {
          this.syncPendingActions();
        }).catch(error => {
          console.error('Failed to reconnect after coming online:', error);
        });
      } else {
        this.syncPendingActions();
      }
    }, 1000);
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('Device went offline');
    this.notifySubscribers();
  }

  /**
   * Load pending actions from localStorage
   */
  private loadPendingActions(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('bingo-pending-actions');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.pendingActions = parsed.map((action: any) => ({
          ...action,
          timestamp: new Date(action.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load pending actions:', error);
      this.pendingActions = [];
    }
  }

  /**
   * Save pending actions to localStorage
   */
  private savePendingActions(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('bingo-pending-actions', JSON.stringify(this.pendingActions));
    } catch (error) {
      console.error('Failed to save pending actions:', error);
    }
  }

  /**
   * Notify all subscribers of state changes
   */
  private notifySubscribers(): void {
    const state = this.getState();
    this.syncCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in offline state callback:', error);
      }
    });
  }
}

// Create singleton instance
let offlineService: OfflineService | null = null;

/**
 * Get the offline service instance
 */
export const getOfflineService = (): OfflineService => {
  if (!offlineService) {
    offlineService = new OfflineService();
  }
  return offlineService;
};

/**
 * Reset the offline service instance (for testing)
 */
export const resetOfflineService = (): void => {
  offlineService = null;
};

/**
 * React hook for using offline support
 */
export const useOfflineSupport = () => {
  const [offlineState, setOfflineState] = useState<OfflineState>(() => 
    getOfflineService().getState()
  );

  useEffect(() => {
    const offlineService = getOfflineService();
    const unsubscribe = offlineService.subscribe(setOfflineState);

    // Initial state
    setOfflineState(offlineService.getState());

    return unsubscribe;
  }, []);

  const addPendingAction = useCallback((type: 'punch' | 'unpunch', number: number) => {
    getOfflineService().addPendingAction(type, number);
  }, []);

  const syncPendingActions = useCallback(async () => {
    await getOfflineService().syncPendingActions();
  }, []);

  const requestFullSync = useCallback(async () => {
    await getOfflineService().requestFullSync();
  }, []);

  const clearPendingActions = useCallback(() => {
    getOfflineService().clearPendingActions();
  }, []);

  return {
    ...offlineState,
    addPendingAction,
    syncPendingActions,
    requestFullSync,
    clearPendingActions,
  };
};