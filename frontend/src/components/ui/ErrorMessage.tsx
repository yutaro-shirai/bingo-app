'use client';

import React from 'react';
import { Button } from './button';

interface ErrorMessageProps {
  title?: string;
  message?: string;
  error?: Error;
  retry?: () => void;
  className?: string;
}

/**
 * User-friendly error message component
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Something went wrong',
  message = 'An error occurred while processing your request.',
  error,
  retry,
  className = '',
}) => {
  return (
    <div className={`p-4 rounded-lg bg-red-50 border border-red-200 ${className}`}>
      <div className="flex items-start">
        {/* Error icon */}
        <div className="flex-shrink-0 text-red-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
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
        
        {/* Error content */}
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{message}</p>
            
            {/* Error details (only in development) */}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-2">
                <summary className="font-medium cursor-pointer">Error Details</summary>
                <pre className="mt-2 text-xs overflow-auto p-2 bg-red-100 rounded">
                  {error.toString()}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
          </div>
          
          {/* Retry button */}
          {retry && (
            <div className="mt-4">
              <Button
                onClick={retry}
                variant="outline"
                size="sm"
                className="text-red-800 hover:bg-red-100"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Network error message component
 */
export const NetworkErrorMessage: React.FC<Omit<ErrorMessageProps, 'title' | 'message'>> = (props) => {
  return (
    <ErrorMessage
      title="Network Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      {...props}
    />
  );
};

/**
 * Authentication error message component
 */
export const AuthErrorMessage: React.FC<Omit<ErrorMessageProps, 'title' | 'message'>> = (props) => {
  return (
    <ErrorMessage
      title="Authentication Error"
      message="Your session has expired or you are not authorized to access this resource."
      {...props}
    />
  );
};

/**
 * Not found error message component
 */
export const NotFoundErrorMessage: React.FC<Omit<ErrorMessageProps, 'title' | 'message'>> = (props) => {
  return (
    <ErrorMessage
      title="Not Found"
      message="The requested resource could not be found."
      {...props}
    />
  );
};