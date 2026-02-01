import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { offlineManager } from '../utils/offlineManager';

interface OfflineStatusProps {
  showInHeader?: boolean;
  className?: string;
}

export const OfflineStatus: React.FC<OfflineStatusProps> = ({ 
  showInHeader = false, 
  className = '' 
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [notification, setNotification] = useState<{
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
    show: boolean;
  }>({ title: '', message: '', type: 'success', show: false });

  useEffect(() => {
    // Update initial status
    const status = offlineManager.getOfflineStatus();
    setIsOnline(status.isOnline);
    setLastSync(status.lastSync);
    setRetryCount(status.retryCount);

    // Listen for network status changes
    const handleNetworkChange = (event: CustomEvent) => {
      setIsOnline(event.detail.isOnline);
      if (event.detail.isOnline) {
        setRetryCount(0);
      }
    };

    // Listen for sync events
    const handleDataSynced = (event: CustomEvent) => {
      setLastSync(event.detail.timestamp);
    };

    // Listen for notifications
    const handleNotification = (event: CustomEvent) => {
      setNotification({
        ...event.detail,
        show: true
      });

      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 5000);
    };

    window.addEventListener('networkStatusChanged', handleNetworkChange as EventListener);
    window.addEventListener('offlineDataSynced', handleDataSynced as EventListener);
    window.addEventListener('offlineNotification', handleNotification as EventListener);

    // Update status periodically
    const statusInterval = setInterval(() => {
      const status = offlineManager.getOfflineStatus();
      setRetryCount(status.retryCount);
    }, 5000);

    return () => {
      window.removeEventListener('networkStatusChanged', handleNetworkChange as EventListener);
      window.removeEventListener('offlineDataSynced', handleDataSynced as EventListener);
      window.removeEventListener('offlineNotification', handleNotification as EventListener);
      clearInterval(statusInterval);
    };
  }, []);

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    }
    return `${minutes}m ago`;
  };

  const getStatusColor = () => {
    if (isOnline) return 'text-green-600';
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    if (isOnline) return <Wifi className="w-4 h-4" />;
    return <WifiOff className="w-4 h-4" />;
  };

  if (showInHeader) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`p-2 transition-colors relative ${getStatusColor()} hover:opacity-75`}
          title={isOnline ? 'Online' : 'Offline'}
        >
          {getStatusIcon()}
          {!isOnline && retryCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">{retryCount}</span>
            </span>
          )}
        </button>

        {showDetails && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  {getStatusIcon()}
                  Network Status
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Status:</span>
                  <span className={`text-sm font-medium ${getStatusColor()} flex items-center gap-1`}>
                    {getStatusIcon()}
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                {!isOnline && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Retry Attempts:</span>
                    <span className="text-sm font-medium text-slate-800 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      {retryCount}/10
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Last Sync:</span>
                  <span className="text-sm font-medium text-slate-800">
                    {formatLastSync(lastSync)}
                  </span>
                </div>

                {!isOnline && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Working Offline</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Changes will be saved locally and synced when connection is restored.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notification Toast */}
        {notification.show && (
          <div className="fixed top-4 right-4 z-50 max-w-sm">
            <div className={`p-4 rounded-lg shadow-lg border ${
              notification.type === 'success' ? 'bg-green-50 border-green-200' :
              notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />}
                {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />}
                {notification.type === 'error' && <WifiOff className="w-5 h-5 text-red-600 mt-0.5" />}
                <div className="flex-1">
                  <h4 className={`font-medium text-sm ${
                    notification.type === 'success' ? 'text-green-800' :
                    notification.type === 'warning' ? 'text-yellow-800' :
                    'text-red-800'
                  }`}>
                    {notification.title}
                  </h4>
                  <p className={`text-xs mt-1 ${
                    notification.type === 'success' ? 'text-green-700' :
                    notification.type === 'warning' ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>
                    {notification.message}
                  </p>
                </div>
                <button
                  onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-slate-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Network Status</h2>
            <p className="text-slate-600">Monitor connection and offline capabilities</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <div className={`text-2xl font-bold ${getStatusColor()}`}>
            {isOnline ? 'Connected' : 'Disconnected'}
          </div>
          <div className="text-sm text-slate-600">Connection Status</div>
        </div>
        
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {retryCount}/10
          </div>
          <div className="text-sm text-slate-600">Retry Attempts</div>
        </div>
        
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {formatLastSync(lastSync)}
          </div>
          <div className="text-sm text-slate-600">Last Sync</div>
        </div>
      </div>

      {!isOnline && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800 mb-2">Offline Mode Active</h3>
              <p className="text-sm text-yellow-700 mb-3">
                The application is working offline. Your changes are being saved locally and will be synchronized when the connection is restored.
              </p>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• View cached inventory and transaction data</li>
                <li>• Create new transactions (will sync later)</li>
                <li>• Access audit logs and reports</li>
                <li>• All changes are saved locally</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};