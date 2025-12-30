import React, { useState, useEffect } from 'react';
import { X, Save, Lock } from 'lucide-react';
import { ApiCredentials } from '../types';
import { Button } from './Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (creds: ApiCredentials) => void;
  initialCreds: ApiCredentials;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  initialCreds 
}) => {
  const [creds, setCreds] = useState<ApiCredentials>(initialCreds);

  useEffect(() => {
    setCreds(initialCreds);
  }, [initialCreds, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Lock size={20} className="text-blue-600"/> API Configuration
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Leopards Courier</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input
                  type="text"
                  value={creds.leopardsApiKey}
                  onChange={(e) => setCreds({...creds, leopardsApiKey: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter Leopards API Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Password</label>
                <input
                  type="password"
                  value={creds.leopardsApiPassword}
                  onChange={(e) => setCreds({...creds, leopardsApiPassword: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter Leopards API Password"
                />
              </div>
            </div>
          </section>

          <hr />

          <section>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">PostEx Courier</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Token</label>
                <input
                  type="password"
                  value={creds.postExToken}
                  onChange={(e) => setCreds({...creds, postExToken: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter PostEx Token"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="p-4 border-t bg-gray-50 sticky bottom-0">
          <Button onClick={() => onSave(creds)} className="w-full">
            <Save size={18} className="mr-2" /> Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
};
