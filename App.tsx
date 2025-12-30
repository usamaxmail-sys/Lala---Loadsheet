import React, { useState, useEffect } from 'react';
import { Settings, Truck, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { CourierType, ApiCredentials, NotificationState } from './types';
import { SettingsModal } from './components/SettingsModal';
import { LoadsheetManager } from './components/LoadsheetManager';
import { Button } from './components/Button';
import { clsx } from 'clsx';

function App() {
  const [activeCourier, setActiveCourier] = useState<CourierType | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  
  const [credentials, setCredentials] = useState<ApiCredentials>({
    leopardsApiKey: '',
    leopardsApiPassword: '',
    postExToken: ''
  });

  // Load credentials on mount
  useEffect(() => {
    const saved = localStorage.getItem('courier_creds');
    if (saved) {
      try {
        setCredentials(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved credentials");
      }
    }
  }, []);

  // Notification Timer
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const saveCredentials = (creds: ApiCredentials) => {
    setCredentials(creds);
    localStorage.setItem('courier_creds', JSON.stringify(creds));
    setIsSettingsOpen(false);
    showNotification('success', 'Configuration saved securely');
  };

  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ type, message });
  };

  const renderDashboard = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-800">Courier LoadManager</h1>
        <p className="text-slate-500">Select a courier service to generate loadsheet</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <button
          onClick={() => setActiveCourier(CourierType.LEOPARDS)}
          className="group relative bg-white overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-8 border-2 border-transparent hover:border-orange-400 text-left"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Truck size={100} />
          </div>
          <div className="bg-orange-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4 text-orange-600">
            <Package size={28} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Leopards Courier</h3>
          <p className="text-sm text-gray-500 mt-2">Generate loadsheets via barcode scanning using the Leopards Merchant API.</p>
        </button>

        <button
          onClick={() => setActiveCourier(CourierType.POSTEX)}
          className="group relative bg-white overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-8 border-2 border-transparent hover:border-blue-400 text-left"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Truck size={100} />
          </div>
          <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4 text-blue-600">
            <Package size={28} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">PostEx Courier</h3>
          <p className="text-sm text-gray-500 mt-2">Integrate with PostEx V2 API to create and download shipment loadsheets.</p>
        </button>
      </div>

      <div className="pt-8">
        <Button variant="ghost" onClick={() => setIsSettingsOpen(true)} className="gap-2">
          <Settings size={18} /> Configure API Keys
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Top Bar (only visible on dashboard) */}
      {!activeCourier && (
        <div className="h-16 bg-white border-b flex items-center justify-between px-4 sm:px-8">
            <div className="font-bold text-xl tracking-tight text-blue-600">LoadManager</div>
        </div>
      )}

      <main className="max-w-4xl mx-auto">
        {activeCourier ? (
          <LoadsheetManager 
            courier={activeCourier}
            credentials={credentials}
            onBack={() => setActiveCourier(null)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            showNotification={showNotification}
          />
        ) : (
          renderDashboard()
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialCreds={credentials}
        onSave={saveCredentials}
      />

      {/* Global Notification Toast */}
      {notification && (
        <div className={clsx(
          "fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-full shadow-lg flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 font-medium",
          notification.type === 'success' && "bg-green-600 text-white",
          notification.type === 'error' && "bg-red-600 text-white",
          notification.type === 'warning' && "bg-yellow-500 text-white"
        )}>
          {notification.type === 'success' && <CheckCircle size={20} />}
          {notification.type === 'error' && <AlertCircle size={20} />}
          {notification.type === 'warning' && <AlertCircle size={20} />}
          <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;