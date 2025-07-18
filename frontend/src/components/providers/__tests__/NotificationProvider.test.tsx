import { render, screen, waitFor } from '@testing-library/react';
import { NotificationProvider } from '../NotificationProvider';

// Mock the hooks and components
jest.mock('@/lib/services/notifications', () => ({
  useNotifications: jest.fn(),
}));

jest.mock('@/lib/services/useSocket', () => ({
  useSocket: jest.fn(),
}));

jest.mock('@/lib/services/offline', () => ({
  useOfflineSupport: jest.fn(),
}));

jest.mock('@/lib/stores/gameStore', () => ({
  useGameStore: jest.fn(),
}));

jest.mock('@/lib/stores/playerStore', () => ({
  usePlayerStore: jest.fn(),
}));

jest.mock('@/components/ui/Toast', () => ({
  ToastContainer: jest.fn(({ children }) => (
    <div data-testid="toast-container">{children}</div>
  )),
}));

const mockUseNotifications = require('@/lib/services/notifications').useNotifications;
const mockUseSocket = require('@/lib/services/useSocket').useSocket;
const mockUseOfflineSupport = require('@/lib/services/offline').useOfflineSupport;
const mockUseGameStore = require('@/lib/stores/gameStore').useGameStore;
const mockUsePlayerStore = require('@/lib/stores/playerStore').usePlayerStore;

