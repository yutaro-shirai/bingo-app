import { useEffect, useState, useCallback } from 'react';

/**
 * Notification types
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * Notification interface
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  timestamp: Date;
  actions?: NotificationAction[];
}

/**
 * Notification action interface
 */
export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary';
}

/**
 * Notification service
 */
class NotificationService {
  private notifications: Notification[] = [];
  private subscribers: Set<(notifications: Notification[]) => void> = new Set();
  private nextId = 1;

  /**
   * Add a new notification
   */
  add(notification: Omit<Notification, 'id' | 'timestamp'>): string {
    const id = `notification-${this.nextId++}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration ?? (notification.persistent ? 0 : 5000),
    };

    this.notifications.push(newNotification);
    this.notifySubscribers();

    // Auto-remove after duration if not persistent
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, newNotification.duration);
    }

    return id;
  }

  /**
   * Remove a notification by ID
   */
  remove(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifySubscribers();
  }

  /**
   * Clear all notifications
   */
  clear(): void {
    this.notifications = [];
    this.notifySubscribers();
  }

  /**
   * Get all notifications
   */
  getAll(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(callback: (notifications: Notification[]) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers
   */
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback([...this.notifications]);
      } catch (error) {
        console.error('Error in notification subscriber:', error);
      }
    });
  }

  // Convenience methods for different notification types
  
  /**
   * Show info notification
   */
  info(title: string, message?: string, options?: Partial<Notification>): string {
    return this.add({
      type: 'info',
      title,
      message,
      ...options,
    });
  }

  /**
   * Show success notification
   */
  success(title: string, message?: string, options?: Partial<Notification>): string {
    return this.add({
      type: 'success',
      title,
      message,
      ...options,
    });
  }

  /**
   * Show warning notification
   */
  warning(title: string, message?: string, options?: Partial<Notification>): string {
    return this.add({
      type: 'warning',
      title,
      message,
      ...options,
    });
  }

  /**
   * Show error notification
   */
  error(title: string, message?: string, options?: Partial<Notification>): string {
    return this.add({
      type: 'error',
      title,
      message,
      persistent: true, // Errors are persistent by default
      ...options,
    });
  }

  /**
   * Show bingo achievement notification
   */
  bingo(playerName?: string, options?: Partial<Notification>): string {
    return this.add({
      type: 'success',
      title: '🎉 BINGO!',
      message: playerName ? `${playerName} got BINGO!` : 'You got BINGO!',
      duration: 8000, // Longer duration for celebrations
      ...options,
    });
  }

  /**
   * Show game event notification
   */
  gameEvent(title: string, message?: string, options?: Partial<Notification>): string {
    return this.add({
      type: 'info',
      title,
      message,
      duration: 4000,
      ...options,
    });
  }

  /**
   * Show connection status notification
   */
  connectionStatus(isConnected: boolean, options?: Partial<Notification>): string {
    return this.add({
      type: isConnected ? 'success' : 'warning',
      title: isConnected ? 'Connected' : 'Connection Lost',
      message: isConnected 
        ? 'Successfully connected to game server' 
        : 'Trying to reconnect...',
      duration: isConnected ? 3000 : 0, // Persistent when disconnected
      ...options,
    });
  }
}

// Create singleton instance
let notificationService: NotificationService | null = null;

/**
 * Get the notification service instance
 */
export const getNotificationService = (): NotificationService => {
  if (!notificationService) {
    notificationService = new NotificationService();
  }
  return notificationService;
};

/**
 * React hook for using notifications
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const service = getNotificationService();
    const unsubscribe = service.subscribe(setNotifications);

    // Initial state
    setNotifications(service.getAll());

    return unsubscribe;
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    return getNotificationService().add(notification);
  }, []);

  const removeNotification = useCallback((id: string) => {
    getNotificationService().remove(id);
  }, []);

  const clearNotifications = useCallback(() => {
    getNotificationService().clear();
  }, []);

  // Convenience methods
  const showInfo = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return getNotificationService().info(title, message, options);
  }, []);

  const showSuccess = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return getNotificationService().success(title, message, options);
  }, []);

  const showWarning = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return getNotificationService().warning(title, message, options);
  }, []);

  const showError = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return getNotificationService().error(title, message, options);
  }, []);

  const showBingo = useCallback((playerName?: string, options?: Partial<Notification>) => {
    return getNotificationService().bingo(playerName, options);
  }, []);

  const showGameEvent = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return getNotificationService().gameEvent(title, message, options);
  }, []);

  const showConnectionStatus = useCallback((isConnected: boolean, options?: Partial<Notification>) => {
    return getNotificationService().connectionStatus(isConnected, options);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    showInfo,
    showSuccess,
    showWarning,
    showError,
    showBingo,
    showGameEvent,
    showConnectionStatus,
  };
};