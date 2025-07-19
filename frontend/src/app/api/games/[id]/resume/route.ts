import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/services/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const gameId = params.id;
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/games/${gameId}/resume`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { message: errorData.message || 'Failed to resume game' },
        { status: response.status }
      );
    }

    const game = await response.json();
    return NextResponse.json(game);
  } catch (error) {
    console.error('Error resuming game:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}