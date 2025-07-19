import React from 'react';
import { useSocket } from '@/lib/services/useSocket';
import { useOfflineSupport } from '@/lib/services/offline';

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
}

/**
 * Component to display the WebSocket connection status and offline support
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const { isConnected, isConnecting, error, connect } = useSocket(true);
  const { 
    isOnline, 
    pendingActions, 
    syncStatus, 
    syncError, 
    lastSyncTime,
    requestFullSync,
    clearPendingActions 
  } = useOfflineSupport();

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        color: 'bg-orange-500',
        text: 'Offline',
        icon: (
          <svg className="w-3 h-3 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      };
    }
    
    if (isConnected) {
      return {
        color: 'bg-green-500',
        text: 'Connected',
        icon: (
          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      };
    }
    
    if (isConnecting) {
      return {
        color: 'bg-yellow-500 animate-pulse',
        text: 'Connecting...',
        icon: (
          <svg className="w-3 h-3 text-yellow-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )
      };
    }
    
    return {
      color: 'bg-red-500',
      text: 'Disconnected',
      icon: (
        <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )
    };
  };

  const handleReconnect = async () => {
    try {
      await connect();
      if (pendingActions.length > 0) {
        await requestFullSync();
      }
    } catch (err) {
      console.error('Failed to reconnect:', err);
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`flex flex-col gap-2 text-sm ${className}`}>
      {/* Main status indicator */}
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full ${statusInfo.color} mr-1.5`} />
          <span className="font-medium">{statusInfo.text}</span>
        </div>
        
        {!isConnected && !isConnecting && isOnline && (
          <button 
            onClick={handleReconnect}
            className="text-blue-500 hover:underline text-xs flex items-center"
          >
            <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Reconnect
          </button>
        )}
      </div>

      {/* Offline indicators */}
      {!isOnline && (
        <div className="flex items-center gap-1 text-orange-600">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-xs">Device offline</span>
        </div>
      )}

      {/* Pending actions indicator */}
      {pendingActions.length > 0 && (
        <div className="flex items-center gap-1 text-blue-600">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          <span className="text-xs">
            {pendingActions.length} action{pendingActions.length !== 1 ? 's' : ''} pending
          </span>
          {isConnected && (
            <button
              onClick={clearPendingActions}
              className="text-red-500 hover:underline text-xs ml-1"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Sync status */}
      {syncStatus === 'syncing' && (
        <div className="flex items-center gap-1 text-blue-600">
          <svg className="w-3 h-3 animate-spin" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          <span className="text-xs">Syncing...</span>
        </div>
      )}

      {/* Error indicators */}
      {error && (
        <div className="text-red-500 text-xs">
          Connection error: {error.message}
        </div>
      )}

      {syncError && (
        <div className="text-red-500 text-xs">
          Sync error: {syncError}
        </div>
      )}

      {/* Detailed information */}
      {showDetails && (
        <div className="text-xs text-gray-500 space-y-1">
          {lastSyncTime && (
            <div>Last sync: {lastSyncTime.toLocaleTimeString()}</div>
          )}
          {pendingActions.length > 0 && (
            <div>
              Pending: {pendingActions.map(a => `${a.type} ${a.number}`).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;