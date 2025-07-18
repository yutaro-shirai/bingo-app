import { renderHook } from '@testing-library/react';
import { useStoreInitialization } from '../index';

// Mock the store initialization functions
jest.mock('../gameStore', () => ({
  initializeGameStoreSync: jest.fn(() => jest.fn()),
}));

jest.mock('../playerStore', () => ({
  initializePlayerStoreSync: jest.fn(() => jest.fn()),
}));

const mockInitializeGameStoreSync = require('../gameStore').initializeGameStoreSync;
const mockInitializePlayerStoreSync = require('../playerStore').initializePlayerStoreSync;

describe('useStoreInitialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('initializes store synchronization on mount', () => {
    const { result } = renderHook(() => useStoreInitialization());
    
    expect(mockInitializeGameStoreSync).toHaveBeenCalledTimes(1);
    expect(mockInitializePlayerStoreSync).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith('Initializing store synchronization...');
  });

  it('only initializes once on multiple renders', () => {
    const { result, rerender } = renderHook(() => useStoreInitialization());
    
    expect(mockInitializeGameStoreSync).toHaveBeenCalledTimes(1);
    expect(mockInitializePlayerStoreSync).toHaveBeenCalledTimes(1);
    
    rerender();
    rerender();
    
    expect(mockInitializeGameStoreSync).toHaveBeenCalledTimes(1);
    expect(mockInitializePlayerStoreSync).toHaveBeenCalledTimes(1);
  });

  it('cleans up on unmount', () => {
    const mockGameCleanup = jest.fn();
    const mockPlayerCleanup = jest.fn();
    
    mockInitializeGameStoreSync.mockReturnValue(mockGameCleanup);
    mockInitializePlayerStoreSync.mockReturnValue(mockPlayerCleanup);
    
    const { unmount } = renderHook(() => useStoreInitialization());
    
    unmount();
    
    expect(mockGameCleanup).toHaveBeenCalledTimes(1);
    expect(mockPlayerCleanup).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith('Cleaning up store synchronization...');
  });
});