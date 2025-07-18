import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorMessage, NetworkErrorMessage, AuthErrorMessage, NotFoundErrorMessage } from '../ErrorMessage';

describe('ErrorMessage', () => {
  it('renders with default props', () => {
    render(<ErrorMessage />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An error occurred while processing your request.')).toBeInTheDocument();
  });

  it('renders with custom title and message', () => {
    render(<ErrorMessage title="Custom Error" message="This is a custom error message" />);
    
    expect(screen.getByText('Custom Error')).toBeInTheDocument();
    expect(screen.getByText('This is a custom error message')).toBeInTheDocument();
  });

  it('renders error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const testError = new Error('Test error message');
    render(<ErrorMessage error={testError} />);
    
    expect(screen.getByText('Error Details')).toBeInTheDocument();
    
    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  it('does not render error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const testError = new Error('Test error message');
    render(<ErrorMessage error={testError} />);
    
    expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
    
    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  it('calls retry function when retry button is clicked', () => {
    const mockRetry = jest.fn();
    render(<ErrorMessage retry={mockRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render retry button when retry function is not provided', () => {
    render(<ErrorMessage />);
    
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ErrorMessage className="custom-class" />);
    
    const errorMessageElement = container.firstChild as HTMLElement;
    expect(errorMessageElement).toHaveClass('custom-class');
  });
});

describe('NetworkErrorMessage', () => {
  it('renders with network error specific content', () => {
    render(<NetworkErrorMessage />);
    
    expect(screen.getByText('Network Error')).toBeInTheDocument();
    expect(screen.getByText('Unable to connect to the server. Please check your internet connection and try again.')).toBeInTheDocument();
  });

  it('passes through retry prop', () => {
    const mockRetry = jest.fn();
    render(<NetworkErrorMessage retry={mockRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});

describe('AuthErrorMessage', () => {
  it('renders with auth error specific content', () => {
    render(<AuthErrorMessage />);
    
    expect(screen.getByText('Authentication Error')).toBeInTheDocument();
    expect(screen.getByText('Your session has expired or you are not authorized to access this resource.')).toBeInTheDocument();
  });
});

describe('NotFoundErrorMessage', () => {
  it('renders with not found error specific content', () => {
    render(<NotFoundErrorMessage />);
    
    expect(screen.getByText('Not Found')).toBeInTheDocument();
    expect(screen.getByText('The requested resource could not be found.')).toBeInTheDocument();
  });
});