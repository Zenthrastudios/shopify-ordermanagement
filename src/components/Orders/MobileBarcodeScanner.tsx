import { useEffect, useRef, useState } from 'react';
import Quagga from 'quagga';
import { Camera, X, AlertCircle, ScanLine, Edit2, Check, Keyboard } from 'lucide-react';

interface MobileBarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  currentOrderNumber: string;
  progress: string;
}

export default function MobileBarcodeScanner({
  onScan,
  onClose,
  currentOrderNumber,
  progress,
}: MobileBarcodeScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showManualEntry) {
      const timer = setTimeout(() => {
        startCamera();
      }, 100);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    }
  }, [showManualEntry]);

  const startCamera = async () => {
    try {
      setError(null);
      setCameraReady(false);

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setTimeout(() => {
              setCameraReady(true);
            }, 500);
          }).catch((err) => {
            console.error('Error playing video:', err);
            setError('Camera failed to start. Please use manual entry.');
          });
        }
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Camera access denied. Please use manual entry below.');
      setShowManualEntry(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing || !cameraReady) return;

    try {
      setIsProcessing(true);
      setError(null);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Could not get canvas context');
      }

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('Video not ready');
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(imageDataUrl);

      navigator.vibrate?.(100);

      Quagga.decodeSingle({
        src: imageDataUrl,
        numOfWorkers: 0,
        locate: true,
        inputStream: {
          size: canvas.width
        },
        locator: {
          patchSize: 'medium',
          halfSample: true
        },
        decoder: {
          readers: [
            'code_128_reader',
            'ean_reader',
            'ean_8_reader',
            'code_39_reader',
            'code_39_vin_reader',
            'codabar_reader',
            'upc_reader',
            'upc_e_reader',
            'i2of5_reader',
            '2of5_reader',
            'code_93_reader'
          ]
        }
      }, (result) => {
        setIsProcessing(false);
        if (result && result.codeResult && result.codeResult.code) {
          setScannedCode(result.codeResult.code);
          navigator.vibrate?.(200);
        } else {
          setError('No barcode detected. Try again with better lighting or use manual entry.');
          setCapturedImage('');
        }
      });

    } catch (err) {
      console.error('Error during capture:', err);
      setError('Failed to scan. Try again or use manual entry.');
      setCapturedImage('');
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleConfirm = () => {
    if (scannedCode.trim()) {
      onScan(scannedCode.trim());
      setScannedCode('');
      setCapturedImage('');
      setIsEditing(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setScannedCode('');
    setCapturedImage('');
    setIsEditing(false);
    setError(null);
  };

  const handleManualEntry = () => {
    setShowManualEntry(true);
    stopCamera();
  };

  const handleManualConfirm = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
      setShowManualEntry(false);
    }
  };

  const handleBackToCamera = () => {
    setShowManualEntry(false);
    setManualCode('');
    setError(null);
  };

  if (showManualEntry) {
    return (
      <div className="fixed inset-0 bg-black z-[100] flex flex-col">
        <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-green-400" />
            <div>
              <h3 className="font-semibold">Manual Entry</h3>
              <p className="text-sm text-gray-300">{progress}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-start bg-black p-4 overflow-auto">
          <div className="w-full max-w-lg space-y-4">
            <div className="bg-blue-600 text-white rounded-lg p-4 text-center">
              <p className="text-sm mb-1">Scanning for Order</p>
              <p className="text-3xl font-bold">#{currentOrderNumber}</p>
            </div>

            <div className="bg-gray-900 text-white rounded-lg p-6 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold mb-2 block">Enter Tracking Number</span>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type tracking number"
                  autoFocus
                />
              </label>

              <div className="flex gap-2">
                <button
                  onClick={handleBackToCamera}
                  className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Use Camera
                </button>
                <button
                  onClick={handleManualConfirm}
                  disabled={!manualCode.trim()}
                  className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-700 disabled:text-gray-400 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Confirm
                </button>
              </div>
            </div>

            <div className="bg-gray-900 text-white rounded-lg p-4">
              <p className="font-semibold mb-2">Instructions:</p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>Type the tracking number exactly as it appears</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>Double-check for accuracy before confirming</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>Switch back to camera scanning if needed</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Camera className="w-6 h-6 text-green-400" />
          <div>
            <h3 className="font-semibold">Scan Tracking Number</h3>
            <p className="text-sm text-gray-300">{progress}</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start bg-black p-4 overflow-auto">
        <div className="w-full max-w-lg space-y-4">
          <div className="bg-blue-600 text-white rounded-lg p-4 text-center">
            <p className="text-sm mb-1">Scanning for Order</p>
            <p className="text-3xl font-bold">#{currentOrderNumber}</p>
          </div>

          {error && (
            <div className="bg-red-500 text-white rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {!capturedImage && !scannedCode && (
            <div
              ref={containerRef}
              className="relative bg-gray-900 rounded-lg overflow-hidden shadow-2xl"
              style={{ minHeight: '400px' }}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                style={{ display: 'block', minHeight: '400px' }}
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-white text-center p-6">
                    <Camera className="w-16 h-16 animate-pulse mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-semibold mb-2">Starting camera...</p>
                    <p className="text-sm text-gray-400">This may take a few seconds</p>
                    <button
                      onClick={handleManualEntry}
                      className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Use Manual Entry Instead
                    </button>
                  </div>
                </div>
              )}
              {cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-4 border-dashed border-green-400 rounded-lg" style={{ width: '80%', height: '50%' }}>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap">
                      Position barcode here
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {capturedImage && !scannedCode && (
            <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
              <img src={capturedImage} alt="Captured" className="w-full h-auto" />
              {isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                  <div className="text-white text-center">
                    <ScanLine className="w-12 h-12 animate-pulse mx-auto mb-2" />
                    <p className="text-sm">Analyzing barcode...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {!scannedCode && (
            <div className="space-y-2">
              <button
                onClick={captureAndScan}
                disabled={isProcessing || !cameraReady}
                className={`w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-3 transition-all ${
                  isProcessing || !cameraReady
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
                }`}
              >
                <ScanLine className={`w-6 h-6 ${isProcessing ? 'animate-pulse' : ''}`} />
                {isProcessing ? 'Processing...' : !cameraReady ? 'Waiting for camera...' : 'Scan Barcode'}
              </button>

              <button
                onClick={handleManualEntry}
                className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 bg-gray-800 text-white hover:bg-gray-700 transition-colors"
              >
                <Keyboard className="w-5 h-5" />
                Manual Entry
              </button>
            </div>
          )}

          {scannedCode && (
            <div className="bg-gray-900 text-white rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  <p className="font-semibold">Tracked Code</p>
                </div>
                {!isEditing && (
                  <button
                    onClick={handleEdit}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-blue-400" />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={scannedCode}
                    onChange={(e) => setScannedCode(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter tracking number"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={!scannedCode.trim()}
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-700 disabled:text-gray-400"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="font-mono text-lg break-all text-center text-green-400">
                      {scannedCode}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Confirm & Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-gray-900 text-white rounded-lg p-4">
            <p className="font-semibold mb-2">Instructions:</p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Position barcode within camera view with good lighting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Tap "Scan Barcode" to capture and detect code</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Use "Manual Entry" if camera scanning fails</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Supports Code 128, EAN, UPC, Code 39, and more</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
