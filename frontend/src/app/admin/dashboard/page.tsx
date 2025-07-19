'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/services';
import { ProtectedRoute } from '@/components/ui/ProtectedRoute';
import GameCreationForm from '@/components/admin/GameCreationForm';

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const [showGameCreationForm, setShowGameCreationForm] = useState(false);
  const [createdGames, setCreatedGames] = useState<Array<{ id: string; code: string }>>([]);

  const handleGameCreated = (gameId: string, gameCode: string) => {
    setCreatedGames((prev) => [...prev, { id: gameId, code: gameCode }]);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Admin Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.username}
              </span>
              <button
                onClick={logout}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="rounded-lg border border-gray-200 bg-white shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Game Management</h2>
                
                {showGameCreationForm ? (
                  <div className="mb-8">
                    <GameCreationForm onGameCreated={handleGameCreated} />
                    <div className="mt-4">
                      <button
                        onClick={() => setShowGameCreationForm(false)}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        Hide form
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-8">
                    <p className="text-gray-600 mb-4">
                      Create and manage bingo games from this dashboard. You can create a new game, monitor active games, or view game history.
                    </p>
                    <button
                      onClick={() => setShowGameCreationForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Create New Game
                    </button>
                  </div>
                )}
                
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {createdGames.length > 0 && (
                    <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                      <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium text-gray-900">Recently Created Games</h3>
                        <ul className="mt-3 divide-y divide-gray-100">
                          {createdGames.map((game) => (
                            <li key={game.id} className="py-3">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">Game Code: {game.code}</p>
                                <a
                                  href={`/admin/game/${game.id}`}
                                  className="text-sm text-indigo-600 hover:text-indigo-900"
                                >
                                  Manage
                                </a>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg font-medium text-gray-900">Manage Active Games</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        View and control your currently active bingo games.
                      </p>
                      <div className="mt-4">
                        {createdGames.length > 0 ? (
                          <div className="space-y-3">
                            {createdGames.map((game) => (
                              <a
                                key={game.id}
                                href={`/admin/game/${game.id}`}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                Manage Game {game.code}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No active games. Create a new game to get started.</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg font-medium text-gray-900">Game History</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        View statistics and results from past games.
                      </p>
                      <div className="mt-4">
                        <button
                          type="button"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          View History
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}