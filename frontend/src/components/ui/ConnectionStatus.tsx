import React from 'react';
import { useSocket } from '@/lib/services/useSocket';

interface ConnectionStatusProps {
  className?: string;
}

/**
 * Component to display the WebSocket connection status
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const { isConnected, isConnecting, error, connect } = useSocket(true);

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <div 
        className={`w-2 h-2 rounded-full ${
          isConnected 
            ? 'bg-green-500' 
            : isConnecting 
              ? 'bg-yellow-500 animate-pulse' 
              : 'bg-red-500'
        }`} 
      />
      <span>
        {isConnected 
          ? 'Connected' 
          : isConnecting 
            ? 'Connecting...' 
            : 'Disconnected'}
      </span>
      {!isConnected && !isConnecting && (
        <button 
          onClick={() => connect()} 
          className="text-blue-500 hover:underline text-xs"
        >
          Reconnect
        </button>
      )}
      {error && (
        <span className="text-red-500 text-xs">{error.message}</span>
      )}
    </div>
  );
};

export default ConnectionStatus;