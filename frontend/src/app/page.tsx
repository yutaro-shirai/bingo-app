import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <h1 className="text-4xl md:text-6xl font-bold mb-6 text-primary-700">
        Bingo Web App
      </h1>
      <p className="text-xl mb-8 max-w-2xl">
        A mobile-first, installation-free Web Bingo game for up to 100 concurrent players,
        managed in real-time by administrators.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        <Link 
          href="/join" 
          className="btn btn-primary text-lg px-8 py-3"
        >
          Join Game
        </Link>
        <Link 
          href="/admin/login" 
          className="btn btn-outline text-lg px-8 py-3"
        >
          Admin Login
        </Link>
      </div>
      
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left w-full">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-3 text-primary-600">Easy to Join</h2>
          <p>Scan a QR code or enter a game code to join instantly. No account creation required.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-3 text-primary-600">Real-time Updates</h2>
          <p>Experience seamless gameplay with instant number updates and automatic reconnection.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-3 text-primary-600">Mobile Optimized</h2>
          <p>Designed for mobile devices with responsive layouts and touch-friendly controls.</p>
        </div>
      </div>
    </div>
  );
}
