import React, { useState } from 'react';
import { useAuth } from '@/lib/services';
import { DrawMode } from 'shared';

interface GameCreationFormProps {
  onGameCreated?: (gameId: string, gameCode: string) => void;
}

export default function GameCreationForm({ onGameCreated }: GameCreationFormProps) {
  const { getAuthToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [gameData, setGameData] = useState<{
    id: string;
    code: string;
    joinUrl: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    drawMode: DrawMode.MANUAL,
    drawInterval: 30, // Default 30 seconds
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'drawInterval') {
      setFormData({
        ...formData,
        [name]: parseInt(value, 10),
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const payload = {
        drawMode: formData.drawMode,
        drawInterval: formData.drawMode === DrawMode.TIMED ? formData.drawInterval : null,
      };

      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create game');
      }

      const game = await response.json();
      const joinUrl = `${window.location.origin}/join?code=${game.code}`;
      
      setGameData({
        id: game.id,
        code: game.code,
        joinUrl,
      });
      
      setSuccess(true);
      
      if (onGameCreated) {
        onGameCreated(game.id, game.code);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Create New Bingo Game</h3>
        
        {!success ? (
          <form onSubmit={handleSubmit} className="mt-5 space-y-6">
            <div>
              <label htmlFor="drawMode" className="block text-sm font-medium text-gray-700">
                Draw Mode
              </label>
              <select
                id="drawMode"
                name="drawMode"
                value={formData.drawMode}
                onChange={handleInputChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value={DrawMode.MANUAL}>Manual (Draw numbers yourself)</option>
                <option value={DrawMode.TIMED}>Timed (Automatic drawing)</option>
              </select>
            </div>

            {formData.drawMode === DrawMode.TIMED && (
              <div>
                <label htmlFor="drawInterval" className="block text-sm font-medium text-gray-700">
                  Draw Interval (seconds)
                </label>
                <input
                  type="number"
                  name="drawInterval"
                  id="drawInterval"
                  min="5"
                  max="300"
                  value={formData.drawInterval}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Game'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-5">
            <div className="rounded-md bg-green-50 p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Game Created Successfully</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Your game has been created and is ready for players to join.</p>
                  </div>
                </div>
              </div>
            </div>

            {gameData && (
              <div className="border border-gray-200 rounded-md p-6 bg-gray-50">
                <div className="flex flex-col items-center sm:flex-row sm:justify-between">
                  <div className="mb-6 sm:mb-0">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Game Code</h4>
                    <div className="text-3xl font-bold tracking-wide text-indigo-600 mb-2">
                      {gameData.code}
                    </div>
                    <p className="text-sm text-gray-500">
                      Share this code with players to join the game
                    </p>
                    
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(gameData.joinUrl)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Copy Join Link
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">QR Code</h4>
                    <div className="p-2 bg-white border border-gray-200 rounded-md">
                      {/* QR code placeholder - in production, use a QR code library */}
                      <div className="w-[150px] h-[150px] bg-gray-100 flex items-center justify-center">
                        <div className="text-center text-sm text-gray-500">
                          <p>QR Code for</p>
                          <p className="font-medium">{gameData.code}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Scan to join the game
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <a
                    href={`/admin/game/${gameData.id}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Manage Game
                  </a>
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setGameData(null);
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Another Game
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}