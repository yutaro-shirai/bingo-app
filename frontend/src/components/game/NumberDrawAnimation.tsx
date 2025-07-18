import React, { useEffect, useState } from 'react';
import { useGame } from '@/lib/stores/gameStore';
import { ANIMATION_CLASSES, playSoundEffect, triggerHapticFeedback } from '@/lib/utils/animations';

interface NumberDrawAnimationProps {
  className?: string;
  showHistory?: boolean;
  maxHistoryItems?: number;
}

/**
 * Animated number drawing display component
 */
export const NumberDrawAnimation: React.FC<NumberDrawAnimationProps> = ({
  className = '',
  showHistory = true,
  maxHistoryItems = 5,
}) => {
  const { game, lastDrawnNumber } = useGame();
  const [animatingNumber, setAnimatingNumber] = useState<number | null>(null);
  const [previousNumber, setPreviousNumber] = useState<number | null>(null);

  // Animate new number draws
  useEffect(() => {
    if (lastDrawnNumber && lastDrawnNumber !== previousNumber) {
      setAnimatingNumber(lastDrawnNumber);
      setPreviousNumber(lastDrawnNumber);

      // Play sound and haptic feedback
      playSoundEffect('number-draw', 0.5);
      triggerHapticFeedback('medium');

      // Remove animation after it completes
      setTimeout(() => {
        setAnimatingNumber(null);
      }, 800);
    }
  }, [lastDrawnNumber, previousNumber]);

  const getRecentNumbers = () => {
    if (!game?.drawnNumbers) return [];
    return game.drawnNumbers.slice(-maxHistoryItems).reverse();
  };

  if (!game) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <div className="text-gray-500">Waiting for game to start...</div>
      </div>
    );
  }

  return (
    <div className={`text-center space-y-6 ${className}`}>
      {/* Current/Last Number Display */}
      <div className="relative">
        <div className="text-sm font-medium text-gray-600 mb-2">
          {game.status === 'active' ? 'Current Number' : 'Last Number'}
        </div>
        
        {lastDrawnNumber ? (
          <div className="relative inline-block">
            <div
              className={`
                w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold
                bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg
                ${animatingNumber === lastDrawnNumber ? ANIMATION_CLASSES.NUMBER_DRAW : ''}
              `}
            >
              {lastDrawnNumber}
            </div>
            
            {/* Glow effect for active games */}
            {game.status === 'active' && (
              <div className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping" />
            )}
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-lg font-medium bg-gray-200 text-gray-500 mx-auto">
            ?
          </div>
        )}
      </div>

      {/* Game Statistics */}
      <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {game.drawnNumbers.length}
          </div>
          <div className="text-sm text-gray-600">Numbers Called</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {75 - game.drawnNumbers.length}
          </div>
          <div className="text-sm text-gray-600">Remaining</div>
        </div>
      </div>

      {/* Recent Numbers History */}
      {showHistory && game.drawnNumbers.length > 1 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-600">Recent Numbers</div>
          <div className="flex justify-center space-x-2 flex-wrap">
            {getRecentNumbers().slice(1).map((number, index) => (
              <div
                key={`${number}-${index}`}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  bg-gray-100 text-gray-700 border border-gray-200
                  ${ANIMATION_CLASSES.FADE_IN}
                `}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {number}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Called Numbers Grid */}
      {game.drawnNumbers.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-600">All Called Numbers</div>
          <div className="grid grid-cols-10 gap-1 max-w-md mx-auto">
            {Array.from({ length: 75 }, (_, i) => i + 1).map((number) => {
              const isCalled = game.drawnNumbers.includes(number);
              const isRecent = lastDrawnNumber === number;
              
              return (
                <div
                  key={number}
                  className={`
                    w-8 h-8 rounded text-xs font-medium flex items-center justify-center
                    transition-all duration-200
                    ${isCalled 
                      ? isRecent 
                        ? 'bg-blue-500 text-white shadow-md scale-110' 
                        : 'bg-blue-100 text-blue-800'
                      : 'bg-gray-50 text-gray-400'
                    }
                  `}
                >
                  {number}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default NumberDrawAnimation;