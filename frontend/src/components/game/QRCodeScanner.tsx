import React, { useEffect, useRef, useState } from 'react';
// Import jsQR - Note: This requires the jsQR library to be installed
// npm install jsqr --save
import jsQR from 'jsqr';

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
    try {
      // Use jsQR to detect QR code from image data
      const code = jsQR(
        imageData.data,
        imageData.width,
        imageData.height,
        {
          inversionAttempts: "dontInvert", // Try normal mode only to improve performance
        }
      );
      
      // If a QR code is found
      if (code) {
        console.log('QR code detected:', code.data);
        
        // Stop scanning and call the onScan callback with the detected code
        stopScanner();
        onScan(code.data);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error detecting QR code:', error);
      if (onError) {
        onError('Failed to process QR code: ' + (error instanceof Error ? error.message : String(error)));
      }
      return false;
    }
  };
  
  // Function to capture frames from the video stream
  const captureFrame = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
      try {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the current video frame to the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get the image data from the canvas - focus on the center area for better performance
        const centerSize = Math.min(canvas.width, canvas.height) * 0.7; // 70% of the smaller dimension
        const centerX = (canvas.width - centerSize) / 2;
        const centerY = (canvas.height - centerSize) / 2;
        
        const imageData = context.getImageData(centerX, centerY, centerSize, centerSize);
        
        // Try to detect QR code
        const detected = detectQRCode(imageData);
        
        // Draw scanning indicator
        if (!detected) {
          // Draw a scanning indicator on the canvas
          context.strokeStyle = '#00FF00';
          context.lineWidth = 4;
          context.beginPath();
          context.rect(centerX, centerY, centerSize, centerSize);
          context.stroke();
        }
      } catch (error) {
        console.error('Error capturing frame:', error);
        if (onError) {
          onError('Error processing camera feed: ' + (error instanceof Error ? error.message : String(error)));
        }
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
      
      // Check if the browser is running in a secure context (HTTPS or localhost)
      if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && 
          window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        throw new Error('Camera access requires a secure connection (HTTPS)');
      }
      
      // Request camera access with specific constraints for better QR scanning
      const constraints = {
        video: {
          facingMode: 'environment', // Use the back camera if available
          width: { ideal: 1280 },    // Request HD resolution if available
          height: { ideal: 720 },
          aspectRatio: { ideal: 1 }, // Square aspect ratio works well for QR codes
        }
      };
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
        .catch(err => {
          // If the ideal constraints fail, try with minimal constraints
          if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
            console.warn('Ideal camera constraints not available, trying with basic constraints');
            return navigator.mediaDevices.getUserMedia({ video: true });
          }
          throw err;
        });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setHasPermission(true);
          setIsScanning(true);
          requestAnimationFrame(captureFrame);
        };
      }
    } catch (error) {
      console.error('Error starting scanner:', error);
      setHasPermission(false);
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to access camera';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Camera access denied. Please allow camera access in your browser settings.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = 'No camera found on this device.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = 'Camera is already in use by another application.';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
          errorMessage = 'Camera does not meet the required constraints.';
        } else if (error.name === 'TypeError') {
          errorMessage = 'Invalid camera constraints.';
        } else {
          errorMessage = error.message || errorMessage;
        }
      }
      
      setErrorMessage(errorMessage);
      if (onError) onError(errorMessage);
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
          className="mb-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors w-full"
          aria-label={isScanning ? "Stop QR code scanner" : "Start QR code scanner"}
        >
          {isScanning ? 'Stop Scanner' : 'Scan QR Code'}
        </button>
        
        {/* Video element for camera feed */}
        <div className={`relative ${isScanning ? 'block' : 'hidden'}`}>
          <div className="text-center text-sm text-primary-600 mb-2">
            Point your camera at a Bingo game QR code
          </div>
          
          <div className="relative aspect-square overflow-hidden rounded-md">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover rounded-md"
              autoPlay
              playsInline
              muted
            />
            
            {/* Scanning overlay with animation */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Scanning target area */}
                <div className="w-3/4 h-3/4 border-2 border-primary-500 rounded-md relative">
                  {/* Scanning line animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-primary-500 animate-scan-line"></div>
                  
                  {/* Corner markers for better visual guidance */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary-500"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary-500"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary-500"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary-500"></div>
                </div>
              </div>
            </div>
            
            {/* Hidden canvas for processing frames */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          
          {/* Scanning status indicator */}
          <div className="text-center text-sm mt-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1"></span>
            Scanning...
          </div>
        </div>
        
        {/* Permission and error states */}
        {hasPermission === false && (
          <div className="text-center text-red-500 my-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {errorMessage || 'Camera permission denied. Please allow camera access.'}
            
            <div className="mt-2 text-sm">
              <button 
                onClick={startScanner} 
                className="text-primary-600 underline"
                aria-label="Try again with camera access"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
        
        {!isScanning && hasPermission !== false && (
          <div className="text-center text-gray-600 my-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Click "Scan QR Code&quot; to join a game using your camera
          </div>
        )}
        
        {/* Manual code input */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Or enter a game code manually:</p>
          <form onSubmit={handleManualInput} className="flex">
            <input
              type="text"
              name="manualGameCode"
              placeholder="Enter game code"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Game code input field"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 transition-colors"
              aria-label="Submit game code"
            >
              Join
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;