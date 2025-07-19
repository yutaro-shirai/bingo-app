import React, { useEffect, useRef, useState } from 'react';

interface QRCodeScannerProps {
  onScan: (gameCode: string) => void;
  onError?: (error: string) => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Function to handle QR code detection
  const detectQRCode = (imageData: ImageData) => {
    // TODO: Integrate with a QR code detection library
    // This is where we would use a QR code detection library like jsQR or ZXing
    // Example implementation with jsQR would be:
    // 
    // import jsQR from 'jsqr';
    // const code = jsQR(imageData.data, imageData.width, imageData.height);
    // if (code) {
    //   onScan(code.data);
    // }
    
    // For now, we'll just log that we're trying to detect a QR code
    console.log('Attempting to detect QR code from frame');
    
    // For testing purposes, you can uncomment this line to simulate a successful scan
    // setTimeout(() => onScan('TEST123'), 5000);
  };
  
  // Function to capture frames from the video stream
  const captureFrame = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get the image data from the canvas
      try {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        detectQRCode(imageData);
      } catch (error) {
        console.error('Error capturing frame:', error);
      }
    }
    
    // Continue scanning
    if (isScanning) {
      requestAnimationFrame(captureFrame);
    }
  };
  
  // Start the scanner
  const startScanner = async () => {
    try {
      setErrorMessage(null);
      
      // Check if MediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera access');
      }
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use the back camera if available
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasPermission(true);
        setIsScanning(true);
        requestAnimationFrame(captureFrame);
      }
    } catch (error) {
      console.error('Error starting scanner:', error);
      setHasPermission(false);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to access camera');
      if (onError) onError(error instanceof Error ? error.message : 'Failed to access camera');
    }
  };
  
  // Stop the scanner
  const stopScanner = () => {
    setIsScanning(false);
    
    // Stop all video tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  
  // Toggle scanner
  const toggleScanner = () => {
    if (isScanning) {
      stopScanner();
    } else {
      startScanner();
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);
  
  // Handle manual game code input for testing
  const handleManualInput = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const gameCode = formData.get('manualGameCode') as string;
    if (gameCode) {
      onScan(gameCode);
    }
  };
  
  return (
    <div className="qr-scanner">
      <div className="relative bg-gray-100 p-4 rounded-md">
        {/* Scanner toggle button */}
        <button
          type="button"
          onClick={toggleScanner}
          className="mb-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          {isScanning ? 'Stop Scanner' : 'Start Scanner'}
        </button>
        
        {/* Video element for camera feed */}
        <div className={`relative ${isScanning ? 'block' : 'hidden'}`}>
          <video
            ref={videoRef}
            className="w-full h-auto rounded-md"
            autoPlay
            playsInline
            muted
          />
          
          {/* Scanning overlay */}
          <div className="absolute inset-0 border-2 border-primary-500 rounded-md pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-primary-500 rounded-md"></div>
            </div>
          </div>
          
          {/* Hidden canvas for processing frames */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        
        {/* Permission and error states */}
        {hasPermission === false && (
          <div className="text-center text-red-500 my-2">
            {errorMessage || 'Camera permission denied. Please allow camera access.'}
          </div>
        )}
        
        {!isScanning && hasPermission !== false && (
          <div className="text-center text-gray-500 my-2">
            Click "Start Scanner&quot; to scan a QR code
          </div>
        )}
        
        {/* Manual code input for testing */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Or enter a game code manually:</p>
          <form onSubmit={handleManualInput} className="flex">
            <input
              type="text"
              name="manualGameCode"
              placeholder="Enter game code"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 transition-colors"
            >
              Go
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;