import { render } from '@testing-library/react';
import { StoreProvider } from '../StoreProvider';

// Mock the store initialization hook
jest.mock('@/lib/stores', () => ({
  useStoreInitialization: jest.fn(),
}));

const mockUseStoreInitialization = require('@/lib/stores').useStoreInitialization;

describe('StoreProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children', () => {
    const { getByText } = render(
      <StoreProvider>
        <div>Test Child</div>
      </StoreProvider>
    );
    
    expect(getByText('Test Child')).toBeInTheDocument();
  });

  it('calls useStoreInitialization hook', () => {
    render(
      <StoreProvider>
        <div>Test Child</div>
      </StoreProvider>
    );
    
    expect(mockUseStoreInitialization).toHaveBeenCalled();
  });
});