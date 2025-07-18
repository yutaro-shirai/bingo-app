import React, { useState } from 'react';
import { AnimatedBingoCard } from '@/components/game/AnimatedBingoCard';
import { NumberDrawAnimation } from '@/components/game/NumberDrawAnimation';
import { BingoCelebration, MiniBingoCelebration } from '@/components/game/BingoCelebration';
import { usePlayerCard } from '@/lib/stores/playerStore';
import { useGame } from '@/lib/stores/gameStore';
import { ANIMATION_CLASSES, triggerHapticFeedback, playSoundEffect } from '@/lib/utils/animations';
import { BingoCard } from 'shared/types';

/**
 * Example component demonstrating all animation features
 */
export const AnimationExample: React.FC = () => {
  const { player } = usePlayerCard();
  const { game } = useGame();
  const [showCelebration, setShowCelebration] = useState(false);
  const [showMiniCelebration, setShowMiniCelebration] = useState(false);
  const [animationDemo, setAnimationDemo] = useState<string>('');

  // Mock bingo card for demonstration
  const mockCard: BingoCard = {
    grid: [
      [1, 16, 31, 46, 61],
      [2, 17, 32, 47, 62],
      [3, 18, 0, 48, 63], // 0 represents free space
      [4, 19, 34, 49, 64],
      [5, 20, 35, 50, 65],
    ],
    freeSpace: { row: 2, col: 2 },
  };

  const triggerAnimation = (animationClass: string) => {
    setAnimationDemo(animationClass);
    setTimeout(() => setAnimationDemo(''), 1000);
  };

  const testHapticFeedback = (type: 'light' | 'medium' | 'heavy') => {
    triggerHapticFeedback(type);
  };

  const testSoundEffect = (sound: string) => {
    playSoundEffect(sound, 0.5);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h2 className="text-3xl font-bold text-gray-900 text-center">Animation Showcase</h2>

      {/* Bingo Card Animation */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Animated Bingo Card</h3>
        <div className="flex justify-center">
          <AnimatedBingoCard 
            card={mockCard}
            className="max-w-sm"
            showCalledNumbers={true}
          />
        </div>
        <p className="text-sm text-gray-600 text-center">
          Click on numbers to see punch animations with haptic feedback
        </p>
      </section>

      {/* Number Draw Animation */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Number Drawing Animation</h3>
        <div className="bg-gray-50 rounded-lg p-6">
          <NumberDrawAnimation showHistory={true} maxHistoryItems={8} />
        </div>
      </section>

      {/* Animation Controls */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Animation Controls</h3>
        
        {/* Animation Demo Box */}
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div 
            className={`
              inline-block w-24 h-24 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xl
              ${animationDemo}
            `}
          >
            Demo
          </div>
          <p className="mt-2 text-sm text-gray-600">Animation demo box</p>
        </div>

        {/* Animation Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={() => triggerAnimation(ANIMATION_CLASSES.BOUNCE_IN)}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Bounce In
          </button>
          <button
            onClick={() => triggerAnimation(ANIMATION_CLASSES.SHAKE)}
            className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
          >
            Shake
          </button>
          <button
            onClick={() => triggerAnimation(ANIMATION_CLASSES.WOBBLE)}
            className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          >
            Wobble
          </button>
          <button
            onClick={() => triggerAnimation(ANIMATION_CLASSES.PULSE)}
            className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
          >
            Pulse
          </button>
          <button
            onClick={() => triggerAnimation(ANIMATION_CLASSES.FLASH)}
            className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
          >
            Flash
          </button>
          <button
            onClick={() => triggerAnimation(ANIMATION_CLASSES.GLOW)}
            className="px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm"
          >
            Glow
          </button>
          <button
            onClick={() => triggerAnimation(ANIMATION_CLASSES.NUMBER_DRAW)}
            className="px-3 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 text-sm"
          >
            Number Draw
          </button>
          <button
            onClick={() => triggerAnimation(ANIMATION_CLASSES.CELEBRATION)}
            className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
          >
            Celebration
          </button>
        </div>
      </section>

      {/* Haptic Feedback */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Haptic Feedback</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => testHapticFeedback('light')}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Light
          </button>
          <button
            onClick={() => testHapticFeedback('medium')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Medium
          </button>
          <button
            onClick={() => testHapticFeedback('heavy')}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
          >
            Heavy
          </button>
        </div>
        <p className="text-sm text-gray-600">
          * Haptic feedback works on supported mobile devices
        </p>
      </section>

      {/* Sound Effects */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Sound Effects</h3>
        <div className="flex space-x-2 flex-wrap">
          <button
            onClick={() => testSoundEffect('punch')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Punch
          </button>
          <button
            onClick={() => testSoundEffect('unpunch')}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Unpunch
          </button>
          <button
            onClick={() => testSoundEffect('number-draw')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Number Draw
          </button>
          <button
            onClick={() => testSoundEffect('celebration')}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Celebration
          </button>
        </div>
        <p className="text-sm text-gray-600">
          * Sound effects require audio files in /public/sounds/ directory
        </p>
      </section>

      {/* Celebration Demos */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Celebration Effects</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowCelebration(true)}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Full Celebration
          </button>
          <button
            onClick={() => setShowMiniCelebration(true)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Mini Celebration
          </button>
        </div>
      </section>

      {/* Staggered Animation Demo */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Staggered Animations</h3>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 25 }, (_, i) => (
            <div
              key={i}
              className={`
                w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg
                flex items-center justify-center text-white font-bold text-sm
                ${ANIMATION_CLASSES.SCALE_IN}
              `}
              style={{
                animationDelay: `${i * 50}ms`,
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600 text-center">
          Numbers appear with staggered timing
        </p>
      </section>

      {/* Celebration Components */}
      {showCelebration && (
        <BingoCelebration
          onComplete={() => setShowCelebration(false)}
          duration={3000}
        />
      )}

      {showMiniCelebration && (
        <MiniBingoCelebration
          playerName="Demo Player"
          onComplete={() => setShowMiniCelebration(false)}
        />
      )}
    </div>
  );
};

export default AnimationExample;