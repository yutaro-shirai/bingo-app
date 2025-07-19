import { useState, useEffect } from 'react';
import { useGame } from '@/lib/stores/gameStore';
import { Player } from 'shared/types';

interface PlayerMonitoringDashboardProps {
  gameId: string;
}

export default function PlayerMonitoringDashboard({ gameId }: PlayerMonitoringDashboardProps) {
  const { game } = useGame();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'bingo'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Fetch players data
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/games/${gameId}/players`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch players');
        }

        const playersData = await response.json();
        setPlayers(playersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayers();
    
    // Set up polling for player updates
    const intervalId = setInterval(fetchPlayers, 10000); // Poll every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [gameId]);

  // Sort players
  const sortedPlayers = [...players].sort((a, b) => {
    if (sortBy === 'name') {
      return sortDirection === 'asc' 
        ? a.name.localeCompare(b.name) 
        : b.name.localeCompare(a.name);
    } else if (sortBy === 'status') {
      if (sortDirection === 'asc') {
        return a.isOnline === b.isOnline ? 0 : a.isOnline ? -1 : 1;
      } else {
        return a.isOnline === b.isOnline ? 0 : a.isOnline ? 1 : -1;
      }
    } else if (sortBy === 'bingo') {
      if (sortDirection === 'asc') {
        return a.hasBingo === b.hasBingo 
          ? (a.bingoAchievedAt && b.bingoAchievedAt 
              ? a.bingoAchievedAt.getTime() - b.bingoAchievedAt.getTime() 
              : 0) 
          : a.hasBingo ? -1 : 1;
      } else {
        return a.hasBingo === b.hasBingo 
          ? (a.bingoAchievedAt && b.bingoAchievedAt 
              ? b.bingoAchievedAt.getTime() - a.bingoAchievedAt.getTime() 
              : 0) 
          : a.hasBingo ? 1 : -1;
      }
    }
    return 0;
  });

  // Calculate statistics
  const totalPlayers = players.length;
  const onlinePlayers = players.filter(player => player.isOnline).length;
  const playersWithBingo = players.filter(player => player.hasBingo).length;
  
  // Calculate players close to bingo (4 numbers away from bingo)
  const playersCloseToBingo = players.filter(player => {
    if (player.hasBingo) return false;
    
    const grid = player.card.grid;
    const punchedNumbers = player.punchedNumbers;
    const size = 5;
    
    // Create a boolean grid of punched positions
    const punchedGrid: boolean[][] = Array(size)
      .fill(null)
      .map(() => Array(size).fill(false));
    
    // Mark punched positions
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const cellValue = grid[row][col];
        if (punchedNumbers.includes(cellValue)) {
          punchedGrid[row][col] = true;
        }
      }
    }
    
    // Handle free space if it exists
    if (player.card.freeSpace) {
      punchedGrid[player.card.freeSpace.row][player.card.freeSpace.col] = true;
    }
    
    // Check rows
    for (let row = 0; row < size; row++) {
      const punchedCount = punchedGrid[row].filter(Boolean).length;
      if (punchedCount >= 4) return true;
    }
    
    // Check columns
    for (let col = 0; col < size; col++) {
      let punchedCount = 0;
      for (let row = 0; row < size; row++) {
        if (punchedGrid[row][col]) punchedCount++;
      }
      if (punchedCount >= 4) return true;
    }
    
    // Check diagonal (top-left to bottom-right)
    let diag1PunchedCount = 0;
    for (let i = 0; i < size; i++) {
      if (punchedGrid[i][i]) diag1PunchedCount++;
    }
    if (diag1PunchedCount >= 4) return true;
    
    // Check diagonal (top-right to bottom-left)
    let diag2PunchedCount = 0;
    for (let i = 0; i < size; i++) {
      if (punchedGrid[i][size - 1 - i]) diag2PunchedCount++;
    }
    if (diag2PunchedCount >= 4) return true;
    
    return false;
  }).length;

  // Handle sort change
  const handleSortChange = (column: 'name' | 'status' | 'bingo') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow p-6 mt-6">
      <h2 className="text-xl font-semibold mb-4">Player Monitoring</h2>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
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
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-blue-800">Total Players</h3>
              <p className="text-2xl font-bold text-blue-900">{totalPlayers}</p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-green-800">Online Players</h3>
              <p className="text-2xl font-bold text-green-900">{onlinePlayers}</p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-purple-800">Players with Bingo</h3>
              <p className="text-2xl font-bold text-purple-900">{playersWithBingo}</p>
            </div>
            
            <div className="bg-amber-50 rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-amber-800">Close to Bingo</h3>
              <p className="text-2xl font-bold text-amber-900">{playersCloseToBingo}</p>
            </div>
          </div>
          
          {/* Players Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange('name')}
                  >
                    <div className="flex items-center">
                      Player Name
                      {sortBy === 'name' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange('status')}
                  >
                    <div className="flex items-center">
                      Status
                      {sortBy === 'status' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange('bingo')}
                  >
                    <div className="flex items-center">
                      Bingo Status
                      {sortBy === 'bingo' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedPlayers.map((player) => (
                  <tr key={player.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{player.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        player.isOnline 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {player.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {player.hasBingo ? (
                        <div>
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            Bingo!
                          </span>
                          {player.bingoAchievedAt && (
                            <span className="ml-2 text-xs text-gray-500">
                              {new Date(player.bingoAchievedAt).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No bingo yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(player.lastSeenAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
                
                {players.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No players have joined this game yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}