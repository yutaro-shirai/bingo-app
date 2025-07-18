'use client';

import { useGame, useGameConnection, usePlayer } from '@/lib/stores';

/**
 * Example component demonstrating the use of game and player stores
 * This is for testing purposes and can be removed once the actual components are implemented
 */
export function StoreExample() {
  const { game, isGameActive, isGamePaused, lastDrawnNumber, drawnNumbersCount } = useGame();
  const { isConnected, isConnecting, connectionError } = useGameConnection();
  const { player, hasBingo, bingoLines } = usePlayer();

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Store Status</h2>
      
      {/* Connection Status */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Connection Status</h3>
        <div className="space-y-1 text-sm">
          <div>Connected: {isConnected ? '✅' : '❌'}</div>
          <div>Connecting: {isConnecting ? '⏳' : '❌'}</div>
          {connectionError && (
            <div className="text-red-600">Error: {connectionError}</div>
          )}
        </div>
      </div>

      {/* Game State */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Game State</h3>
        {game ? (
          <div className="space-y-1 text-sm">
            <div>Game ID: {game.id}</div>
            <div>Game Code: {game.code}</div>
            <div>Status: {game.status}</div>
            <div>Active: {isGameActive ? '✅' : '❌'}</div>
            <div>Paused: {isGamePaused ? '✅' : '❌'}</div>
            <div>Players: {game.playerCount} ({game.activePlayerCount} active)</div>
            <div>Bingo Count: {game.bingoCount}</div>
            <div>Numbers Drawn: {drawnNumbersCount}</div>
            {lastDrawnNumber && (
              <div>Last Number: {lastDrawnNumber}</div>
            )}
          </div>
        ) : (
          <div className="text-gray-500">No game data</div>
        )}
      </div>

      {/* Player State */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Player State</h3>
        {player ? (
          <div className="space-y-1 text-sm">
            <div>Player ID: {player.id}</div>
            <div>Name: {player.name}</div>
            <div>Online: {player.isOnline ? '✅' : '❌'}</div>
            <div>Has Bingo: {hasBingo ? '🎉' : '❌'}</div>
            <div>Punched Numbers: {player.punchedNumbers.length}</div>
            {bingoLines.length > 0 && (
              <div>
                Bingo Lines: {bingoLines.map(line => 
                  `${line.type}${line.index !== undefined ? ` ${line.index}` : ''}`
                ).join(', ')}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500">No player data</div>
        )}
      </div>
    </div>
  );
}