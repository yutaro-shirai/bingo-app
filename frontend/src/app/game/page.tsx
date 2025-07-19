'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageType } from 'shared/types';
import { useSocket } from '@/lib/services/useSocket';
import { getSocketService } from '@/lib/services/socket';
import { usePlayer } from '@/lib/stores/playerStore';
import { useGame } from '@/lib/stores/gameStore';
import { initializePlayerStoreSync } from '@/lib/stores/playerStore';
import { initializeGameStoreSync } from '@/lib/stores/gameStore';
import ConnectionStatus from '@/components/ui/ConnectionStatus';
import OfflineIndicator from '@/components/ui/OfflineIndicator';
import CalledNumbersDisplay from '@/components/game/CalledNumbersDisplay';
import GameStateIndicator from '@/components/game/GameStateIndicator';
import AnimatedBingoCard from '@/components/game/AnimatedBingoCard';
import BingoCelebration, { MiniBingoCelebration } from '@/components/game/BingoCelebration';

export default function GamePage() {
  const router = useRouter();
  const { player, hasBingo, bingoLines } = usePlayer();
  const { game } = useGame();
  const { isConnected, connect } = useSocket();
  const [isInitialized, setIsInitialized] = useState(false);
  const [otherPlayerBingo, setOtherPlayerBingo] = useState<{ playerName: string } | null>(null);
  
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
        
        // Listen for other players' bingo achievements
        const socketService = getSocketService();
        const unsubscribePlayerBingo = socketService.onPlayerBingo((message) => {
          // Only show for other players, not the current player
          if (player && message.payload.playerId !== player.id) {
            setOtherPlayerBingo({
              playerName: message.payload.playerName
            });
          }
        });
        
        setIsInitialized(true);
        
        // Clean up on unmount
        return () => {
          cleanupPlayer();
          cleanupGame();
          unsubscribePlayerBingo();
        };
      } catch (error) {
        console.error('Failed to initialize game:', error);
      }
    };
    
    initializeGame();
  }, [player, isConnected, connect, router]);
  
  // Log bingo status changes
  useEffect(() => {
    if (hasBingo && player && isConnected) {
      console.log('Bingo achieved!', bingoLines);
    }
  }, [hasBingo, player, isConnected, bingoLines]);
  
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
      {/* Bingo celebration overlay (only shows when player has bingo) */}
      {hasBingo && <BingoCelebration />}
      
      {/* Mini celebration for other players' bingo */}
      {otherPlayerBingo && (
        <MiniBingoCelebration 
          playerName={otherPlayerBingo.playerName} 
          onComplete={() => setOtherPlayerBingo(null)} 
        />
      )}
      
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
        
        {hasBingo && (
          <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">You have BINGO!</span>
          </div>
        )}
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
            {player && player.card ? (
              <AnimatedBingoCard 
                card={player.card}
                className="w-full max-w-md mx-auto"
                showCalledNumbers={true}
                disabled={game?.status === 'ended'}
              />
            ) : (
              <div className="flex items-center justify-center min-h-[300px]">
                <p className="text-gray-500">Loading your bingo card...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}