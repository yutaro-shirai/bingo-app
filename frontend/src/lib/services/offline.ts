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
      this.syncError = 'Cannot sync: not connected to server';
      this.notifySubscribers();
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

      // Group similar actions to optimize sync
      const groupedActions = this.groupSimilarActions(actionsToProcess);
      
      // Process each group with delay between groups to avoid overwhelming the server
      for (const group of groupedActions) {
        try {
          await this.processSyncGroup(group);
          
          // Short delay between groups
          if (groupedActions.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.error('Error processing sync group:', error);
          // Continue with next group even if one fails
        }
      }

      this.lastSyncTime = new Date();
      this.savePendingActions();
      
      // If we still have pending actions, schedule another sync attempt
      if (this.pendingActions.length > 0) {
        setTimeout(() => this.syncPendingActions(), 5000);
      }
    } catch (error) {
      this.syncError = error instanceof Error ? error.message : 'Sync failed';
      console.error('Failed to sync pending actions:', error);
    }

    this.syncInProgress = false;
    this.notifySubscribers();
  }
  
  /**
   * Group similar actions to optimize sync
   * @private
   */
  private groupSimilarActions(actions: PendingAction[]): PendingAction[][] {
    const groups: PendingAction[][] = [];
    let currentGroup: PendingAction[] = [];
    let currentType: string | null = null;
    
    for (const action of actions) {
      // Start a new group if type changes or group gets too large
      if (currentType !== action.type || currentGroup.length >= 10) {
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
        }
        currentGroup = [action];
        currentType = action.type;
      } else {
        currentGroup.push(action);
      }
    }
    
    // Add the last group if not empty
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }
  
  /**
   * Process a group of similar actions
   * @private
   */
  private async processSyncGroup(actions: PendingAction[]): Promise<void> {
    const socketService = getSocketService();
    
    for (const action of actions) {
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
        const actionIndex = this.pendingActions.findIndex(a => a.id === action.id);
        if (actionIndex >= 0) {
          this.pendingActions[actionIndex].retryCount++;
          
          // Remove action if it has failed too many times
          if (this.pendingActions[actionIndex].retryCount >= 5) {
            this.pendingActions = this.pendingActions.filter(a => a.id !== action.id);
            console.warn(`Dropping action ${action.id} after ${this.pendingActions[actionIndex].retryCount} retries`);
          }
        }
      }
    }
    
    // Save after processing each group
    this.savePendingActions();
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
    
    // Try to reconnect and sync with progressive backoff
    const attemptReconnection = (attempt = 1, maxAttempts = 5) => {
      if (attempt > maxAttempts) {
        this.syncError = `Failed to reconnect after ${maxAttempts} attempts`;
        this.notifySubscribers();
        return;
      }
      
      const socketService = getSocketService();
      if (!socketService.isConnected()) {
        // Attempt to reconnect with exponential backoff
        const backoffTime = Math.min(1000 * Math.pow(1.5, attempt - 1), 10000);
        
        console.log(`Attempting reconnection ${attempt}/${maxAttempts} in ${backoffTime}ms`);
        
        setTimeout(() => {
          socketService.connect()
            .then(() => {
              console.log('Reconnected successfully');
              this.syncError = null;
              this.syncPendingActions();
            })
            .catch(error => {
              console.error(`Reconnection attempt ${attempt} failed:`, error);
              // Try again with increased backoff
              attemptReconnection(attempt + 1, maxAttempts);
            });
        }, backoffTime);
      } else {
        this.syncPendingActions();
      }
    };
    
    // Start reconnection attempts
    attemptReconnection();
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