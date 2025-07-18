import { useEffect, useState, useCallback } from 'react';
import { getSocketService, WebSocketService } from './socket';
import { 
  GameStateUpdateMessage, 
  NumberDrawnMessage,
  PlayerJoinedMessage,
  PlayerPunchedNumberMessage,
  PlayerBingoMessage,
  SyncResponseMessage,
  JoinGameResponse
} from 'shared/types';

/**
 * Hook for using the WebSocket service in React components
 */
export const useSocket = (autoConnect = false, gameId?: string, playerId?: string) => {
  const [socket] = useState<WebSocketService>(getSocketService());
  const [isConnected, setIsConnected] = useState<boolean>(socket.isConnected());
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Connect to the WebSocket server
   */
  const connect = useCallback(async (gameId?: string, playerId?: string) => {
    try {
      setIsConnecting(true);
      setError(null);
      await socket.connect(gameId, playerId);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect'));
    } finally {
      setIsConnecting(false);
    }
  }, [socket]);

  /**
   * Disconnect from the WebSocket server
   */
  const disconnect = useCallback(() => {
    socket.disconnect();
    setIsConnected(false);
  }, [socket]);

  /**
   * Join a game
   */
  const joinGame = useCallback(async (gameId: string, playerName: string): Promise<JoinGameResponse> => {
    try {
      setError(null);
      return await socket.joinGame(gameId, playerName);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to join game');
      setError(error);
      throw error;
    }
  }, [socket]);

  /**
   * Punch a number on the bingo card
   */
  const punchNumber = useCallback((number: number) => {
    socket.punchNumber(number);
  }, [socket]);

  /**
   * Unpunch a number on the bingo card
   */
  const unpunchNumber = useCallback((number: number) => {
    socket.unpunchNumber(number);
  }, [socket]);

  /**
   * Request synchronization with the server
   */
  const requestSync = useCallback(() => {
    socket.requestSync();
  }, [socket]);

  // Set up connection event handlers
  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onReconnect = () => setIsConnected(true);
    const onError = (err: Error) => setError(err);

    const unsubConnect = socket.onConnect(onConnect);
    const unsubDisconnect = socket.onDisconnect(onDisconnect);
    const unsubReconnect = socket.onReconnect(onReconnect);
    const unsubError = socket.onError(onError);

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubReconnect();
      unsubError();
    };
  }, [socket]);

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect && !isConnected && !isConnecting) {
      connect(gameId, playerId);
    }
    
    return () => {
      // Don't disconnect on unmount as other components might be using the socket
    };
  }, [autoConnect, connect, gameId, isConnected, isConnecting, playerId]);

  return {
    socket,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    joinGame,
    punchNumber,
    unpunchNumber,
    requestSync,
    onGameStateUpdate: socket.onGameStateUpdate.bind(socket),
    onNumberDrawn: socket.onNumberDrawn.bind(socket),
    onPlayerJoined: socket.onPlayerJoined.bind(socket),
    onPlayerPunchedNumber: socket.onPlayerPunchedNumber.bind(socket),
    onPlayerBingo: socket.onPlayerBingo.bind(socket),
    onSyncResponse: socket.onSyncResponse.bind(socket),
  };
};