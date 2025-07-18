import { NotificationService } from './notifications';

/**
 * Error categories for better error handling
 */
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  SERVER = 'server',
  CLIENT = 'client',
  WEBSOCKET = 'websocket',
  OFFLINE = 'offline',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

/**
 * Error with additional metadata for better handling
 */
export interface AppError extends Error {
  category: ErrorCategory;
  statusCode?: number;
  retryable: boolean;
  originalError?: any;
}

/**
 * Error handler service for consistent error handling across the application
 */
export class ErrorHandlerService {
  private static instance: ErrorHandlerService;
  private notificationService: NotificationService;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ErrorHandlerService {
    if (!ErrorHandlerService.instance) {
      ErrorHandlerService.instance = new ErrorHandlerService();
    }
    return ErrorHandlerService.instance;
  }

  /**
   * Handle error with appropriate UI feedback and logging
   */
  public handleError(error: any, context?: string): AppError {
    // Convert to AppError
    const appError = this.categorizeError(error);
    
    // Log error
    console.error(`[${context || 'App'}] ${appError.message}`, appError);
    
    // Show user-friendly notification
    this.showErrorNotification(appError, context);
    
    return appError;
  }

  /**
   * Categorize error for better handling
   */
  private categorizeError(error: any): AppError {
    // Default values
    let category = ErrorCategory.UNKNOWN;
    let message = 'An unexpected error occurred';
    let statusCode: number | undefined = undefined;
    let retryable = false;
    
    // If error already has category, return it
    if (error && error.category && Object.values(ErrorCategory).includes(error.category)) {
      return error as AppError;
    }
    
    // Handle different error types
    if (error instanceof Error) {
      message = error.message;
      
      // Check for network errors
      if (
        error.message.includes('network') ||
        error.message.includes('connection') ||
        error.message.includes('failed to fetch')
      ) {
        category = ErrorCategory.NETWORK;
        retryable = true;
      } else if (error.message.includes('timeout')) {
        category = ErrorCategory.TIMEOUT;
        retryable = true;
      } else if (error.message.includes('offline')) {
        category = ErrorCategory.OFFLINE;
        retryable = true;
      } else if (error.message.includes('websocket')) {
        category = ErrorCategory.WEBSOCKET;
        retryable = true;
      } else if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
        category = ErrorCategory.RATE_LIMIT;
        retryable = true;
      }
    }
    
    // Handle HTTP errors
    if (error && typeof error === 'object') {
      if (error.status || error.statusCode) {
        statusCode = error.status || error.statusCode;
        
        // Categorize based on status code
        if (statusCode === 401) {
          category = ErrorCategory.AUTHENTICATION;
          message = 'Authentication failed. Please log in again.';
        } else if (statusCode === 403) {
          category = ErrorCategory.AUTHORIZATION;
          message = 'You do not have permission to perform this action.';
        } else if (statusCode === 400 || statusCode === 422) {
          category = ErrorCategory.VALIDATION;
          message = error.message || 'Invalid input. Please check your data.';
        } else if (statusCode === 429) {
          category = ErrorCategory.RATE_LIMIT;
          message = 'Too many requests. Please try again later.';
          retryable = true;
        } else if (statusCode === 408) {
          category = ErrorCategory.TIMEOUT;
          message = 'Request timed out. Please try again.';
          retryable = true;
        } else if (statusCode >= 500) {
          category = ErrorCategory.SERVER;
          message = 'Server error. Please try again later.';
          retryable = true;
        } else if (statusCode >= 400) {
          category = ErrorCategory.CLIENT;
          message = error.message || 'Request failed. Please try again.';
        }
      }
      
      // Check for specific error types
      if (error.code) {
        switch (error.code) {
          case 'ECONNABORTED':
            category = ErrorCategory.TIMEOUT;
            message = 'Request timed out. Please try again.';
            retryable = true;
            break;
          case 'ECONNREFUSED':
            category = ErrorCategory.NETWORK;
            message = 'Connection refused. Please try again later.';
            retryable = true;
            break;
          case 'ENOTFOUND':
            category = ErrorCategory.NETWORK;
            message = 'Network error. Please check your connection.';
            retryable = true;
            break;
        }
      }
      
      // Use provided message if available
      if (error.message && typeof error.message === 'string') {
        message = error.message;
      }
      
      // Check for WebSocket specific errors
      if (error.type === 'TransportError' || error.type === 'transport error') {
        category = ErrorCategory.WEBSOCKET;
        message = 'WebSocket connection error. Please try again.';
        retryable = true;
      }
    }
    
    // Create AppError
    const appError = new Error(message) as AppError;
    appError.category = category;
    appError.statusCode = statusCode;
    appError.retryable = retryable;
    appError.originalError = error;
    
