'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import QRCodeScanner from '@/components/game/QRCodeScanner';
import { useSocket } from '@/lib/services/useSocket';
import { usePlayerActions } from '@/lib/stores/playerStore';
import { z } from 'zod';

// Form validation schema
const JoinGameSchema = z.object({
  gameCode: z.string().min(3, 'Game code must be at least 3 characters'),
  playerName: z.string().min(2, 'Name must be at least 2 characters'),
});

export default function JoinPage() {
  const router = useRouter();
  const { joinGame, connect } = useSocket();
  const { setPlayer } = usePlayerActions();
  
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [errors, setErrors] = useState<{ gameCode?: string; playerName?: string }>({});
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  
  // Handle QR code scan
  const handleQRScan = (scannedGameCode: string) => {
    setGameCode(scannedGameCode);
    // Focus on the name input after scanning
    document.getElementById('playerName')?.focus();
  };
  
  // Handle QR scanner error
  const handleQRError = (error: string) => {
    console.error('QR Scanner error:', error);
    // We don't need to show this error to the user as the QR component will handle it
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setJoinError(null);
    
    try {
      // Validate form data
      const formData = {
        gameCode,
        playerName,
      };
      
      JoinGameSchema.parse(formData);
      setErrors({});
      
      // Attempt to join the game
      setIsJoining(true);
      
      // First connect to the socket
      await connect();
      
      // Then join the game
      const response = await joinGame(gameCode, playerName);
      
      // Store player data
      setPlayer({
        id: response.playerId,
        gameId: response.gameId,
        name: playerName,
        card: { grid: [[]] }, // This will be populated by the sync response
        punchedNumbers: [],
        hasBingo: false,
        isOnline: true,
        lastSeenAt: new Date(),
      });
      
      // Redirect to the game page
      router.push('/game');
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        const fieldErrors: { gameCode?: string; playerName?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as 'gameCode' | 'playerName'] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        // Handle other errors (network, server, etc.)
        setJoinError(error instanceof Error ? error.message : 'Failed to join game');
      }
    } finally {
      setIsJoining(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-primary-700">Join Bingo Game</h1>
        
        {joinError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
            {joinError}
          </div>
        )}
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="gameCode" className="block text-sm font-medium mb-1">
              Game Code
            </label>
            <input
              id="gameCode"
              type="text"
              placeholder="Enter game code"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value)}
              className={`w-full px-4 py-2 border ${errors.gameCode ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
            {errors.gameCode && (
              <p className="mt-1 text-sm text-red-600">{errors.gameCode}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium mb-1">
              Your Name
            </label>
            <input
              id="playerName"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className={`w-full px-4 py-2 border ${errors.playerName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
            {errors.playerName && (
              <p className="mt-1 text-sm text-red-600">{errors.playerName}</p>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={isJoining}
          >
            {isJoining ? 'Joining...' : 'Join Game'}
          </Button>
        </form>
        
        <div className="mt-6">
          <p className="text-sm text-gray-600 mb-2 text-center">Or scan a QR code to join</p>
          <QRCodeScanner onScan={handleQRScan} onError={handleQRError} />
        </div>
        
        <div className="mt-6 text-center">
          <Link href="/" className="text-primary-600 hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}