import { getNotificationService, NotificationService } from '../notifications';

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    // Reset the singleton
    (global as any).notificationService = null;
    notificationService = getNotificationService();
  });

  afterEach(() => {
    // Clear all notifications after each test
    notificationService.clear();
  });

  describe('add', () => {
    it('should add a notification and return an ID', () => {
      const id = notificationService.add({
        type: 'info',
        title: 'Test notification',
        message: 'This is a test',
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const notifications = notificationService.getAll();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        id,
        type: 'info',
        title: 'Test notification',
        message: 'This is a test',
      });
    });

    it('should auto-remove non-persistent notifications after duration', (done) => {
      const id = notificationService.add({
        type: 'info',
        title: 'Auto-remove test',
        duration: 100, // 100ms
      });

      expect(notificationService.getAll()).toHaveLength(1);

      setTimeout(() => {
        expect(notificationService.getAll()).toHaveLength(0);
        done();
      }, 150);
    });

    it('should not auto-remove persistent notifications', (done) => {
      const id = notificationService.add({
        type: 'error',
        title: 'Persistent test',
        persistent: true,
      });

      expect(notificationService.getAll()).toHaveLength(1);

      setTimeout(() => {
        expect(notificationService.getAll()).toHaveLength(1);
        done();
      }, 100);
    });
  });

  describe('remove', () => {
    it('should remove a notification by ID', () => {
      const id = notificationService.add({
        type: 'info',
        title: 'Test notification',
      });

      expect(notificationService.getAll()).toHaveLength(1);

      notificationService.remove(id);

      expect(notificationService.getAll()).toHaveLength(0);
    });

    it('should not affect other notifications when removing one', () => {
      const id1 = notificationService.add({
        type: 'info',
        title: 'Notification 1',
      });

      const id2 = notificationService.add({
        type: 'success',
        title: 'Notification 2',
      });

      expect(notificationService.getAll()).toHaveLength(2);

      notificationService.remove(id1);

      const remaining = notificationService.getAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(id2);
    });
  });

  describe('clear', () => {
    it('should remove all notifications', () => {
      notificationService.add({ type: 'info', title: 'Test 1' });
      notificationService.add({ type: 'success', title: 'Test 2' });
      notificationService.add({ type: 'error', title: 'Test 3' });

      expect(notificationService.getAll()).toHaveLength(3);

      notificationService.clear();

      expect(notificationService.getAll()).toHaveLength(0);
    });
  });

  describe('convenience methods', () => {
    it('should create info notification', () => {
      const id = notificationService.info('Info title', 'Info message');
      
      const notifications = notificationService.getAll();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'info',
        title: 'Info title',
        message: 'Info message',
      });
    });

    it('should create success notification', () => {
      const id = notificationService.success('Success title', 'Success message');
      
      const notifications = notificationService.getAll();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'success',
        title: 'Success title',
        message: 'Success message',
      });
    });

    it('should create warning notification', () => {
      const id = notificationService.warning('Warning title', 'Warning message');
      
      const notifications = notificationService.getAll();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'warning',
        title: 'Warning title',
        message: 'Warning message',
      });
    });

    it('should create error notification (persistent by default)', () => {
      const id = notificationService.error('Error title', 'Error message');
      
      const notifications = notificationService.getAll();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'error',
        title: 'Error title',
        message: 'Error message',
        persistent: true,
      });
    });

    it('should create bingo notification', () => {
      const id = notificationService.bingo('John Doe');
      
      const notifications = notificationService.getAll();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'success',
        title: '🎉 BINGO!',
        message: 'John Doe got BINGO!',
        duration: 8000,
      });
    });

    it('should create bingo notification without player name', () => {
      const id = notificationService.bingo();
      
      const notifications = notificationService.getAll();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'success',
        title: '🎉 BINGO!',
        message: 'You got BINGO!',
      });
    });

    it('should create game event notification', () => {
      const id = notificationService.gameEvent('Game Started', 'Good luck!');
      
      const notifications = notificationService.getAll();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'info',
        title: 'Game Started',
        message: 'Good luck!',
        duration: 4000,
      });
    });

    it('should create connection status notification', () => {
      const id = notificationService.connectionStatus(true);
      
      const notifications = notificationService.getAll();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'success',
        title: 'Connected',
        message: 'Successfully connected to game server',
        duration: 3000,
      });
    });

    it('should create disconnection status notification (persistent)', () => {
      const id = notificationService.connectionStatus(false);
      
      const notifications = notificationService.getAll();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'warning',
        title: 'Connection Lost',
        message: 'Trying to reconnect...',
        duration: 0, // Persistent
      });
    });
  });

  describe('subscription', () => {
    it('should notify subscribers when notifications change', () => {
      const callback = jest.fn();
      const unsubscribe = notificationService.subscribe(callback);

      notificationService.add({
        type: 'info',
        title: 'Test notification',
      });

      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'info',
            title: 'Test notification',
          }),
        ])
      );

      unsubscribe();

      // Should not call after unsubscribe
      callback.mockClear();
      notificationService.add({
        type: 'success',
        title: 'Another notification',
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle errors in subscriber callbacks gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Subscriber error');
      });
      const normalCallback = jest.fn();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      notificationService.subscribe(errorCallback);
      notificationService.subscribe(normalCallback);

      notificationService.add({
        type: 'info',
        title: 'Test notification',
      });

      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in notification subscriber:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('notification actions', () => {
    it('should include actions in notifications', () => {
      const mockAction = jest.fn();
      
      const id = notificationService.add({
        type: 'info',
        title: 'Test with actions',
        actions: [
          {
            label: 'Click me',
            action: mockAction,
            style: 'primary',
          },
        ],
      });

      const notifications = notificationService.getAll();
      expect(notifications[0].actions).toHaveLength(1);
      expect(notifications[0].actions![0]).toMatchObject({
        label: 'Click me',
        style: 'primary',
      });

      // Test action execution
      notifications[0].actions![0].action();
      expect(mockAction).toHaveBeenCalled();
    });
  });
});