    return appError;
  }

  /**
   * Show user-friendly error notification
   */
  private showErrorNotification(error: AppError, context?: string): void {
    let title = 'Error';
    let message = error.message;
    let actions = [];
    let persistent = false;
    
    // Customize based on error category
    switch (error.category) {
      case ErrorCategory.NETWORK:
        title = 'Connection Error';
        message = 'Unable to connect to the server. Please check your internet connection.';
        actions = [
          {
            label: 'Retry',
            action: () => window.location.reload(),
            style: 'primary',
          },
        ];
        break;
        
      case ErrorCategory.OFFLINE:
        title = 'You\'re Offline';
        message = 'Your device is currently offline. Changes will be saved locally and synced when you reconnect.';
        persistent = true;
        break;
        
      case ErrorCategory.WEBSOCKET:
        title = 'Connection Error';
        message = 'Real-time connection lost. Game updates may be delayed.';
        actions = [
          {
            label: 'Reconnect',
            action: () => window.location.reload(),
            style: 'primary',
          },
        ];
        break;
        
      case ErrorCategory.TIMEOUT:
        title = 'Request Timeout';
        message = 'The request took too long to complete. Please try again.';
        actions = [
          {
            label: 'Retry',
            action: () => window.location.reload(),
            style: 'primary',
          },
        ];
        break;
        
      case ErrorCategory.RATE_LIMIT:
        title = 'Too Many Requests';
        message = 'Please slow down and try again in a moment.';
        break;
        
      case ErrorCategory.AUTHENTICATION:
        title = 'Authentication Error';
        message = 'Your session has expired. Please log in again.';
        actions = [
          {
            label: 'Log In',
            action: () => {
              window.location.href = '/admin/login';
            },
            style: 'primary',
          },
        ];
        break;
        
      case ErrorCategory.AUTHORIZATION:
        title = 'Access Denied';
        message = 'You do not have permission to perform this action.';
        break;
        
      case ErrorCategory.VALIDATION:
        title = 'Invalid Input';
        message = error.message || 'Please check your input and try again.';
        break;
        
      case ErrorCategory.SERVER:
        title = 'Server Error';
        message = 'The server encountered an error. Please try again later.';
        if (error.retryable) {
          actions = [
            {
              label: 'Retry',
              action: () => window.location.reload(),
              style: 'primary',
            },
          ];
        }
        break;
        
      case ErrorCategory.CLIENT:
        title = 'Request Failed';
        message = error.message || 'Your request could not be completed.';
        break;
    }
    
    // Add context to title if provided
    if (context) {
      title = `${title} (${context})`;
    }
    
    // Show notification
    this.notificationService.add({
      type: 'error',
      title,
      message,
      actions,
      duration: persistent ? 0 : 10000, // Show errors for longer or indefinitely if persistent
      persistent,
    });
  }

  /**
   * Handle API response errors
   */
  public async handleApiResponse<T>(
    promise: Promise<Response>,
    errorContext?: string,
    options?: {
      retryCount?: number;
      maxRetries?: number;
      retryDelay?: number;
      silentErrors?: boolean;
    }
  ): Promise<T> {
    const {
      retryCount = 0,
      maxRetries = 3,
      retryDelay = 1000,
      silentErrors = false,
    } = options || {};
    
    try {
      const response = await promise;
      
      if (!response.ok) {
        // Try to parse error response
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: response.statusText };
        }
        
        // Create error object with status
        const error = new Error(errorData.message || 'API request failed') as any;
        error.status = response.status;
        error.data = errorData;
        
        // Retry for certain status codes if we haven't exceeded max retries
        if (
          retryCount < maxRetries &&
          [408, 429, 500, 502, 503, 504].includes(response.status)
        ) {
          console.log(`Retrying request (${retryCount + 1}/${maxRetries})...`);
          
          // Wait before retrying (with exponential backoff)
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retryCount)));
          
          // Retry the request
          return this.handleApiResponse(
            promise,
            errorContext,
            {
              retryCount: retryCount + 1,
              maxRetries,
              retryDelay,
              silentErrors,
            }
          );
        }
        
        throw error;
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json() as T;
      } else {
        // Handle non-JSON responses
        return await response.text() as unknown as T;
      }
    } catch (error) {
      if (silentErrors) {
        // Just log the error without showing notification
        console.error(`[${errorContext || 'API'}] ${error.message}`, error);
        throw error;
      } else {
        throw this.handleError(error, errorContext);
      }
    }
  }
  
  /**
   * Retry a function with exponential backoff
   */
  public async retry<T>(
    fn: () => Promise<T>,
    options?: {
      maxRetries?: number;
      retryDelay?: number;
      shouldRetry?: (error: any) => boolean;
      onRetry?: (error: any, retryCount: number) => void;
      errorContext?: string;
    }
  ): Promise<T> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      shouldRetry = () => true,
      onRetry,
      errorContext,
    } = options || {};
    
    let lastError: any;
    
    for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (retryCount < maxRetries && shouldRetry(error)) {
          // Wait before retrying (with exponential backoff)
          const delay = retryDelay * Math.pow(2, retryCount);
          
          // Call onRetry callback if provided
          if (onRetry) {
            onRetry(error, retryCount + 1);
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If we shouldn't retry or have exceeded max retries, handle the error
        throw this.handleError(error, errorContext);
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw this.handleError(lastError, errorContext);
  }
}