import { SocketIOService } from '../socket';
import { MessageType } from 'shared/types';

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
  };
  
  return {
    io: jest.fn(() => mockSocket),
  };
});

describe('SocketIOService', () => {
  let socketService: SocketIOService;
  
  beforeEach(() => {
    socketService = new SocketIOService({
      url: 'http://test-server',
    });
    jest.clearAllMocks();
  });
  
  it('should create an instance', () => {
    expect(socketService).toBeDefined();
  });
  
  it('should register and notify event handlers', () => {
    const handler = jest.fn();
    const unregister = socketService['registerHandler']('test-event', handler);
    
    expect(unregister).toBeDefined();
    expect(typeof unregister).toBe('function');
    
    socketService['notifyHandlers']('test-event', { data: 'test' });
    expect(handler).toHaveBeenCalledWith({ data: 'test' });
    
    unregister();
    socketService['notifyHandlers']('test-event', { data: 'test2' });
    expect(handler).toHaveBeenCalledTimes(1);
  });
  
  it('should handle errors in event handlers', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const handler = jest.fn().mockImplementation(() => {
      throw new Error('Test error');
    });
    
    socketService['registerHandler']('test-event', handler);
    socketService['notifyHandlers']('test-event', { data: 'test' });
    
    expect(handler).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });
});