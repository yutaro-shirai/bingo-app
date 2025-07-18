import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnimatedBingoCard } from '../AnimatedBingoCard';
import { BingoCard } from 'shared/types';

// Mock the stores and utilities
jest.mock('@/lib/stores/playerStore', () => ({
  usePlayerCard: jest.fn(),
}));

jest.mock('@/lib/stores/gameStore', () => ({
  useGame: jest.fn(),
}));

jest.mock('@/lib/utils/animations', () => ({
  triggerHapticFeedback: jest.fn(),
  playSoundEffect: jest.fn(),
  ANIMATION_CLASSES: {
    CARD_PUNCH: 'animate-punch',
    GLOW: 'animate-glow',
    FADE_IN: 'animate-fade-in',
  },
}));

const mockUsePlayerCard = require('@/lib/stores/playerStore').usePlayerCard;
const mockUseGame = require('@/lib/stores/gameStore').useGame;
const mockTriggerHapticFeedback = require('@/lib/utils/animations').triggerHapticFeedback;
const mockPlaySoundEffect = require('@/lib/utils/animations').playSoundEffect;

const mockCard: BingoCard = {
  grid: [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [11, 12, 0, 14, 15], // 0 represents free space
    [16, 17, 18, 19, 20],
    [21, 22, 23, 24, 25],
  ],
  freeSpace: { row: 2, col: 2 },
};

describe('AnimatedBingoCard', () => {
  const defaultPlayerCardState = {
    punchNumber: jest.fn(),
    unpunchNumber: jest.fn(),
    isNumberPunched: jest.fn(() => false),
    isPunchedPosition: jest.fn(() => false),
  };

  const defaultGameState = {
    game: {
      drawnNumbers: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePlayerCard.mockReturnValue(defaultPlayerCardState);
    mockUseGame.mockReturnValue(defaultGameState);
  });

  it('renders bingo card grid', () => {
    render(<AnimatedBingoCard card={mockCard} />);
    
    // Check that numbers are rendered
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('FREE')).toBeInTheDocument();
  });

  it('handles cell click for unpunched number', () => {
    const mockPunchNumber = jest.fn();
    mockUsePlayerCard.mockReturnValue({
      ...defaultPlayerCardState,
      punchNumber: mockPunchNumber,
    });

    render(<AnimatedBingoCard card={mockCard} />);
    
    fireEvent.click(screen.getByText('1'));
    
    expect(mockPunchNumber).toHaveBeenCalledWith(1);
    expect(mockTriggerHapticFeedback).toHaveBeenCalledWith('medium');
    expect(mockPlaySoundEffect).toHaveBeenCalledWith('punch', 0.3);
  });

  it('handles cell click for punched number', () => {
    const mockUnpunchNumber = jest.fn();
    mockUsePlayerCard.mockReturnValue({
      ...defaultPlayerCardState,
      unpunchNumber: mockUnpunchNumber,
      isPunchedPosition: jest.fn((row, col) => row === 0 && col === 0),
    });

    render(<AnimatedBingoCard card={mockCard} />);
    
    fireEvent.click(screen.getByText('1'));
    
    expect(mockUnpunchNumber).toHaveBeenCalledWith(1);
    expect(mockTriggerHapticFeedback).toHaveBeenCalledWith('light');
    expect(mockPlaySoundEffect).toHaveBeenCalledWith('unpunch', 0.3);
  });

  it('does not handle clicks when disabled', () => {
    const mockPunchNumber = jest.fn();
    mockUsePlayerCard.mockReturnValue({
      ...defaultPlayerCardState,
      punchNumber: mockPunchNumber,
    });

    render(<AnimatedBingoCard card={mockCard} disabled />);
    
    fireEvent.click(screen.getByText('1'));
    
    expect(mockPunchNumber).not.toHaveBeenCalled();
  });

  it('does not handle clicks on free space', () => {
    const mockPunchNumber = jest.fn();
    mockUsePlayerCard.mockReturnValue({
      ...defaultPlayerCardState,
      punchNumber: mockPunchNumber,
    });

    render(<AnimatedBingoCard card={mockCard} />);
    
    fireEvent.click(screen.getByText('FREE'));
    
    expect(mockPunchNumber).not.toHaveBeenCalled();
  });

  it('applies correct styling for punched numbers', () => {
    mockUsePlayerCard.mockReturnValue({
      ...defaultPlayerCardState,
      isPunchedPosition: jest.fn((row, col) => row === 0 && col === 0),
    });

    render(<AnimatedBingoCard card={mockCard} />);
    
    const punchedCell = screen.getByText('1');
    expect(punchedCell).toHaveClass('bg-blue-500', 'text-white');
  });

  it('applies correct styling for called numbers', () => {
    mockUseGame.mockReturnValue({
      game: {
        drawnNumbers: [1, 5, 10],
      },
    });

    render(<AnimatedBingoCard card={mockCard} />);
    
    const calledCell = screen.getByText('1');
    expect(calledCell).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('applies correct styling for free space', () => {
    render(<AnimatedBingoCard card={mockCard} />);
    
    const freeSpaceCell = screen.getByText('FREE');
    expect(freeSpaceCell).toHaveClass('bg-gray-200', 'text-gray-600', 'cursor-default');
  });

  it('highlights newly drawn numbers', async () => {
    const { rerender } = render(<AnimatedBingoCard card={mockCard} />);
    
    // Update game state with new drawn number
    mockUseGame.mockReturnValue({
      game: {
        drawnNumbers: [1],
      },
    });
    
    rerender(<AnimatedBingoCard card={mockCard} />);
    
    const highlightedCell = screen.getByText('1');
    expect(highlightedCell).toHaveClass('animate-glow');
    
    // Wait for highlight to be removed
    await waitFor(() => {
      expect(highlightedCell).not.toHaveClass('animate-glow');
    }, { timeout: 2500 });
  });

  it('applies custom className', () => {
    const { container } = render(<AnimatedBingoCard card={mockCard} className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies fade-in animation class', () => {
    const { container } = render(<AnimatedBingoCard card={mockCard} />);
    
    expect(container.firstChild).toHaveClass('animate-fade-in');
  });

  it('adds animation delay to cells', () => {
    render(<AnimatedBingoCard card={mockCard} />);
    
    const firstCell = screen.getByText('1');
    const lastCell = screen.getByText('25');
    
    expect(firstCell).toHaveStyle('animation-delay: 0ms');
    expect(lastCell).toHaveStyle('animation-delay: 1200ms'); // (4 * 5 + 4) * 50ms
  });
});