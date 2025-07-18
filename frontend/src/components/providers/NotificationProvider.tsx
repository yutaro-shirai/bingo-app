import React, { useEffect } from 'react';
import { useNotifications } from '@/lib/services/notifications';
import { ToastContainer } from '@/components/ui/Toast';
import { useGameStore } from '@/lib/stores/gameStore';
import { usePlayerStore } from '@/lib/stores/playerStore';
import { useSocket } from '@/lib/services/useSocket';
import { useOfflineSupport } from '@/lib/services/offline';

interface NotificationProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

/**
 * Notification provider that automatically shows notifications for game events
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  position = 'top-right' 
}) => {
  const { 
    notifications, 
    removeNotification, 
    showSuccess, 
    showInfo, 
    showWarning, 
    showError,
    showBingo,
    showGameEvent,
    showConnectionStatus 
  } = useNotifications();

  const { isConnected } = useSocket();
  const { isOnline, pendingActions } = useOfflineSupport();
  const game = useGameStore((state) => state.game);
  const player = usePlayerStore((state) => state.player);

  // Connection status notifications
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (!isOnline) {
      showWarning(
        'You\'re offline',
        'Changes will be saved and synced when you reconnect.',
        { persistent: true }
      );
    } else if (!isConnected) {
      // Delay showing connection lost notification to avoid spam during quick reconnects
      timeoutId = setTimeout(() => {
        showWarning(
          'Connection lost',
          'Trying to reconnect...',
          { persistent: true }
        );
      }, 2000);
    } else {
      // Connected - show success briefly
      showSuccess('Connected', 'Successfully connected to game server');
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isOnline, isConnected, showWarning, showSuccess]);

  // Pending actions notifications
  useEffect(() => {
    if (pendingActions.length > 0 && isConnected) {
      showInfo(
        'Syncing changes',
        `${pendingActions.length} action${pendingActions.length !== 1 ? 's' : ''} being synced...`
      );
    }
  }, [pendingActions.length, isConnected, showInfo]);

  // Game state notifications
  useEffect(() => {
    if (!game) return;

    const lastDrawnNumber = game.drawnNumbers[game.drawnNumbers.length - 1];
    if (lastDrawnNumber && game.drawnNumbers.length > 0) {
      showGameEvent(
        `Number ${lastDrawnNumber} called!`,
        `${game.drawnNumbers.length} numbers called so far`
      );
    }
  }, [game?.drawnNumbers, showGameEvent]);

  // Game status notifications
  useEffect(() => {
    if (!game) return;

    switch (game.status) {
      case 'active':
        showGameEvent('Game started!', 'Good luck everyone!');
        break;
      case 'paused':
        showInfo('Game paused', 'The game has been paused by the administrator');
        break;
      case 'ended':
        showInfo('Game ended', 'Thanks for playing!');
        break;
    }
  }, [game?.status, showGameEvent, showInfo]);

  // Player bingo notifications
  useEffect(() => {
    if (player?.hasBingo && player.bingoAchievedAt) {
      showBingo(undefined, {
        actions: [
          {
            label: 'Celebrate! 🎉',
            action: () => {
              // Could trigger confetti or other celebration effects
              console.log('Celebrating bingo!');
            },
            style: 'primary',
          },
        ],
      });
    }
  }, [player?.hasBingo, player?.bingoAchievedAt, showBingo]);

  // WebSocket event notifications
  useEffect(() => {
    const { socket } = useSocket();

    // Player joined notifications
    const unsubscribePlayerJoined = socket.onPlayerJoined((message) => {
      if (message.payload.playerName !== player?.name) {
        showInfo(
          'Player joined',
          `${message.payload.playerName} joined the game`
        );
      }
    });

    // Player bingo notifications for other players
    const unsubscribePlayerBingo = socket.onPlayerBingo((message) => {
      if (message.payload.playerId !== player?.id) {
        showBingo(message.payload.playerName);
      }
    });

    // Error notifications
    const unsubscribeError = socket.onError((error) => {
      showError(
        'Game error',
        error.message || 'An unexpected error occurred',
        {
          actions: [
            {
              label: 'Retry',
              action: () => {
                // Could trigger a retry action
                window.location.reload();
              },
              style: 'primary',
            },
          ],
        }
      );
    });

    return () => {
      unsubscribePlayerJoined();
      unsubscribePlayerBingo();
      unsubscribeError();
    };
  }, [socket, player?.id, player?.name, showInfo, showBingo, showError]);

  return (
    <>
      {children}
      <ToastContainer
        notifications={notifications}
        onRemove={removeNotification}
        position={position}
      />
    </>
  );
};

export default NotificationProvider;