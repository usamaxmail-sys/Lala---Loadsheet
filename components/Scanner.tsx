import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, CheckCircle2 } from 'lucide-react';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  count: number;
}

export const Scanner: React.FC<ScannerProps> = ({ onScan, onClose, count }) => {
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(false);
  const lastCodeRef = useRef<string | null>(null);
  const lastCodeTimeRef = useRef<number>(0);

  useEffect(() => {
    mountedRef.current = true;
    const scannerId = "reader";

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
        if (mountedRef.current) {
            startScanner(scannerId);
        }
    }, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      if (scannerRef.current) {
         // We simply stop the scanner when component unmounts
        scannerRef.current.stop().then(() => {
            try {
                scannerRef.current?.clear();
            } catch(e) { /* ignore clear error */ }
        }).catch(err => console.warn("Failed to stop scanner", err));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startScanner = async (elementId: string) => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        // Prefer back camera
        const cameraId = devices.length > 1 ? devices[1].id : devices[0].id;
        
        const html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          cameraId,
          {
            fps: 15, // Higher FPS for smoother scanning
            qrbox: { width: 250, height: 250 },
            formatsToSupport: [
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.QR_CODE
            ],
            aspectRatio: 1.0
          },
          (decodedText) => {
            if (!mountedRef.current) return;

            const now = Date.now();
            // Prevent duplicate scans of the same code within 2 seconds
            if (decodedText === lastCodeRef.current && (now - lastCodeTimeRef.current < 2000)) {
                return;
            }

            lastCodeRef.current = decodedText;
            lastCodeTimeRef.current = now;
            
            // Visual feedback
            setLastScanned(decodedText);
            
            // Play a beep if possible (browsers often block this without interaction, but worth a try)
            // const audio = new Audio('/beep.mp3'); audio.play().catch(() => {});

            onScan(decodedText);

            // Clear visual feedback after 1.5s
            setTimeout(() => {
                if(mountedRef.current) setLastScanned(null);
            }, 1500);
          },
          (errorMessage) => {
            // ignore scan errors
          }
        );
      } else {
        setError("No cameras found.");
      }
    } catch (err) {
      if (mountedRef.current) {
        setError("Camera permission denied or error starting camera.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 bg-gradient-to-b from-black/70 to-transparent pb-12">
            <div className="text-white">
                <h3 className="font-semibold flex items-center gap-2 text-lg">
                    <Camera size={20} /> Scanning...
                </h3>
                <p className="text-sm text-gray-300">Keep camera pointed at barcodes</p>
            </div>
            <button 
                onClick={onClose} 
                className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-colors"
            >
                <X size={24} />
            </button>
        </div>

        {/* Big Counter Overlay */}
        <div className="absolute top-20 z-10 flex flex-col items-center animate-in slide-in-from-top-4">
            <div className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold text-4xl shadow-lg border-4 border-blue-400/50 backdrop-blur-sm">
                {count}
            </div>
            <span className="text-white/80 text-xs mt-1 font-medium bg-black/40 px-2 py-0.5 rounded-md">SHIPMENTS SCANNED</span>
        </div>

        {/* Scanner Viewport */}
        <div className="relative w-full h-full bg-black flex items-center justify-center">
            {error ? (
                <div className="text-red-400 p-8 text-center max-w-sm">
                    <div className="bg-red-900/30 p-4 rounded-xl border border-red-500/50">
                        {error}
                    </div>
                    <button onClick={onClose} className="mt-4 text-white underline">Close</button>
                </div>
            ) : (
                <>
                     {/* The HTML5 QR Code Scanner Element */}
                    <div id="reader" className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full"></div>
                    
                    {/* Visual Target Box (Overlay on top of video) */}
                    {!lastScanned && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1"></div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>

        {/* Last Scanned Feedback Overlay */}
        {lastScanned && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
                <div className="bg-green-500 text-white p-6 rounded-2xl shadow-2xl flex flex-col items-center transform scale-110">
                    <CheckCircle2 size={48} className="mb-2" />
                    <span className="text-2xl font-bold font-mono">{lastScanned}</span>
                    <span className="text-sm opacity-90">Scanned Successfully</span>
                </div>
            </div>
        )}

        {/* Bottom Instructions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent z-20 text-center">
            <p className="text-gray-300 font-medium">Processing scans automatically...</p>
        </div>
    </div>
  );
};
