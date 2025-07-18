import React, { useEffect, useRef, useState } from 'react';
import { BingoCard } from 'shared/types';
import { usePlayerCard } from '@/lib/stores/playerStore';
import { useGame } from '@/lib/stores/gameStore';
import { triggerHapticFeedback, playSoundEffect, ANIMATION_CLASSES } from '@/lib/utils/animations';

interface AnimatedBingoCardProps {
  card: BingoCard;
  className?: string;
  disabled?: boolean;
  showCalledNumbers?: boolean;
}

/**
 * Animated bingo card component with visual feedback
 */
export const AnimatedBingoCard: React.FC<AnimatedBingoCardProps> = ({
  card,
  className = '',
  disabled = false,
  showCalledNumbers = true,
}) => {
  const { punchNumber, unpunchNumber, isNumberPunched, isPunchedPosition } = usePlayerCard();
  const { game } = useGame();
  const [animatingCells, setAnimatingCells] = useState<Set<string>>(new Set());
  const [highlightedNumbers, setHighlightedNumbers] = useState<Set<number>>(new Set());
  const cardRef = useRef<HTMLDivElement>(null);

  // Animate newly called numbers
  useEffect(() => {
    if (!game?.drawnNumbers || game.drawnNumbers.length === 0) return;

    const lastDrawnNumber = game.drawnNumbers[game.drawnNumbers.length - 1];
    if (lastDrawnNumber) {
      setHighlightedNumbers(prev => new Set([...prev, lastDrawnNumber]));
      
      // Remove highlight after animation
      setTimeout(() => {
        setHighlightedNumbers(prev => {
          const newSet = new Set(prev);
          newSet.delete(lastDrawnNumber);
          return newSet;
        });
      }, 2000);
    }
  }, [game?.drawnNumbers]);

  const handleCellClick = (row: number, col: number) => {
    if (disabled) return;

    const number = card.grid[row][col];
    const cellKey = `${row}-${col}`;
    const isPunched = isPunchedPosition(row, col);

    // Add animation class
    setAnimatingCells(prev => new Set([...prev, cellKey]));

    // Trigger haptic feedback
    triggerHapticFeedback(isPunched ? 'light' : 'medium');

    // Play sound effect
    playSoundEffect(isPunched ? 'unpunch' : 'punch', 0.3);

    // Perform the action
    if (isPunched) {
      unpunchNumber(number);
    } else {
      punchNumber(number);
    }

    // Remove animation class after animation completes
    setTimeout(() => {
      setAnimatingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
    }, 200);
  };

  const getCellClasses = (row: number, col: number) => {
    const number = card.grid[row][col];
    const cellKey = `${row}-${col}`;
    const isPunched = isPunchedPosition(row, col);
    const isCalled = game?.drawnNumbers.includes(number) || false;
    const isHighlighted = highlightedNumbers.has(number);
    const isAnimating = animatingCells.has(cellKey);
    const isFreeSpace = card.freeSpace && card.freeSpace.row === row && card.freeSpace.col === col;

    let classes = 'bingo-cell ';

    // Base styling
    if (isFreeSpace) {
      classes += 'bg-gray-200 text-gray-600 cursor-default ';
    } else if (isPunched) {
      classes += 'bg-blue-500 text-white shadow-lg ';
    } else if (isCalled) {
      classes += 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300 ';
    } else {
      classes += 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 ';
    }

    // Animation classes
    if (isAnimating) {
      classes += `${ANIMATION_CLASSES.CARD_PUNCH} `;
    }

    if (isHighlighted) {
      classes += `${ANIMATION_CLASSES.GLOW} `;
    }

    // Interactive states
    if (!disabled && !isFreeSpace) {
      classes += 'cursor-pointer active:scale-95 ';
    }

    return classes.trim();
  };

  return (
    <div 
      ref={cardRef}
      className={`bingo-card ${className} ${ANIMATION_CLASSES.FADE_IN}`}
    >
      {card.grid.map((row, rowIndex) =>
        row.map((number, colIndex) => {
          const isFreeSpace = card.freeSpace && 
            card.freeSpace.row === rowIndex && 
            card.freeSpace.col === colIndex;

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={getCellClasses(rowIndex, colIndex)}
              onClick={() => handleCellClick(rowIndex, colIndex)}
              style={{
                animationDelay: `${(rowIndex * 5 + colIndex) * 50}ms`,
              }}
            >
              {isFreeSpace ? 'FREE' : number}
            </div>
          );
        })
      )}
    </div>
  );
};

export default AnimatedBingoCard;