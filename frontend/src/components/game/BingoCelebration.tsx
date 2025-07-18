import React, { useEffect, useState } from 'react';
import { usePlayer } from '@/lib/stores/playerStore';
import { ANIMATION_CLASSES, playSoundEffect, triggerHapticFeedback } from '@/lib/utils/animations';

interface BingoCelebrationProps {
  onComplete?: () => void;
  duration?: number;
}

/**
 * Bingo celebration component with confetti and animations
 */
export const BingoCelebration: React.FC<BingoCelebrationProps> = ({
  onComplete,
  duration = 5000,
}) => {
  const { player, hasBingo } = usePlayer();
  const [isVisible, setIsVisible] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number; color: string; delay: number }>>([]);

  useEffect(() => {
    if (hasBingo && player?.bingoAchievedAt) {
      setIsVisible(true);
      
      // Generate confetti pieces
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        color: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'][i % 5],
        delay: Math.random() * 2000,
      }));
      setConfettiPieces(pieces);

      // Play celebration sound and haptic feedback
      playSoundEffect('celebration', 0.7);
      triggerHapticFeedback('heavy');

      // Auto-hide after duration
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [hasBingo, player?.bingoAchievedAt, duration, onComplete]);

  if (!isVisible || !hasBingo) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-20 animate-fade-in" />

      {/* Confetti */}
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-2 h-2 animate-confetti"
          style={{
            backgroundColor: piece.color,
            left: `${Math.random() * 100}%`,
            animationDelay: `${piece.delay}ms`,
            animationDuration: `${3000 + Math.random() * 2000}ms`,
          }}
        />
      ))}

      {/* Main celebration content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`text-center ${ANIMATION_CLASSES.BOUNCE_IN}`}>
          {/* BINGO text */}
          <div className={`text-6xl md:text-8xl font-bold text-yellow-400 mb-4 ${ANIMATION_CLASSES.CELEBRATION}`}>
            🎉 BINGO! 🎉
          </div>

          {/* Congratulations message */}
          <div className={`text-2xl md:text-3xl font-semibold text-white mb-6 ${ANIMATION_CLASSES.SLIDE_IN_UP}`}>
            Congratulations!
          </div>

          {/* Player name */}
          {player?.name && (
            <div className={`text-xl md:text-2xl text-white mb-8 ${ANIMATION_CLASSES.SLIDE_IN_UP}`}>
              {player.name} got BINGO!
            </div>
          )}

          {/* Achievement time */}
          {player?.bingoAchievedAt && (
            <div className={`text-lg text-gray-200 ${ANIMATION_CLASSES.FADE_IN}`}>
              Achieved at {player.bingoAchievedAt.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Fireworks effect */}
      <div className="absolute inset-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 rounded-full bg-yellow-400 animate-ping"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 200}ms`,
              animationDuration: '2s',
            }}
          />
        ))}
      </div>

      {/* Sparkles */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-yellow-300 animate-bounce"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2000}ms`,
              fontSize: `${12 + Math.random() * 8}px`,
            }}
          >
            ✨
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Mini celebration component for other players' bingo achievements
 */
export const MiniBingoCelebration: React.FC<{ playerName: string; onComplete?: () => void }> = ({
  playerName,
  onComplete,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-40 pointer-events-none">
      <div className={`bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg ${ANIMATION_CLASSES.SLIDE_IN_RIGHT}`}>
        <div className="flex items-center space-x-2">
          <span className="text-lg">🎉</span>
          <div>
            <div className="font-semibold">BINGO!</div>
            <div className="text-sm">{playerName} won!</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BingoCelebration;