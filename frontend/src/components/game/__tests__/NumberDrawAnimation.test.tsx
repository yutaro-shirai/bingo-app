import { render, screen, waitFor } from '@testing-library/react';
import { NumberDrawAnimation } from '../NumberDrawAnimation';

// Mock the stores and utilities
jest.mock('@/lib/stores/gameStore', () => ({
  useGame: jest.fn(),
}));

jest.mock('@/lib/utils/animations', () => ({
  ANIMATION_CLASSES: {
    NUMBER_DRAW: 'animate-number-draw',
    FADE_IN: 'animate-fade-in',
  },
  playSoundEffect: jest.fn(),
  triggerHapticFeedback: jest.fn(),
}));

const mockUseGame = require('@/lib/stores/gameStore').useGame;
const mockPlaySoundEffect = require('@/lib/utils/animations').playSoundEffect;
const mockTriggerHapticFeedback = require('@/lib/utils/animations').triggerHapticFeedback;

describe('NumberDrawAnimation', () => {
  const defaultGameState = {
    game: {
      status: 'active',
      drawnNumbers: [5, 10, 15, 20, 25, 30],
    },
    lastDrawnNumber: 30,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGame.mockReturnValue(defaultGameState);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders current number display', () => {
    render(<NumberDrawAnimation />);
    
    expect(screen.getByText('Current Number')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders game statistics', () => {
    render(<NumberDrawAnimation />);
    
    expect(screen.getByText('Numbers Called')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument(); // 6 numbers drawn
    expect(screen.getByText('Remaining')).toBeInTheDocument();
    expect(screen.getByText('69')).toBeInTheDocument(); // 75 - 6 = 69 remaining
  });

  it('renders recent numbers history', () => {
    render(<NumberDrawAnimation />);
    
    expect(screen.getByText('Recent Numbers')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders all called numbers grid', () => {
    render(<NumberDrawAnimation />);
    
    expect(screen.getByText('All Called Numbers')).toBeInTheDocument();
    
    // Check that all numbers 1-75 are rendered
    for (let i = 1; i <= 75; i++) {
      expect(screen.getAllByText(i.toString())[0]).toBeInTheDocument();
    }
  });

  it('shows waiting message when no game is available', () => {
    mockUseGame.mockReturnValue({ game: null, lastDrawnNumber: null });
    
    render(<NumberDrawAnimation />);
    
    expect(screen.getByText('Waiting for game to start...')).toBeInTheDocument();
  });

  it('shows "Last Number" text when game is not active', () => {
    mockUseGame.mockReturnValue({
      game: {
        ...defaultGameState.game,
        status: 'paused',
      },
      lastDrawnNumber: 30,
    });
    
    render(<NumberDrawAnimation />);
    
    expect(screen.getByText('Last Number')).toBeInTheDocument();
  });

  it('hides history when showHistory is false', () => {
    render(<NumberDrawAnimation showHistory={false} />);
    
    expect(screen.queryByText('Recent Numbers')).not.toBeInTheDocument();
  });

  it('limits history items based on maxHistoryItems', () => {
    render(<NumberDrawAnimation maxHistoryItems={3} />);
    
    // Should only show the last 3 numbers (excluding the current one)
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.queryByText('10')).not.toBeInTheDocument();
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  it('plays sound and triggers haptic feedback on new number', () => {
    const { rerender } = render(<NumberDrawAnimation />);
    
    expect(mockPlaySoundEffect).not.toHaveBeenCalled();
    expect(mockTriggerHapticFeedback).not.toHaveBeenCalled();
    
    // Update with a new number
    mockUseGame.mockReturnValue({
      ...defaultGameState,
      lastDrawnNumber: 35,
      game: {
        ...defaultGameState.game,
        drawnNumbers: [...defaultGameState.game.drawnNumbers, 35],
      },
    });
    
    rerender(<NumberDrawAnimation />);
    
    expect(mockPlaySoundEffect).toHaveBeenCalledWith('number-draw', 0.5);
    expect(mockTriggerHapticFeedback).toHaveBeenCalledWith('medium');
  });

  it('applies animation class to newly drawn number', () => {
    mockUseGame.mockReturnValue({
      ...defaultGameState,
      lastDrawnNumber: 35,
    });
    
    const { container } = render(<NumberDrawAnimation />);
    
    const numberElement = screen.getByText('35').closest('div');
    expect(numberElement).toHaveClass('animate-number-draw');
    
    // Animation should be removed after timeout
    jest.advanceTimersByTime(800);
    
    waitFor(() => {
      expect(numberElement).not.toHaveClass('animate-number-draw');
    });
  });

  it('applies custom className', () => {
    const { container } = render(<NumberDrawAnimation className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});