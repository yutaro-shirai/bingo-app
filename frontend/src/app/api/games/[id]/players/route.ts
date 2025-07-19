import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/services/auth';

/**
 * GET /api/games/[id]/players
 * Get all players for a game (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const gameId = params.id;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Fetch players from backend
    const response = await fetch(`${backendUrl}/games/${gameId}/players`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to fetch players' },
        { status: response.status }
      );
    }

    const players = await response.json();
    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}