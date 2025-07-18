'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component to catch and handle errors in the component tree
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback UI
      return (
        <div className="p-6 rounded-lg bg-red-50 border border-red-200 text-center">
          <div className="text-red-500 text-4xl mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-700 mb-4">
            We're sorry, but an error occurred while rendering this component.
          </p>
          <div className="flex justify-center space-x-4">
            <Button onClick={this.handleReset} variant="primary">
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} variant="secondary">
              Reload Page
            </Button>
          </div>
          
          {/* Error details (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 text-left">
              <details className="bg-red-100 p-4 rounded-lg">
                <summary className="font-bold cursor-pointer">Error Details</summary>
                <pre className="mt-2 text-sm overflow-auto p-2 bg-red-200 rounded">
                  {this.state.error?.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre className="mt-2 text-sm overflow-auto p-2 bg-red-200 rounded">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            </div>
          )}
        </div>
      );
    }

    // Render children if no error
    return this.props.children;
  }
}