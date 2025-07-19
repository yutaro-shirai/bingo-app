import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/services';
import { useGame } from '@/lib/stores/gameStore';
import { getSocketService } from '@/lib/services/socket';
import { DrawMode } from 'shared';

interface NumberDrawingInterfaceProps {
  gameId: string;
}

const NumberDrawingInterface: React.FC<NumberDrawingInterfaceProps> = ({ gameId }) => {
  const { getAuthToken } = useAuth();
  const { game, isGameActive, lastDrawnNumber } = useGame();
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [autoDrawEnabled, setAutoDrawEnabled] = useState(false);
  const [drawInterval, setDrawInterval] = useState(30); // Default 30 seconds
  const autoDrawTimerRef = useRef<NodeJS.Timeout | null>(null);
  const socketService = getSocketService();

  // Initialize auto-draw state based on game settings
  useEffect(() => {
    if (game) {
      setAutoDrawEnabled(game.drawMode === DrawMode.TIMED);
      if (game.drawInterval) {
        setDrawInterval(game.drawInterval);
      }
    }
  }, [game]);

  // Draw a number manually
  const handleDrawNumber = useCallback(async () => {
    try {
      setIsDrawing(true);
      setDrawError(null);

      const token = await getAuthToken();
      if (!token) return;

      // Use WebSocket for real-time drawing
      socketService.emit('adminDrawNumber', { gameId });
    } catch (err) {
      setDrawError(err instanceof Error ? err.message : 'Failed to draw number');
    } finally {
      setIsDrawing(false);
    }
  }, [gameId, getAuthToken, socketService]);

  // Handle auto-draw timer
  useEffect(() => {
    // Clear any existing timer
    if (autoDrawTimerRef.current) {
      clearInterval(autoDrawTimerRef.current);
      autoDrawTimerRef.current = null;
    }

    // Set up new timer if auto-draw is enabled and game is active
    if (autoDrawEnabled && isGameActive && game?.drawMode === DrawMode.TIMED) {
      autoDrawTimerRef.current = setInterval(() => {
        handleDrawNumber();
      }, drawInterval * 1000);
    }

    // Cleanup on unmount
    return () => {
      if (autoDrawTimerRef.current) {
        clearInterval(autoDrawTimerRef.current);
      }
    };
  }, [autoDrawEnabled, isGameActive, drawInterval, game?.drawMode, handleDrawNumber]);

  // Draw a number manually
  const handleDrawNumber = useCallback(async () => {
    try {
      setIsDrawing(true);
      setDrawError(null);

      const token = await getAuthToken();
      if (!token) return;

      // Use WebSocket for real-time drawing
      socketService.emit('adminDrawNumber', { gameId });
    } catch (err) {
      setDrawError(err instanceof Error ? err.message : 'Failed to draw number');
    } finally {
      setIsDrawing(false);
    }
  }, [gameId, getAuthToken, socketService]);

  // Update draw mode (manual/timed)
  const handleDrawModeChange = async (mode: DrawMode) => {
    try {
      setDrawError(null);
      const isAuto = mode === DrawMode.TIMED;
      setAutoDrawEnabled(isAuto);

      const token = await getAuthToken();
      if (!token) return;

      // Update game settings via API
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          drawMode: mode,
          drawInterval: isAuto ? drawInterval : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update draw mode');
      }
    } catch (err) {
      setDrawError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  // Update draw interval
  const handleDrawIntervalChange = async (interval: number) => {
    try {
      setDrawError(null);
      setDrawInterval(interval);

      const token = await getAuthToken();
      if (!token) return;

      // Update game settings via API
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          drawInterval: interval,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update draw interval');
      }
    } catch (err) {
      setDrawError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  // Calculate remaining numbers
  const remainingNumbers = game ? 75 - game.drawnNumbers.length : 75;
  const drawProgress = game ? (game.drawnNumbers.length / 75) * 100 : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Number Drawing</h2>

      {/* Last drawn number display */}
      <div className="mb-6">
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-500 mb-1">Last Number Drawn</span>
          <div className={`
            w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold mb-2
            ${lastDrawnNumber !== null ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-400'}
          `}>
            {lastDrawnNumber !== null ? lastDrawnNumber : '-'}
          </div>
          <div className="text-sm text-gray-500">
            {game?.drawnNumbers.length || 0} of 75 numbers drawn
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
        <div 
          className="bg-indigo-600 h-2.5 rounded-full" 
          style={{ width: `${drawProgress}%` }}
        ></div>
      </div>

      {/* Draw controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manual draw controls */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Manual Drawing</h3>
          <div className="flex flex-col items-center">
            <button
              onClick={handleDrawNumber}
              disabled={isDrawing || !isGameActive || remainingNumbers === 0 || autoDrawEnabled}
              className={`
                w-full py-3 px-4 rounded-md shadow-sm text-white font-medium
                ${isDrawing || !isGameActive || remainingNumbers === 0 || autoDrawEnabled
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }
              `}
            >
              {isDrawing ? 'Drawing...' : 'Draw Next Number'}
            </button>
            <p className="mt-2 text-sm text-gray-500">
              {!isGameActive 
                ? 'Game must be active to draw numbers' 
                : remainingNumbers === 0 
                  ? 'All numbers have been drawn' 
                  : autoDrawEnabled 
                    ? 'Automatic drawing is enabled' 
                    : `${remainingNumbers} numbers remaining`}
            </p>
          </div>
        </div>

        {/* Automatic draw controls */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Automatic Drawing</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="auto-draw"
                name="auto-draw"
                type="checkbox"
                checked={autoDrawEnabled}
                onChange={(e) => handleDrawModeChange(e.target.checked ? DrawMode.TIMED : DrawMode.MANUAL)}
                disabled={!isGameActive || remainingNumbers === 0}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="auto-draw" className="ml-2 block text-sm text-gray-900">
                Enable automatic drawing
              </label>
            </div>
            
            <div>
              <label htmlFor="interval" className="block text-sm font-medium text-gray-700">
                Draw interval (seconds)
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="range"
                  id="interval"
                  name="interval"
                  min="5"
                  max="60"
                  step="5"
                  value={drawInterval}
                  onChange={(e) => setDrawInterval(parseInt(e.target.value, 10))}
                  disabled={!autoDrawEnabled || !isGameActive}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="ml-3 text-sm text-gray-500 w-12">{drawInterval}s</span>
              </div>
              <button
                onClick={() => handleDrawIntervalChange(drawInterval)}
                disabled={!autoDrawEnabled || !isGameActive}
                className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recently drawn numbers */}
      <div className="mt-6">
        <h3 className="font-medium text-gray-900 mb-3">Recently Drawn Numbers</h3>
        <div className="flex flex-wrap gap-2">
          {game && game.drawnNumbers.length > 0 ? (
            [...game.drawnNumbers].reverse().slice(0, 15).map((number, index) => (
              <div
                key={`${number}-${index}`}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${index === 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}
                `}
              >
                {number}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No numbers have been drawn yet</p>
          )}
        </div>
      </div>

      {/* All drawn numbers */}
      <div className="mt-6">
        <h3 className="font-medium text-gray-900 mb-3">All Drawn Numbers</h3>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {Array.from({ length: 75 }, (_, i) => i + 1).map((number) => {
            const isDrawn = game?.drawnNumbers.includes(number) || false;
            return (
              <div
                key={number}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                  ${isDrawn ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-400'}
                `}
              >
                {number}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error message */}
      {drawError && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{drawError}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NumberDrawingInterface;