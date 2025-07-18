import { render, screen, waitFor } from '@testing-library/react';
import { BingoCelebration, MiniBingoCelebration } from '../BingoCelebration';

// Mock the stores and utilities
jest.mock('@/lib/stores/playerStore', () => ({
  usePlayer: jest.fn(),
}));

jest.mock('@/lib/utils/animations', () => ({
  ANIMATION_CLASSES: {
    BOUNCE_IN: 'animate-bounce-in',
    CELEBRATION: 'animate-celebration',
    SLIDE_IN_UP: 'animate-slide-in-up',
    FADE_IN: 'animate-fade-in',
    SLIDE_IN_RIGHT: 'animate-slide-in-right',
  },
  playSoundEffect: jest.fn(),
  triggerHapticFeedback: jest.fn(),
}));

const mockUsePlayer = require('@/lib/stores/playerStore').usePlayer;
const mockPlaySoundEffect = require('@/lib/utils/animations').playSoundEffect;
const mockTriggerHapticFeedback = require('@/lib/utils/animations').triggerHapticFeedback;

describe('BingoCelebration', () => {
  const mockBingoAchievedAt = new Date('2023-01-01T12:00:00Z');
  
  const defaultPlayerState = {
    player: {
      name: 'Test Player',
      bingoAchievedAt: mockBingoAchievedAt,
    },
    hasBingo: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePlayer.mockReturnValue(defaultPlayerState);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders celebration when player has bingo', () => {
    render(<BingoCelebration />);
    
    expect(screen.getByText('🎉 BINGO! 🎉')).toBeInTheDocument();
    expect(screen.getByText('Congratulations!')).toBeInTheDocument();
    expect(screen.getByText('Test Player got BINGO!')).toBeInTheDocument();
    expect(screen.getByText(`Achieved at ${mockBingoAchievedAt.toLocaleTimeString()}`)).toBeInTheDocument();
  });

  it('does not render when player does not have bingo', () => {
    mockUsePlayer.mockReturnValue({
      ...defaultPlayerState,
      hasBingo: false,
    });

    const { container } = render(<BingoCelebration />);
    expect(container.firstChild).toBeNull();
  });

  it('plays celebration sound and triggers haptic feedback', () => {
    render(<BingoCelebration />);
    
    expect(mockPlaySoundEffect).toHaveBeenCalledWith('celebration', 0.7);
    expect(mockTriggerHapticFeedback).toHaveBeenCalledWith('heavy');
  });

  it('calls onComplete callback after duration', async () => {
    const mockOnComplete = jest.fn();
    render(<BingoCelebration onComplete={mockOnComplete} duration={1000} />);
    
    expect(mockOnComplete).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('generates confetti pieces', () => {
    const { container } = render(<BingoCelebration />);
    
    // Check for confetti elements (should be 50 pieces)
    const confettiElements = container.querySelectorAll('.animate-confetti');
    expect(confettiElements.length).toBe(50);
  });

  it('generates fireworks effect', () => {
    const { container } = render(<BingoCelebration />);
    
    // Check for firework elements (should be 8 pieces)
    const fireworkElements = container.querySelectorAll('.animate-ping');
    expect(fireworkElements.length).toBe(8);
  });

  it('generates sparkles', () => {
    const { container } = render(<BingoCelebration />);
    
    // Check for sparkle elements (should be 20 pieces)
    const sparkleElements = container.querySelectorAll('.animate-bounce');
    expect(sparkleElements.length).toBe(20);
  });
});

describe('MiniBingoCelebration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders with player name', () => {
    render(<MiniBingoCelebration playerName="Other Player" />);
    
    expect(screen.getByText('BINGO!')).toBeInTheDocument();
    expect(screen.getByText('Other Player won!')).toBeInTheDocument();
  });

  it('calls onComplete callback after timeout', async () => {
    const mockOnComplete = jest.fn();
    render(<MiniBingoCelebration playerName="Other Player" onComplete={mockOnComplete} />);
    
    expect(mockOnComplete).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(3000);
    
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('applies slide-in animation class', () => {
    const { container } = render(<MiniBingoCelebration playerName="Other Player" />);
    
    const notificationElement = container.firstChild?.firstChild;
    expect(notificationElement).toHaveClass('animate-slide-in-right');
  });
});