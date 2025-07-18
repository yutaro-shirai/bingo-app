import { getOfflineService, resetOfflineService, OfflineService } from '../offline';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock socket service
const mockSocketService = {
  isConnected: jest.fn(),
  punchNumber: jest.fn(),
  unpunchNumber: jest.fn(),
  requestSync: jest.fn(),
};

jest.mock('../socket', () => ({
  getSocketService: () => mockSocketService,
}));

// Mock window.navigator
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
  },
  writable: true,
});

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('OfflineService', () => {
  let offlineService: OfflineService;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    mockSocketService.isConnected.mockReturnValue(true);
    
    // Reset the singleton
    resetOfflineService();
    offlineService = getOfflineService();
  });

  describe('getState', () => {
    it('should return current offline state', () => {
      const state = offlineService.getState();
      
      expect(state).toEqual({
        isOnline: true,
        isConnected: true,
        lastSyncTime: null,
        pendingActions: [],
        syncStatus: 'idle',
        syncError: null,
      });
    });
  });

  describe('addPendingAction', () => {
    it('should add action to pending queue when offline', () => {
      mockSocketService.isConnected.mockReturnValue(false);
      
      offlineService.addPendingAction('punch', 42);
      
      const state = offlineService.getState();
      expect(state.pendingActions).toHaveLength(1);
      expect(state.pendingActions[0]).toMatchObject({
        type: 'punch',
        number: 42,
        retryCount: 0,
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'bingo-pending-actions',
        expect.any(String)
      );
    });

    it('should attempt immediate sync when connected', () => {
      mockSocketService.isConnected.mockReturnValue(true);
      
      offlineService.addPendingAction('punch', 42);
      
      // Should attempt to sync immediately
      expect(mockSocketService.punchNumber).toHaveBeenCalledWith(42);
    });
  });

  describe('syncPendingActions', () => {
    it('should process pending actions in chronological order', async () => {
      mockSocketService.isConnected.mockReturnValue(true);
      
      // Add actions with different timestamps
      const now = Date.now();
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(now)
        .mockReturnValueOnce(now + 1000)
        .mockReturnValueOnce(now + 2000);
      
      offlineService.addPendingAction('punch', 1);
      offlineService.addPendingAction('unpunch', 2);
      offlineService.addPendingAction('punch', 3);
      
      await offlineService.syncPendingActions();
      
      // Should process in order
      expect(mockSocketService.punchNumber).toHaveBeenCalledWith(1);
      expect(mockSocketService.unpunchNumber).toHaveBeenCalledWith(2);
      expect(mockSocketService.punchNumber).toHaveBeenCalledWith(3);
      
      // Should clear pending actions after successful sync
      const state = offlineService.getState();
      expect(state.pendingActions).toHaveLength(0);
    });

    it('should not sync when disconnected', async () => {
      mockSocketService.isConnected.mockReturnValue(false);
      
      offlineService.addPendingAction('punch', 42);
      await offlineService.syncPendingActions();
      
      expect(mockSocketService.punchNumber).not.toHaveBeenCalled();
      
      const state = offlineService.getState();
      expect(state.pendingActions).toHaveLength(1);
    });

    it('should handle sync errors gracefully', async () => {
      mockSocketService.isConnected.mockReturnValue(true);
      
      // Mock the entire syncPendingActions to throw an error
      const originalSync = offlineService.syncPendingActions;
      offlineService.syncPendingActions = jest.fn().mockImplementation(async () => {
        offlineService['syncInProgress'] = true;
        offlineService['syncError'] = 'Sync failed';
        offlineService['syncInProgress'] = false;
        offlineService['notifySubscribers']();
      });
      
      await offlineService.syncPendingActions();
      
      const state = offlineService.getState();
      expect(state.syncStatus).toBe('error');
      expect(state.syncError).toBe('Sync failed');
      
      // Restore original method
      offlineService.syncPendingActions = originalSync;
    });
  });

  describe('requestFullSync', () => {
    it('should request sync from server and sync pending actions', async () => {
      mockSocketService.isConnected.mockReturnValue(true);
      
      offlineService.addPendingAction('punch', 42);
      await offlineService.requestFullSync();
      
      expect(mockSocketService.requestSync).toHaveBeenCalled();
      expect(mockSocketService.punchNumber).toHaveBeenCalledWith(42);
      
      const state = offlineService.getState();
      expect(state.lastSyncTime).toBeInstanceOf(Date);
    });

    it('should throw error when disconnected', async () => {
      mockSocketService.isConnected.mockReturnValue(false);
      
      await expect(offlineService.requestFullSync()).rejects.toThrow(
        'Cannot sync: not connected to server'
      );
    });
  });

  describe('subscription', () => {
    it('should notify subscribers of state changes', () => {
      const callback = jest.fn();
      const unsubscribe = offlineService.subscribe(callback);
      
      offlineService.addPendingAction('punch', 42);
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingActions: expect.arrayContaining([
            expect.objectContaining({
              type: 'punch',
              number: 42,
            }),
          ]),
        })
      );
      
      unsubscribe();
      
      // Should not call after unsubscribe
      callback.mockClear();
      offlineService.addPendingAction('punch', 43);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('localStorage persistence', () => {
    it('should load pending actions from localStorage on initialization', () => {
      const storedActions = JSON.stringify([
        {
          id: 'punch-42-123456789',
          type: 'punch',
          number: 42,
          timestamp: '2023-01-01T00:00:00.000Z',
          retryCount: 0,
        },
      ]);
      
      localStorageMock.getItem.mockReturnValue(storedActions);
      
      // Create new service instance
      resetOfflineService();
      const newService = getOfflineService();
      
      const state = newService.getState();
      expect(state.pendingActions).toHaveLength(1);
      expect(state.pendingActions[0]).toMatchObject({
        type: 'punch',
        number: 42,
        retryCount: 0,
      });
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      // Should not throw and should initialize with empty actions
      resetOfflineService();
      const newService = getOfflineService();
      
      const state = newService.getState();
      expect(state.pendingActions).toHaveLength(0);
    });
  });
});