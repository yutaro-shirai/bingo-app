/**
 * Animation utility functions and constants
 */

/**
 * Animation duration constants (in milliseconds)
 */
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  CELEBRATION: 2000,
} as const;

/**
 * Easing functions for animations
 */
export const EASING = {
  EASE_IN: 'ease-in',
  EASE_OUT: 'ease-out',
  EASE_IN_OUT: 'ease-in-out',
  BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  ELASTIC: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

/**
 * CSS animation classes for different effects
 */
export const ANIMATION_CLASSES = {
  // Entrance animations
  FADE_IN: 'animate-fade-in',
  SLIDE_IN_UP: 'animate-slide-in-up',
  SLIDE_IN_DOWN: 'animate-slide-in-down',
  SLIDE_IN_LEFT: 'animate-slide-in-left',
  SLIDE_IN_RIGHT: 'animate-slide-in-right',
  SCALE_IN: 'animate-scale-in',
  BOUNCE_IN: 'animate-bounce-in',
  
  // Exit animations
  FADE_OUT: 'animate-fade-out',
  SLIDE_OUT_UP: 'animate-slide-out-up',
  SLIDE_OUT_DOWN: 'animate-slide-out-down',
  SLIDE_OUT_LEFT: 'animate-slide-out-left',
  SLIDE_OUT_RIGHT: 'animate-slide-out-right',
  SCALE_OUT: 'animate-scale-out',
  
  // Attention animations
  PULSE: 'animate-pulse',
  BOUNCE: 'animate-bounce',
  SHAKE: 'animate-shake',
  WOBBLE: 'animate-wobble',
  FLASH: 'animate-flash',
  GLOW: 'animate-glow',
  
  // Special effects
  CONFETTI: 'animate-confetti',
  CELEBRATION: 'animate-celebration',
  NUMBER_DRAW: 'animate-number-draw',
  CARD_PUNCH: 'animate-card-punch',
} as const;

/**
 * Generate a random delay for staggered animations
 */
export const getRandomDelay = (min: number = 0, max: number = 500): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generate staggered animation delays for a list of items
 */
export const getStaggeredDelays = (count: number, baseDelay: number = 0, increment: number = 100): number[] => {
  return Array.from({ length: count }, (_, index) => baseDelay + (index * increment));
};

/**
 * Create a CSS animation string
 */
export const createAnimation = (
  name: string,
  duration: number = ANIMATION_DURATIONS.NORMAL,
  easing: string = EASING.EASE_IN_OUT,
  delay: number = 0,
  fillMode: 'none' | 'forwards' | 'backwards' | 'both' = 'both'
): string => {
  return `${name} ${duration}ms ${easing} ${delay}ms ${fillMode}`;
};

/**
 * Trigger a haptic feedback (if supported)
 */
export const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light'): void => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    };
    navigator.vibrate(patterns[type]);
  }
};

/**
 * Play a sound effect (if audio is enabled)
 */
export const playSoundEffect = (soundName: string, volume: number = 0.5): void => {
  try {
    const audio = new Audio(`/sounds/${soundName}.mp3`);
    audio.volume = volume;
    audio.play().catch(error => {
      console.warn('Could not play sound effect:', error);
    });
  } catch (error) {
    console.warn('Sound effect not available:', error);
  }
};

/**
 * Animation hook for managing component animations
 */
export const useAnimation = () => {
  const [isAnimating, setIsAnimating] = React.useState(false);

  const animate = React.useCallback((
    element: HTMLElement,
    animationClass: string,
    duration: number = ANIMATION_DURATIONS.NORMAL,
    onComplete?: () => void
  ) => {
    setIsAnimating(true);
    element.classList.add(animationClass);

    const handleAnimationEnd = () => {
      element.classList.remove(animationClass);
      setIsAnimating(false);
      onComplete?.();
      element.removeEventListener('animationend', handleAnimationEnd);
    };

    element.addEventListener('animationend', handleAnimationEnd);

    // Fallback timeout in case animationend doesn't fire
    setTimeout(() => {
      if (element.classList.contains(animationClass)) {
        handleAnimationEnd();
      }
    }, duration + 100);
  }, []);

  return { animate, isAnimating };
};

// Import React for the hook
import React from 'react';