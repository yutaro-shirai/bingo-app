import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function JoinPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-primary-700">Join Bingo Game</h1>
        
        <form className="space-y-4">
          <div>
            <label htmlFor="gameCode" className="block text-sm font-medium mb-1">
              Game Code
            </label>
            <input
              id="gameCode"
              type="text"
              placeholder="Enter game code"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium mb-1">
              Your Name
            </label>
            <input
              id="playerName"
              type="text"
              placeholder="Enter your name"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <Button className="w-full">
            Join Game
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-2">Or scan a QR code to join</p>
          <div className="bg-gray-100 p-4 rounded-md flex items-center justify-center">
            <div className="text-center text-gray-500">QR Scanner will appear here</div>
          </div>
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