describe('NotificationProvider', () => {
  const mockNotifications = {
    notifications: [],
    removeNotification: jest.fn(),
    showSuccess: jest.fn(),
    showInfo: jest.fn(),
    showWarning: jest.fn(),
    showError: jest.fn(),
    showBingo: jest.fn(),
    showGameEvent: jest.fn(),
    showConnectionStatus: jest.fn(),
  };

  const mockSocket = {
    onPlayerJoined: jest.fn(() => jest.fn()),
    onPlayerBingo: jest.fn(() => jest.fn()),
    onError: jest.fn(() => jest.fn()),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotifications.mockReturnValue(mockNotifications);
    mockUseSocket.mockReturnValue({ isConnected: true, socket: mockSocket });
    mockUseOfflineSupport.mockReturnValue({ isOnline: true, pendingActions: [] });
    mockUseGameStore.mockImplementation(cb => cb({ game: null }));
    mockUsePlayerStore.mockImplementation(cb => cb({ player: null }));
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders children and ToastContainer', () => {
    render(
      <NotificationProvider>
        <div data-testid="test-child">Test Child</div>
      </NotificationProvider>
    );
    
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByTestId('toast-container')).toBeInTheDocument();
  });

  it('shows offline warning when device is offline', () => {
    mockUseOfflineSupport.mockReturnValue({ isOnline: false, pendingActions: [] });
    
    render(<NotificationProvider>Content</NotificationProvider>);
    
    expect(mockNotifications.showWarning).toHaveBeenCalledWith(
      'You\'re offline',
      'Changes will be saved and synced when you reconnect.',
      { persistent: true }
    );
  });

  it('shows connection lost warning when socket is disconnected', () => {
    mockUseSocket.mockReturnValue({ isConnected: false, socket: mockSocket });
    
    render(<NotificationProvider>Content</NotificationProvider>);
    
    jest.advanceTimersByTime(2000);
    
    expect(mockNotifications.showWarning).toHaveBeenCalledWith(
      'Connection lost',
      'Trying to reconnect...',
      { persistent: true }
    );
  });

  it('shows connected success when socket is connected', () => {
    render(<NotificationProvider>Content</NotificationProvider>);
    
    expect(mockNotifications.showSuccess).toHaveBeenCalledWith(
      'Connected',
      'Successfully connected to game server'
    );
  });

  it('shows syncing notification when there are pending actions', () => {
    mockUseOfflineSupport.mockReturnValue({ isOnline: true, pendingActions: [{ type: 'punch', number: 5 }] });
    
    render(<NotificationProvider>Content</NotificationProvider>);
    
    expect(mockNotifications.showInfo).toHaveBeenCalledWith(
      'Syncing changes',
      '1 action being synced...'
    );
  });

  it('shows game event notification when a new number is drawn', () => {
    mockUseGameStore.mockImplementation(cb => cb({
      game: {
        drawnNumbers: [5, 10, 15],
        status: 'active',
      },
    }));
    
    render(<NotificationProvider>Content</NotificationProvider>);
    
    expect(mockNotifications.showGameEvent).toHaveBeenCalledWith(
      'Number 15 called!',
      '3 numbers called so far'
    );
  });

  it('shows game started notification when game becomes active', () => {
    mockUseGameStore.mockImplementation(cb => cb({
      game: {
        drawnNumbers: [],
        status: 'active',
      },
    }));
    
    render(<NotificationProvider>Content</NotificationProvider>);
    
    expect(mockNotifications.showGameEvent).toHaveBeenCalledWith(
      'Game started!',
      'Good luck everyone!'
    );
  });

  it('shows game paused notification when game is paused', () => {
    mockUseGameStore.mockImplementation(cb => cb({
      game: {
        drawnNumbers: [],
        status: 'paused',
      },
    }));
    
    render(<NotificationProvider>Content</NotificationProvider>);
    
    expect(mockNotifications.showInfo).toHaveBeenCalledWith(
      'Game paused',
      'The game has been paused by the administrator'
    );
  });

  it('shows game ended notification when game ends', () => {
    mockUseGameStore.mockImplementation(cb => cb({
      game: {
        drawnNumbers: [],
        status: 'ended',
      },
    }));
    
    render(<NotificationProvider>Content</NotificationProvider>);
    
    expect(mockNotifications.showInfo).toHaveBeenCalledWith(
      'Game ended',
      'Thanks for playing!'
    );
  });

  it('shows bingo notification when player gets bingo', () => {
    mockUsePlayerStore.mockImplementation(cb => cb({
      player: {
        hasBingo: true,
        bingoAchievedAt: new Date(),
      },
    }));
    
    render(<NotificationProvider>Content</NotificationProvider>);
    
    expect(mockNotifications.showBingo).toHaveBeenCalled();
  });

  it('sets up socket event listeners', () => {
    render(<NotificationProvider>Content</NotificationProvider>);
    
    expect(mockSocket.onPlayerJoined).toHaveBeenCalled();
    expect(mockSocket.onPlayerBingo).toHaveBeenCalled();
    expect(mockSocket.onError).toHaveBeenCalled();
  });

  it('shows player joined notification', () => {
    let playerJoinedCallback: (message: any) => void;
    mockSocket.onPlayerJoined.mockImplementation(cb => {
      playerJoinedCallback = cb;
      return jest.fn();
    });
    
    mockUsePlayerStore.mockImplementation(cb => cb({
      player: {
        name: 'Current Player',
      },
    }));
    
    render(<NotificationProvider>Content</NotificationProvider>);
    
    // Simulate player joined event
    playerJoinedCallback({
      payload: {
        playerName: 'New Player',
      },
    });
    
    expect(mockNotifications.showInfo).toHaveBeenCalledWith(
      'Player joined',
      'New Player joined the game'
    );
  });

  it('shows other player bingo notification', () => {
    let playerBingoCallback: (message: any) => void;
    mockSocket.onPlayerBingo.mockImplementation(cb => {
      playerBingoCallback = cb;
      return jest.fn();
    });
    
    mockUsePlayerStore.mockImplementation(cb => cb({
      player: {
        id: 'current-player-id',
      },
    }));
    
    render(<NotificationProvider>Content</NotificationProvider>);
    
    // Simulate player bingo event
    playerBingoCallback({
      payload: {
        playerId: 'other-player-id',
        playerName: 'Other Player',
      },
    });
    
    expect(mockNotifications.showBingo).toHaveBeenCalledWith('Other Player');
  });

  it('shows error notification on socket error', () => {
    let errorCallback: (error: any) => void;
    mockSocket.onError.mockImplementation(cb => {
      errorCallback = cb;
      return jest.fn();
    });
    
    render(<NotificationProvider>Content</NotificationProvider>);
    
    // Simulate error event
    errorCallback({
      message: 'Test error message',
    });
    
    expect(mockNotifications.showError).toHaveBeenCalledWith(
      'Game error',
      'Test error message',
      expect.objectContaining({
        actions: expect.arrayContaining([
          expect.objectContaining({
            label: 'Retry',
          }),
        ]),
      })
    );
  });

  it('passes position prop to ToastContainer', () => {
    const { container } = render(
      <NotificationProvider position="bottom-center">Content</NotificationProvider>
    );
    
    expect(require('@/components/ui/Toast').ToastContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        position: 'bottom-center',
      }),
      expect.anything()
    );
  });
});