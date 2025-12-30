import React, { useState, useEffect, useRef } from 'react';
import { Trash2, FileText, Scan, CheckCircle, Keyboard, X, AlertOctagon, Settings, Monitor, Download, Plus, History } from 'lucide-react';
import { CourierType, ScannedShipment, ApiCredentials, LeopardsLoadsheetResponse } from '../types';
import { Scanner } from './Scanner';
import { Button } from './Button';
import { generateLeopardsLoadsheet, generatePostExLoadsheet, downloadLeopardsPDF } from '../services/api';

interface LoadsheetManagerProps {
  courier: CourierType;
  credentials: ApiCredentials;
  onBack: () => void;
  onOpenSettings: () => void;
  showNotification: (type: 'success' | 'error' | 'warning', msg: string) => void;
}

export const LoadsheetManager: React.FC<LoadsheetManagerProps> = ({ 
  courier, 
  credentials, 
  onBack,
  onOpenSettings,
  showNotification
}) => {
  const [shipments, setShipments] = useState<ScannedShipment[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // New States for Success/Download flow
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [processedHistory, setProcessedHistory] = useState<Set<string>>(new Set());

  const manualInputRef = useRef<HTMLInputElement>(null);
  const lastKeyTimeRef = useRef<number>(0);
  const barcodeBufferRef = useRef<string>('');
  
  // Ref to access current state in event listeners
  const shipmentsRef = useRef(shipments);
  const processedHistoryRef = useRef(processedHistory);

  // Sync refs
  useEffect(() => {
    shipmentsRef.current = shipments;
  }, [shipments]);
  
  useEffect(() => {
    processedHistoryRef.current = processedHistory;
  }, [processedHistory]);

  // Load history on mount
  useEffect(() => {
    try {
        const savedHistory = localStorage.getItem('processed_shipments_history');
        if (savedHistory) {
            setProcessedHistory(new Set(JSON.parse(savedHistory)));
        }
    } catch (e) {
        console.error("Failed to load shipment history", e);
    }
  }, []);

  // Save history helper
  const updateHistory = (newCodes: string[]) => {
      const newSet = new Set([...processedHistory, ...newCodes]);
      setProcessedHistory(newSet);
      localStorage.setItem('processed_shipments_history', JSON.stringify(Array.from(newSet)));
  };

  // Check credentials on mount
  useEffect(() => {
    const isLeopards = courier === CourierType.LEOPARDS;
    const hasLeopardsCreds = !!(credentials.leopardsApiKey && credentials.leopardsApiPassword);
    const hasPostExCreds = !!credentials.postExToken;

    if (isLeopards && !hasLeopardsCreds) {
        showNotification('error', 'Please configure Leopards API credentials first.');
        onOpenSettings();
    } else if (!isLeopards && !hasPostExCreds) {
        showNotification('error', 'Please configure PostEx API Token first.');
        onOpenSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global Keyboard Listener for Physical Scanners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (generatedPdfUrl) return; // Disable scanning when in success screen
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;
      
      if (timeSinceLastKey > 100) {
        barcodeBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length > 2) {
          processTrackingNumber(barcodeBufferRef.current);
          barcodeBufferRef.current = '';
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generatedPdfUrl]); 

  const triggerVibration = (type: 'success' | 'error') => {
    if (navigator.vibrate) {
        if (type === 'success') {
            navigator.vibrate(100);
        } else {
            navigator.vibrate([100, 50, 100]);
        }
    }
  };

  const processTrackingNumber = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // 1. Check current session duplicates
    const existsInSession = shipmentsRef.current.find(s => s.trackingNumber === cleanCode);
    if (existsInSession) {
      triggerVibration('error');
      showNotification('warning', `Duplicate: ${cleanCode} already in list!`);
      return;
    }

    // 2. Check global history duplicates
    if (processedHistoryRef.current.has(cleanCode)) {
        triggerVibration('error');
        showNotification('error', `Rejected: ${cleanCode} was already generated in a previous loadsheet.`);
        return;
    }

    // 3. Add to list
    const newShipment: ScannedShipment = {
      id: crypto.randomUUID(),
      trackingNumber: cleanCode,
      timestamp: Date.now()
    };

    setShipments(prev => [newShipment, ...prev]);
    triggerVibration('success');
    showNotification('success', `Added: ${cleanCode}`);
  };

  const handleScan = (code: string) => {
    processTrackingNumber(code);
    // Note: We do NOT close the scanner here. It stays open for continuous scanning.
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processTrackingNumber(manualCode);
    setManualCode('');
    manualInputRef.current?.focus();
  };

  const handleDelete = (id: string) => {
    setShipments(prev => prev.filter(s => s.id !== id));
  };

  const handleGenerate = async () => {
    setShowConfirm(false);
    if (shipments.length === 0) return;
    setIsLoading(true);

    const trackingNumbers = shipments.map(s => s.trackingNumber);

    try {
      let blob: Blob;

      if (courier === CourierType.LEOPARDS) {
        const result: LeopardsLoadsheetResponse = await generateLeopardsLoadsheet(credentials, trackingNumbers);
        if (result.status === 1 && result.load_sheet_id) {
            blob = await downloadLeopardsPDF(credentials, result.load_sheet_id);
        } else {
            throw new Error(result.error || "Leopards API returned an error.");
        }
      } else {
        // PostEx
        blob = await generatePostExLoadsheet(credentials, trackingNumbers);
      }

      // Success Flow
      const url = window.URL.createObjectURL(blob);
      setGeneratedPdfUrl(url); // Store PDF for download
      updateHistory(trackingNumbers); // Add to history so they can't be scanned again
      setShipments([]); // Clear current list
      showNotification('success', 'Loadsheet generated successfully!');

    } catch (error: any) {
      triggerVibration('error');
      showNotification('error', error.message || "Failed to generate loadsheet.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (generatedPdfUrl) {
        const a = document.createElement('a');
        a.href = generatedPdfUrl;
        a.download = `${courier.toLowerCase()}-loadsheet-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
  };

  const handleStartNew = () => {
    if (generatedPdfUrl) {
        window.URL.revokeObjectURL(generatedPdfUrl);
    }
    setGeneratedPdfUrl(null);
    setShipments([]);
  };

  // SUCCESS VIEW
  if (generatedPdfUrl) {
    return (
        <div className="flex flex-col h-[calc(100vh-64px)] items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={48} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Loadsheet Generated!</h2>
            <p className="text-gray-500 mt-2 max-w-xs mx-auto">
                The loadsheet has been successfully created and the shipments have been recorded.
            </p>

            <div className="mt-8 space-y-3 w-full max-w-xs">
                <Button onClick={handleDownloadPdf} className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 shadow-md">
                    <Download className="mr-2" /> Download PDF
                </Button>
                <Button onClick={handleStartNew} variant="secondary" className="w-full h-12 text-lg">
                    <Plus className="mr-2" /> Start New Sheet
                </Button>
            </div>
        </div>
    );
  }

  // MAIN LIST VIEW
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] relative">
      {/* Header */}
      <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {courier === CourierType.LEOPARDS ? <span className="text-orange-600">Leopards</span> : <span className="text-blue-600">PostEx</span>} 
            Loadsheet
          </h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
             <span className="font-medium bg-gray-100 px-2 py-0.5 rounded-full">{shipments.length} Ready</span>
             <span className="text-gray-300">|</span>
             <span className="flex items-center gap-1"><History size={10}/> {processedHistory.size} in history</span>
          </div>
        </div>
        <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onOpenSettings}>
                <Settings size={18} />
            </Button>
            <Button variant="secondary" size="sm" onClick={onBack}>
                Exit
            </Button>
        </div>
      </div>

      {/* Manual Input Area */}
      {showManualInput && (
        <div className="p-3 bg-white border-b animate-in slide-in-from-top-2 z-10">
            <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                    ref={manualInputRef}
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter Tracking Number"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                />
                <Button type="submit" disabled={!manualCode}>Add</Button>
                <Button type="button" variant="ghost" onClick={() => setShowManualInput(false)}>
                    <X size={20} />
                </Button>
            </form>
        </div>
      )}

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 pb-24">
        {shipments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
            <div className="bg-gray-100 p-6 rounded-full relative group">
                <Scan size={48} className="opacity-40" />
                <div className="absolute -bottom-2 -right-2 bg-blue-100 text-blue-600 p-1.5 rounded-full">
                    <Monitor size={16} />
                </div>
            </div>
            <div className="text-center">
                <p className="font-medium text-gray-600">No shipments added yet</p>
                <p className="text-sm text-gray-400 mt-1 max-w-[200px]">
                    Use your physical scanner, camera, or enter manually.
                </p>
            </div>
            <div className="flex gap-3">
                <Button onClick={() => setIsScanning(true)} variant="primary" className="shadow-lg">
                    <Scan size={18} className="mr-2"/> Scan Camera
                </Button>
                <Button onClick={() => setShowManualInput(true)} variant="secondary">
                    <Keyboard size={18} className="mr-2"/> Manual
                </Button>
            </div>
          </div>
        ) : (
          shipments.map((shipment, index) => (
            <div key={shipment.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 text-slate-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-inner">
                  {shipments.length - index}
                </div>
                <div>
                  <p className="font-mono font-bold text-gray-800 text-lg tracking-wide">{shipment.trackingNumber}</p>
                  <p className="text-xs text-gray-400">{new Date(shipment.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(shipment.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Bottom Actions */}
      <div className="p-4 bg-white border-t absolute bottom-0 w-full shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
        <div className="grid grid-cols-2 gap-3">
            <div className="flex gap-2">
                <Button 
                    variant="secondary" 
                    className="flex-1"
                    onClick={() => setIsScanning(true)}
                    disabled={isLoading}
                    title="Open Camera"
                >
                    <Scan size={20} />
                </Button>
                <Button 
                    variant="secondary" 
                    className="flex-1"
                    onClick={() => {
                        setShowManualInput(true);
                        setTimeout(() => manualInputRef.current?.focus(), 100);
                    }}
                    disabled={isLoading}
                    title="Manual Entry"
                >
                    <Keyboard size={20} />
                </Button>
            </div>
          
          <Button 
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setShowConfirm(true)}
            disabled={shipments.length === 0 || isLoading}
          >
            {isLoading ? (
                <span className="animate-pulse">Processing...</span>
            ) : (
                <>
                    <FileText size={20} /> Generate ({shipments.length})
                </>
            )}
          </Button>
        </div>
      </div>

      {/* Scanner Overlay */}
      {isScanning && (
        <Scanner 
          onScan={handleScan} 
          onClose={() => setIsScanning(false)}
          count={shipments.length}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                        <AlertOctagon size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Generate Loadsheet?</h3>
                        <p className="text-gray-500 mt-2">
                            You are about to submit <strong>{shipments.length}</strong> shipments.
                        </p>
                    </div>
                    <div className="flex gap-3 w-full mt-4">
                        <Button variant="secondary" className="flex-1" onClick={() => setShowConfirm(false)}>
                            Cancel
                        </Button>
                        <Button className="flex-1" onClick={handleGenerate}>
                            Confirm
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
