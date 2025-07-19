'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/services';
import { ProtectedRoute } from '@/components/ui/ProtectedRoute';
import { useGame, useGameActions } from '@/lib/stores/gameStore';
import { getSocketService } from '@/lib/services/socket';
import { initializeGameStoreSync } from '@/lib/stores/gameStore';
import ConnectionStatus from '@/components/ui/ConnectionStatus';
import GameStateIndicator from '@/components/game/GameStateIndicator';
import NumberDrawingInterface from '@/components/admin/NumberDrawingInterface';
import PlayerMonitoringDashboard from '@/components/admin/PlayerMonitoringDashboard';
import GameControlInterface from '@/components/admin/GameControlInterface';
import { GameStatus, DrawMode } from 'shared';

export default function AdminGamePage() {
  const params = useParams();
  const router = useRouter();
  const { getAuthToken } = useAuth();
  const { game } = useGame();
  const { setGame } = useGameActions();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketService = getSocketService();

  // Get game ID from URL params
  const gameId = params.id as string;

  // Fetch game data and initialize socket connection
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = await getAuthToken();
        if (!token) {
          router.push('/admin/login');
          return;
        }

        // Fetch game data from API
        const response = await fetch(`/api/games/${gameId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch game data');
        }

        const gameData = await response.json();
        setGame(gameData);

        // Connect to WebSocket as admin
        await socketService.connect(gameId);
        
        // Initialize store synchronization
        initializeGameStoreSync();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameData();

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, [gameId, getAuthToken, router, setGame, socketService]);

  // Handle game status changes
  const handleStartGame = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/games/${gameId}/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start game');
      }

      const updatedGame = await response.json();
      setGame(updatedGame);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handlePauseGame = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/games/${gameId}/pause`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to pause game');
      }

      const updatedGame = await response.json();
      setGame(updatedGame);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleResumeGame = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/games/${gameId}/resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to resume game');
      }

      const updatedGame = await response.json();
      setGame(updatedGame);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleEndGame = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/games/${gameId}/end`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to end game');
      }

      const updatedGame = await response.json();
      setGame(updatedGame);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Game Management</h1>
              {game && (
                <p className="text-sm text-gray-600 mt-1">
                  Game Code: <span className="font-medium">{game.code}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <ConnectionStatus />
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </header>

        <main>
          <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : error ? (
              <div className="rounded-md bg-red-50 p-4 mx-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : game ? (
              <div className="px-4 py-6 sm:px-0">
                {/* Game Control Interface */}
                <GameControlInterface 
                  gameId={gameId}
                  onStartGame={handleStartGame}
                  onPauseGame={handlePauseGame}
                  onResumeGame={handleResumeGame}
                  onEndGame={handleEndGame}
                />
                
                {/* Number Drawing Interface */}
                <NumberDrawingInterface gameId={gameId} />
                
                {/* Player Monitoring Dashboard */}
                <PlayerMonitoringDashboard gameId={gameId} />
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Game not found</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}