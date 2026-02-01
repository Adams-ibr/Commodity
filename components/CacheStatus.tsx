import React, { useState, useEffect } from 'react';
import { Trash2, Clock, Database, RefreshCw, Settings } from 'lucide-react';
import { cacheManager, CacheConfig } from '../utils/cacheManager';

interface CacheStatusProps {
  showInHeader?: boolean;
  className?: string;
}

export const CacheStatus: React.FC<CacheStatusProps> = ({ 
  showInHeader = false, 
  className = '' 
}) => {
  const [cacheStats, setCacheStats] = useState({
    localStorage: 0,
    sessionStorage: 0,
    serviceWorkerCaches: 0,
    lastClearTime: null as Date | null
  });
  const [isClearing, setIsClearing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<Partial<CacheConfig>>(cacheManager.getConfig());

  useEffect(() => {
    // Load cache stats
    loadCacheStats();

    // Listen for cache cleared events
    const handleCacheCleared = () => {
      loadCacheStats();
    };

    window.addEventListener('cacheCleared', handleCacheCleared);

    // Update stats every 30 seconds
    const statsInterval = setInterval(loadCacheStats, 30000);

    return () => {
      window.removeEventListener('cacheCleared', handleCacheCleared);
      clearInterval(statsInterval);
    };
  }, []);

  const loadCacheStats = async () => {
    try {
      const stats = await cacheManager.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Error loading cache stats:', error);
    }
  };

  const handleManualClear = async () => {
    setIsClearing(true);
    try {
      await cacheManager.clearCaches();
      await loadCacheStats();
    } catch (error) {
      console.error('Error clearing caches:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleConfigUpdate = (newConfig: Partial<CacheConfig>) => {
    setConfig(newConfig);
    cacheManager.updateConfig(newConfig);
  };

  const formatLastClearTime = (date: Date | null) => {
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

  const getCacheHealthColor = () => {
    const totalItems = cacheStats.localStorage + cacheStats.sessionStorage + cacheStats.serviceWorkerCaches;
    if (totalItems > 100) return 'text-red-600';
    if (totalItems > 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (showInHeader) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-slate-400 hover:text-indigo-600 transition-colors relative"
          title="Cache Management"
        >
          <Database className="w-5 h-5" />
          {(cacheStats.localStorage + cacheStats.sessionStorage + cacheStats.serviceWorkerCaches) > 50 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full"></span>
          )}
        </button>

        {showSettings && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Cache Status
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Local Storage:</span>
                  <span className={`text-sm font-medium ${getCacheHealthColor()}`}>
                    {cacheStats.localStorage} items
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Session Storage:</span>
                  <span className="text-sm font-medium text-slate-800">
                    {cacheStats.sessionStorage} items
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">SW Caches:</span>
                  <span className="text-sm font-medium text-slate-800">
                    {cacheStats.serviceWorkerCaches} caches
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Last Cleared:</span>
                  <span className="text-sm font-medium text-slate-800 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatLastClearTime(cacheStats.lastClearTime)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleManualClear}
                disabled={isClearing}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isClearing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {isClearing ? 'Clearing...' : 'Clear Caches Now'}
              </button>
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
          <Database className="w-6 h-6 text-indigo-600" />
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Cache Management</h2>
            <p className="text-slate-600">Monitor and manage application caches</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
          title="Cache Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Cache Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <div className={`text-2xl font-bold ${getCacheHealthColor()}`}>
            {cacheStats.localStorage}
          </div>
          <div className="text-sm text-slate-600">Local Storage Items</div>
        </div>
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {cacheStats.sessionStorage}
          </div>
          <div className="text-sm text-slate-600">Session Storage Items</div>
        </div>
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {cacheStats.serviceWorkerCaches}
          </div>
          <div className="text-sm text-slate-600">Service Worker Caches</div>
        </div>
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-sm text-slate-600">
            Last Cleared: {formatLastClearTime(cacheStats.lastClearTime)}
          </div>
        </div>
      </div>

      {/* Manual Clear Button */}
      <div className="flex justify-center">
        <button
          onClick={handleManualClear}
          disabled={isClearing}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isClearing ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Trash2 className="w-5 h-5" />
          )}
          {isClearing ? 'Clearing Caches...' : 'Clear All Caches Now'}
        </button>
      </div>

      {/* Cache Settings Panel */}
      {showSettings && (
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Cache Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Auto-clear Interval (minutes)
              </label>
              <select
                value={(config.clearInterval || 3600000) / 60000}
                onChange={(e) => handleConfigUpdate({
                  ...config,
                  clearInterval: parseInt(e.target.value) * 60000
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={240}>4 hours</option>
                <option value={480}>8 hours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cache Types to Clear
              </label>
              <div className="space-y-2">
                {Object.entries(config.cacheTypes || {}).map(([type, enabled]) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => handleConfigUpdate({
                        ...config,
                        cacheTypes: {
                          ...config.cacheTypes,
                          [type]: e.target.checked
                        }
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm text-slate-700 capitalize">
                      {type.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enableLogging || false}
                  onChange={(e) => handleConfigUpdate({
                    ...config,
                    enableLogging: e.target.checked
                  })}
                  className="mr-2"
                />
                <span className="text-sm text-slate-700">Enable Console Logging</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};