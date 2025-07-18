import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConnectionStatus } from '../ConnectionStatus';
import { useSocket } from '@/lib/services/useSocket';
import { useOfflineSupport } from '@/lib/services/offline';

// Mock the hooks
jest.mock('@/lib/services/useSocket', () => ({
  useSocket: jest.fn(),
}));

jest.mock('@/lib/services/offline', () => ({
  useOfflineSupport: jest.fn(),
}));

describe('ConnectionStatus', () => {
  // Default mock implementations
  const mockConnect = jest.fn();
  const mockRequestFullSync = jest.fn();
  const mockClearPendingActions = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock values
    (useSocket as jest.Mock).mockReturnValue({
      isConnected: true,
      isConnecting: false,
      error: null,
      connect: mockConnect,
    });
    
    (useOfflineSupport as jest.Mock).mockReturnValue({
      isOnline: true,
      pendingActions: [],
      syncStatus: 'idle',
      syncError: null,
      lastSyncTime: null,
      requestFullSync: mockRequestFullSync,
      clearPendingActions: mockClearPendingActions,
    });
  });

  it('renders connected status when connected and online', () => {
    render(<ConnectionStatus />);
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
    const statusIndicator = screen.getByText('Connected').previousSibling;
    expect(statusIndicator).toHaveClass('bg-green-500');
  });

  it('renders connecting status when connecting', () => {
    (useSocket as jest.Mock).mockReturnValue({
      isConnected: false,
      isConnecting: true,
      error: null,
      connect: mockConnect,
    });
    
    render(<ConnectionStatus />);
    
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
    const statusIndicator = screen.getByText('Connecting...').previousSibling;
    expect(statusIndicator).toHaveClass('bg-yellow-500');
    expect(statusIndicator).toHaveClass('animate-pulse');
  });

  it('renders disconnected status when not connected and not connecting', () => {
    (useSocket as jest.Mock).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      error: null,
      connect: mockConnect,
    });
    
    render(<ConnectionStatus />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    const statusIndicator = screen.getByText('Disconnected').previousSibling;
    expect(statusIndicator).toHaveClass('bg-red-500');
  });

  it('renders offline status when device is offline', () => {
    (useOfflineSupport as jest.Mock).mockReturnValue({
      isOnline: false,
      pendingActions: [],
      syncStatus: 'idle',
      syncError: null,
      lastSyncTime: null,
      requestFullSync: mockRequestFullSync,
      clearPendingActions: mockClearPendingActions,
    });
    
    render(<ConnectionStatus />);
    
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('Device offline')).toBeInTheDocument();
    const statusIndicator = screen.getByText('Offline').previousSibling;
    expect(statusIndicator).toHaveClass('bg-orange-500');
  });

  it('shows reconnect button when disconnected but online', () => {
    (useSocket as jest.Mock).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      error: null,
      connect: mockConnect,
    });
    
    render(<ConnectionStatus />);
    
    const reconnectButton = screen.getByText('Reconnect');
    expect(reconnectButton).toBeInTheDocument();
    
    fireEvent.click(reconnectButton);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('shows pending actions count when there are pending actions', () => {
    (useOfflineSupport as jest.Mock).mockReturnValue({
      isOnline: true,
      pendingActions: [
        { type: 'punch', number: 42 },
        { type: 'unpunch', number: 17 },
      ],
      syncStatus: 'idle',
      syncError: null,
      lastSyncTime: null,
      requestFullSync: mockRequestFullSync,
      clearPendingActions: mockClearPendingActions,
    });
    
    render(<ConnectionStatus />);
    
    expect(screen.getByText('2 actions pending')).toBeInTheDocument();
  });

  it('shows clear button for pending actions when connected', () => {
    (useSocket as jest.Mock).mockReturnValue({
      isConnected: true,
      isConnecting: false,
      error: null,
      connect: mockConnect,
    });
    
    (useOfflineSupport as jest.Mock).mockReturnValue({
      isOnline: true,
      pendingActions: [{ type: 'punch', number: 42 }],
      syncStatus: 'idle',
      syncError: null,
      lastSyncTime: null,
      requestFullSync: mockRequestFullSync,
      clearPendingActions: mockClearPendingActions,
    });
    
    render(<ConnectionStatus />);
    
    const clearButton = screen.getByText('Clear');
    expect(clearButton).toBeInTheDocument();
    
    fireEvent.click(clearButton);
    expect(mockClearPendingActions).toHaveBeenCalledTimes(1);
  });

  it('shows syncing indicator when sync is in progress', () => {
    (useOfflineSupport as jest.Mock).mockReturnValue({
      isOnline: true,
      pendingActions: [],
      syncStatus: 'syncing',
      syncError: null,
      lastSyncTime: null,
      requestFullSync: mockRequestFullSync,
      clearPendingActions: mockClearPendingActions,
    });
    
    render(<ConnectionStatus />);
    
    expect(screen.getByText('Syncing...')).toBeInTheDocument();
  });

  it('shows connection error when there is an error', () => {
    (useSocket as jest.Mock).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      error: new Error('Connection refused'),
      connect: mockConnect,
    });
    
    render(<ConnectionStatus />);
    
    expect(screen.getByText('Connection error: Connection refused')).toBeInTheDocument();
  });

  it('shows sync error when there is a sync error', () => {
    (useOfflineSupport as jest.Mock).mockReturnValue({
      isOnline: true,
      pendingActions: [],
      syncStatus: 'error',
      syncError: 'Failed to synchronize data',
      lastSyncTime: null,
      requestFullSync: mockRequestFullSync,
      clearPendingActions: mockClearPendingActions,
    });
    
    render(<ConnectionStatus />);
    
    expect(screen.getByText('Sync error: Failed to synchronize data')).toBeInTheDocument();
  });

  it('shows detailed information when showDetails is true', () => {
    const mockDate = new Date();
    
    (useOfflineSupport as jest.Mock).mockReturnValue({
      isOnline: true,
      pendingActions: [{ type: 'punch', number: 42 }],
      syncStatus: 'idle',
      syncError: null,
      lastSyncTime: mockDate,
      requestFullSync: mockRequestFullSync,
      clearPendingActions: mockClearPendingActions,
    });
    
    render(<ConnectionStatus showDetails={true} />);
    
    expect(screen.getByText(`Last sync: ${mockDate.toLocaleTimeString()}`)).toBeInTheDocument();
    expect(screen.getByText('Pending: punch 42')).toBeInTheDocument();
  });

  it('attempts to sync pending actions on reconnect', async () => {
    (useSocket as jest.Mock).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      error: null,
      connect: mockConnect.mockResolvedValue(undefined),
    });
    
    (useOfflineSupport as jest.Mock).mockReturnValue({
      isOnline: true,
      pendingActions: [{ type: 'punch', number: 42 }],
      syncStatus: 'idle',
      syncError: null,
      lastSyncTime: null,
      requestFullSync: mockRequestFullSync.mockResolvedValue(undefined),
      clearPendingActions: mockClearPendingActions,
    });
    
    render(<ConnectionStatus />);
    
    const reconnectButton = screen.getByText('Reconnect');
    fireEvent.click(reconnectButton);
    
    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockRequestFullSync).toHaveBeenCalledTimes(1);
    });
  });

  it('handles reconnect errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    (useSocket as jest.Mock).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      error: null,
      connect: mockConnect.mockRejectedValue(new Error('Failed to connect')),
    });
    
    render(<ConnectionStatus />);
    
    const reconnectButton = screen.getByText('Reconnect');
    fireEvent.click(reconnectButton);
    
    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    consoleErrorSpy.mockRestore();
  });
});