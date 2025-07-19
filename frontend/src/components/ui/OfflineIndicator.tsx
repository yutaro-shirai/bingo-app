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
  const { 
    isOnline, 
    isConnected, 
    pendingActions, 
    syncStatus, 
    syncError,
    requestFullSync,
    clearPendingActions 
  } = useOfflineSupport();
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

  // Determine the appropriate status color and icon
  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-400',
        textColor: 'text-red-800',
        icon: (
          <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ),
        title: 'You\'re offline'
      };
    }
    
    if (!isConnected) {
      return {
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-400',
        textColor: 'text-yellow-800',
        icon: (
          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ),
        title: 'Connection issues'
      };
    }
    
    if (pendingActions.length > 0) {
      return {
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-400',
        textColor: 'text-blue-800',
        icon: (
          <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        ),
        title: 'Syncing required'
      };
    }
    
    // Default (shouldn't reach here based on component logic)
    return {
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-400',
      textColor: 'text-gray-800',
      icon: null,
      title: 'Status'
    };
  };
  
  const statusInfo = getStatusInfo();

  return (
    <div className={`${statusInfo.bgColor} border-l-4 ${statusInfo.borderColor} p-4 rounded-r shadow-sm ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {statusInfo.icon}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${statusInfo.textColor}`}>
            {statusInfo.title}
          </h3>
          <div className="mt-2 text-sm text-gray-600">
            {!isOnline && (
              <div className="space-y-1">
                <p>Your device is offline. Changes will be saved locally.</p>
                <p className="font-medium">Don&apos;t close this page until you reconnect!</p>
              </div>
            )}
            
            {isOnline && !isConnected && (
              <div className="space-y-1">
                <p>Unable to connect to the game server. Trying to reconnect automatically...</p>
                {syncStatus === 'error' && (
                  <p className="text-red-600">Error: {syncError}</p>
                )}
              </div>
            )}
            
            {pendingActions.length > 0 && (
              <div className="mt-1 space-y-1">
                <p>
                  <span className="font-medium">{pendingActions.length}</span> action{pendingActions.length !== 1 ? 's' : ''} waiting to sync.
                </p>
                <p className="text-xs text-gray-500">
                  Your card changes will be synchronized when connection is restored.
                </p>
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          {(isOnline && !isConnected) || pendingActions.length > 0 ? (
            <div className="mt-3 flex space-x-2">
              <button
                onClick={handleReconnect}
                disabled={syncStatus === 'syncing'}
                className={`${!isConnected ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800' : 'bg-blue-100 hover:bg-blue-200 text-blue-800'} 
                  px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="mr-1.5 h-4 w-4 inline" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    {!isConnected ? 'Reconnect Now' : 'Sync Changes'}
                  </>
                )}
              </button>
              
              {pendingActions.length > 0 && isConnected && (
                <button
                  onClick={() => window.confirm('Are you sure you want to discard all pending changes?') && clearPendingActions()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                >
                  Discard Changes
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default OfflineIndicator;