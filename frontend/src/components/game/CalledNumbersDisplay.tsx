import React from 'react';
import { useGame } from '@/lib/stores/gameStore';

interface CalledNumbersDisplayProps {
  maxDisplayed?: number;
  showLastDrawnHighlight?: boolean;
}

const CalledNumbersDisplay: React.FC<CalledNumbersDisplayProps> = ({
  maxDisplayed = 10,
  showLastDrawnHighlight = true,
}) => {
  const { game, lastDrawnNumber } = useGame();
  
  if (!game) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold mb-2">Called Numbers</h2>
        <div className="text-gray-500 text-center py-2">Waiting for game to start...</div>
      </div>
    );
  }
  
  // Get the most recent numbers (limited by maxDisplayed)
  const recentNumbers = [...game.drawnNumbers].reverse().slice(0, maxDisplayed);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-lg font-semibold mb-2">Called Numbers</h2>
      
      {/* Last drawn number (large display) */}
      {lastDrawnNumber !== null && (
        <div className="mb-4">
          <div className="text-center">
            <span className="text-sm text-gray-500">Last Number</span>
          </div>
          <div className="flex justify-center">
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold
              ${showLastDrawnHighlight ? 'bg-primary-500 text-white animate-pulse' : 'bg-gray-100 text-gray-800'}
            `}>
              {lastDrawnNumber}
            </div>
          </div>
        </div>
      )}
      
      {/* Recent numbers */}
      <div className="mt-2">
        <div className="text-sm text-gray-500 mb-1">Recent Numbers</div>
        <div className="flex flex-wrap gap-2 justify-center">
          {recentNumbers.length > 0 ? (
            recentNumbers.map((number, index) => (
              <div
                key={`${number}-${index}`}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${index === 0 && showLastDrawnHighlight ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-800'}
                `}
              >
                {number}
              </div>
            ))
          ) : (
            <div className="text-gray-500 text-center py-2 w-full">No numbers called yet</div>
          )}
        </div>
      </div>
      
      {/* Total called */}
      <div className="mt-4 text-center text-sm text-gray-500">
        {game.drawnNumbers.length} of 75 numbers called
      </div>
    </div>
  );
};

export default CalledNumbersDisplay;