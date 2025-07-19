import React from 'react';
import { useGame } from '@/lib/stores/gameStore';
import { GameStatus } from 'shared/types';

interface GameStateIndicatorProps {
  showDetails?: boolean;
}

const GameStateIndicator: React.FC<GameStateIndicatorProps> = ({ showDetails = true }) => {
  const { game, isGameActive, isGameEnded } = useGame();
  
  if (!game) {
    return (
      <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800">
        <span className="w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
        <span className="text-sm font-medium">Loading...</span>
      </div>
    );
  }
  
  // Determine status styling
  let statusColor = '';
  let statusBg = '';
  let statusDot = '';
  let statusText = '';
  
  switch (game.status) {
    case GameStatus.ACTIVE:
      statusColor = 'text-green-800';
      statusBg = 'bg-green-100';
      statusDot = 'bg-green-500';
      statusText = 'Active';
      break;
    case GameStatus.PAUSED:
      statusColor = 'text-yellow-800';
      statusBg = 'bg-yellow-100';
      statusDot = 'bg-yellow-500';
      statusText = 'Paused';
      break;
    case GameStatus.ENDED:
      statusColor = 'text-red-800';
      statusBg = 'bg-red-100';
      statusDot = 'bg-red-500';
      statusText = 'Ended';
      break;
    case GameStatus.CREATED:
    default:
      statusColor = 'text-blue-800';
      statusBg = 'bg-blue-100';
      statusDot = 'bg-blue-500';
      statusText = 'Created';
      break;
  }
  
  // Calculate time elapsed since game started
  let timeElapsed = '';
  if (game.startedAt) {
    const startTime = new Date(game.startedAt).getTime();
    const now = new Date().getTime();
    const elapsedMs = now - startTime;
    
    const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
    const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsedMs % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      timeElapsed = `${hours}h ${minutes}m ${seconds}s`;
    } else {
      timeElapsed = `${minutes}m ${seconds}s`;
    }
  }
  
  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full ${statusBg} ${statusColor}`}>
      <span className={`w-2 h-2 rounded-full ${statusDot} mr-2 ${isGameActive ? 'animate-pulse' : ''}`}></span>
      <span className="text-sm font-medium">{statusText}</span>
      
      {showDetails && game.startedAt && (
        <span className="ml-2 text-xs opacity-75">
          {isGameEnded ? 'Completed' : `Running: ${timeElapsed}`}
        </span>
      )}
    </div>
  );
};

export default GameStateIndicator;