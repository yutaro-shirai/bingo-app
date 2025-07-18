import React from 'react';
import { useOfflineSupport } from '@/lib/services/offline';
import { useSocket } from '@/lib/services/useSocket';

interface OfflineIndicatorProps {
  className?: string;
}

/**
 * Prominent offline indicator component
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className = '' }) => {
  const { isOnline, isConnected, pendingActions, syncStatus, requestFullSync } = useOfflineSupport();
  const { connect } = useSocket();

  // Don't show if everything is working normally
  if (isOnline && isConnected && pendingActions.length === 0) {
    return null;
  }

  const handleReconnect = async () => {
    try {
      if (!isConnected) {
        await connect();
      }
      if (pendingActions.length > 0) {
        await requestFullSync();
      }
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  };

  return (
    <div className={`bg-yellow-50 border-l-4 border-yellow-400 p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg 
            className="h-5 w-5 text-yellow-400" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            {!isOnline ? 'You\'re offline' : 'Connection issues'}
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            {!isOnline && (
              <p>Your device is offline. Changes will be saved and synced when you reconnect.</p>
            )}
            {isOnline && !isConnected && (
              <p>Unable to connect to the game server. Trying to reconnect...</p>
            )}
            {pendingActions.length > 0 && (
              <p className="mt-1">
                {pendingActions.length} action{pendingActions.length !== 1 ? 's' : ''} waiting to sync.
              </p>
            )}
          </div>
          {(isOnline && !isConnected) || pendingActions.length > 0 ? (
            <div className="mt-3">
              <button
                onClick={handleReconnect}
                disabled={syncStatus === 'syncing'}
                className="bg-yellow-100 px-3 py-1 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-yellow-800 inline" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                  </>
                ) : (
                  'Reconnect & Sync'
                )}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default OfflineIndicator;