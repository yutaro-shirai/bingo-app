'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/services/useSocket';
import { usePlayer } from '@/lib/stores/playerStore';
import { useGame } from '@/lib/stores/gameStore';
import { initializePlayerStoreSync } from '@/lib/stores/playerStore';
import { initializeGameStoreSync } from '@/lib/stores/gameStore';
import ConnectionStatus from '@/components/ui/ConnectionStatus';
import OfflineIndicator from '@/components/ui/OfflineIndicator';
import CalledNumbersDisplay from '@/components/game/CalledNumbersDisplay';
import GameStateIndicator from '@/components/game/GameStateIndicator';

export default function GamePage() {
  const router = useRouter();
  const { player } = usePlayer();
  const { game } = useGame();
  const { isConnected, connect } = useSocket();
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize socket connection and store sync
  useEffect(() => {
    if (!player) {
      // Redirect to join page if no player data
      router.push('/join');
      return;
    }
    
    // Initialize socket connection
    const initializeGame = async () => {
      try {
        // Connect to socket if not already connected
        if (!isConnected) {
          await connect(player.gameId, player.id);
        }
        
        // Initialize store synchronization
        const cleanupPlayer = initializePlayerStoreSync();
        const cleanupGame = initializeGameStoreSync();
        
        setIsInitialized(true);
        
        // Clean up on unmount
        return () => {
          cleanupPlayer();
          cleanupGame();
        };
      } catch (error) {
        console.error('Failed to initialize game:', error);
      }
    };
    
    initializeGame();
  }, [player, isConnected, connect, router]);
  
  // Show loading state while initializing
  if (!isInitialized || !player) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        <p className="mt-4 text-gray-600">Loading game...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with connection status */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bingo Game</h1>
        <div className="flex items-center space-x-2">
          <ConnectionStatus />
        </div>
      </div>
      
      {/* Offline indicator (only shows when offline) */}
      <OfflineIndicator className="mb-6" />
      
      {/* Game info panel */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Welcome, {player.name}!</h2>
          <GameStateIndicator />
        </div>
        
        <div className="flex flex-wrap gap-4 text-sm">
          <p className="text-gray-600">
            Game Code: <span className="font-medium">{game?.code || 'Loading...'}</span>
          </p>
          <p className="text-gray-600">
            Players: <span className="font-medium">{game?.playerCount || 0}</span>
            <span className="text-gray-400 ml-1">({game?.activePlayerCount || 0} online)</span>
          </p>
          <p className="text-gray-600">
            Bingos: <span className="font-medium">{game?.bingoCount || 0}</span>
          </p>
        </div>
      </div>
      
      {/* Game layout - responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Called numbers */}
        <div className="md:col-span-1">
          <CalledNumbersDisplay maxDisplayed={15} />
        </div>
        
        {/* Right column - Bingo card */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-4">Your Bingo Card</h2>
            <div className="flex items-center justify-center min-h-[300px]">
              <p className="text-gray-500">Your bingo card will appear here</p>
              {/* Bingo card component will be added here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}