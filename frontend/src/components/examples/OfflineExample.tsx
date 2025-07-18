import React from 'react';
import { useOfflineSupport } from '@/lib/services/offline';
import { usePlayerCard } from '@/lib/stores/playerStore';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';

/**
 * Example component demonstrating offline support functionality
 */
export const OfflineExample: React.FC = () => {
  const { 
    isOnline, 
    isConnected, 
    pendingActions, 
    syncStatus, 
    requestFullSync,
    clearPendingActions 
  } = useOfflineSupport();
  
  const { punchNumber, unpunchNumber, isNumberPunched } = usePlayerCard();

  const handlePunchNumber = (number: number) => {
    if (isNumberPunched(number)) {
      unpunchNumber(number);
    } else {
      punchNumber(number);
    }
  };

  const handleSync = async () => {
    try {
      await requestFullSync();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Offline Support Demo</h2>
      
      {/* Connection Status */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">Connection Status</h3>
        <ConnectionStatus showDetails={true} />
      </div>

      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Offline State Info */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">Offline State</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Device Online:</span>
            <span className={`ml-2 ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="font-medium">Server Connected:</span>
            <span className={`ml-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="font-medium">Pending Actions:</span>
            <span className="ml-2 text-blue-600">{pendingActions.length}</span>
          </div>
          <div>
            <span className="font-medium">Sync Status:</span>
            <span className={`ml-2 capitalize ${
              syncStatus === 'syncing' ? 'text-blue-600' : 
              syncStatus === 'error' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {syncStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-semibold mb-3 text-yellow-800">Pending Actions</h3>
          <div className="space-y-2">
            {pendingActions.map((action) => (
              <div key={action.id} className="flex justify-between items-center text-sm">
                <span>
                  {action.type} number {action.number}
                </span>
                <span className="text-gray-500">
                  {action.timestamp.toLocaleTimeString()}
                  {action.retryCount > 0 && ` (retry ${action.retryCount})`}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncStatus === 'syncing' || !isConnected}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              onClick={clearPendingActions}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Test Actions */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">Test Offline Actions</h3>
        <p className="text-sm text-gray-600 mb-4">
          Try these actions while offline to see them queued for later sync:
        </p>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 15, 16, 17, 18, 19, 30, 31, 32, 33, 34, 45, 46, 47, 48, 49, 60, 61, 62, 63, 64].map((number) => (
            <button
              key={number}
              onClick={() => handlePunchNumber(number)}
              className={`p-2 rounded text-sm font-medium border-2 transition-colors ${
                isNumberPunched(number)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
              }`}
            >
              {number}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          * This simulates punching numbers on a bingo card
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold mb-2 text-blue-800">How to Test</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Disconnect your internet or turn off WiFi</li>
          <li>Try punching some numbers above</li>
          <li>Notice they appear in "Pending Actions"</li>
          <li>Reconnect your internet</li>
          <li>Watch the actions sync automatically</li>
        </ol>
      </div>
    </div>
  );
};

export default OfflineExample;