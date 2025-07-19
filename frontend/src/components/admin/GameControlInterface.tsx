import React, { useState, useEffect } from 'react';
import { useGame } from '@/lib/stores/gameStore';
import { GameStatus } from 'shared/types';

interface GameControlInterfaceProps {
  gameId: string;
  onStartGame: () => Promise<void>;
  onPauseGame: () => Promise<void>;
  onResumeGame: () => Promise<void>;
  onEndGame: () => Promise<void>;
}

const GameControlInterface: React.FC<GameControlInterfaceProps> = ({
  gameId,
  onStartGame,
  onPauseGame,
  onResumeGame,
  onEndGame,
}) => {
  const { game } = useGame();
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [confirmEndGame, setConfirmEndGame] = useState(false);
  
  // Calculate and update elapsed time
  useEffect(() => {
    if (!game || !game.startedAt) return;
    
    const updateTimer = () => {
      const startTime = new Date(game.startedAt!).getTime();
      const now = new Date().getTime();
      const elapsedMs = now - startTime;
      
      // Format as HH:MM:SS
      const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
      const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((elapsedMs % (1000 * 60)) / 1000);
      
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const formattedSeconds = seconds.toString().padStart(2, '0');
      
      setElapsedTime(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
    };
    
    // Update immediately
    updateTimer();
    
    // Update every second
    const intervalId = setInterval(updateTimer, 1000);
    
    return () => clearInterval(intervalId);
  }, [game]);
  
  // Reset confirmation state when game status changes
  useEffect(() => {
    setConfirmEndGame(false);
  }, [game?.status]);
  
  // Handle end game confirmation
  const handleEndGameClick = () => {
    if (confirmEndGame) {
      onEndGame();
      setConfirmEndGame(false);
    } else {
      setConfirmEndGame(true);
    }
  };
  
  // Cancel end game confirmation
  const handleCancelEndGame = () => {
    setConfirmEndGame(false);
  };
  
  if (!game) return null;
  
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Game Controls</h2>
        
        {/* Game Timer */}
        <div className="flex items-center">
          <div className="text-2xl font-mono bg-gray-100 px-3 py-1 rounded-md">
            {elapsedTime}
          </div>
          <div className="ml-2 text-sm text-gray-500">
            {game.status === GameStatus.ACTIVE ? 'Running' : 
             game.status === GameStatus.PAUSED ? 'Paused' : 
             game.status === GameStatus.ENDED ? 'Ended' : 'Not Started'}
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3 justify-end">
        {/* Game control buttons based on current status */}
        {game.status === GameStatus.CREATED && (
          <button
            onClick={onStartGame}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Start Game
          </button>
        )}
        
        {game.status === GameStatus.ACTIVE && (
          <button
            onClick={onPauseGame}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Pause Game
          </button>
        )}
        
        {game.status === GameStatus.PAUSED && (
          <button
            onClick={onResumeGame}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Resume Game
          </button>
        )}
        
        {(game.status === GameStatus.ACTIVE || game.status === GameStatus.PAUSED) && (
          <>
            {confirmEndGame ? (
              <>
                <button
                  onClick={handleEndGameClick}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Confirm End Game
                </button>
                <button
                  onClick={handleCancelEndGame}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleEndGameClick}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                End Game
              </button>
            )}
          </>
        )}
      </div>
      
      {/* Game status information */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm font-medium text-gray-500">Players</div>
          <div className="text-lg font-semibold">
            {game.playerCount} total ({game.activePlayerCount} online)
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm font-medium text-gray-500">Bingos</div>
          <div className="text-lg font-semibold">{game.bingoCount}</div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm font-medium text-gray-500">Game Code</div>
          <div className="text-lg font-semibold">{game.code}</div>
        </div>
      </div>
      
      {/* Game expiration info */}
      {game.expiresAt && (
        <div className="mt-4 text-sm text-gray-500">
          Game session expires: {new Date(game.expiresAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default GameControlInterface;