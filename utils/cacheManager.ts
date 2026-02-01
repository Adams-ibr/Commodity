/**
 * Cache Management Utility
 * Automatically clears various types of caches to keep the application fast
 */

interface CacheConfig {
  clearInterval: number; // in milliseconds
  enableLogging: boolean;
  cacheTypes: {
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
    serviceWorker: boolean;
    browserCache: boolean;
  };
}

interface CacheStats {
  localStorage: number;        // item count
  sessionStorage: number;      // item count
  serviceWorkerCaches: number; // cache count
  lastClearTime: Date | null;  // last clearing timestamp
}

class CacheManager {
  private config: CacheConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private lastClearTime: Date | null = null;
  private essentialKeys: string[] = [
    'auth-token',
    'user-preferences', 
    'theme-settings',
    'language-setting',
    'cache-manager-config'
  ];

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      clearInterval: 60 * 60 * 1000, // 1 hour in milliseconds
      enableLogging: true,
      cacheTypes: {
        localStorage: true,
        sessionStorage: false, // Keep session data during user session
        indexedDB: true,
        serviceWorker: true,
        browserCache: true
      },
      ...config
    };
    
    // Load persisted configuration
    this.loadPersistedConfig();
  }

  /**
   * Start automatic cache clearing
   */
  start(): void {
    if (this.intervalId) {
      this.log('Cache manager already running');
      return;
    }

    this.log('Starting cache manager with interval:', this.config.clearInterval / 1000 / 60, 'minutes');
    
    // Clear caches immediately on start
    this.clearCaches();

    // Set up recurring cache clearing
    this.intervalId = setInterval(() => {
      this.clearCaches();
    }, this.config.clearInterval);
  }

  /**
   * Stop automatic cache clearing
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.log('Cache manager stopped');
    }
  }

  /**
   * Manually clear all configured caches
   */
  async clearCaches(): Promise<void> {
    this.log('Starting cache clearing process...');
    const startTime = performance.now();

    try {
      const promises: Promise<void>[] = [];

      // Clear localStorage (except essential data)
      if (this.config.cacheTypes.localStorage) {
        promises.push(this.clearLocalStorage());
      }

      // Clear sessionStorage
      if (this.config.cacheTypes.sessionStorage) {
        promises.push(this.clearSessionStorage());
      }

      // Clear IndexedDB
      if (this.config.cacheTypes.indexedDB) {
        promises.push(this.clearIndexedDB());
      }

      // Clear Service Worker caches
      if (this.config.cacheTypes.serviceWorker) {
        promises.push(this.clearServiceWorkerCaches());
      }

      // Clear browser caches
      if (this.config.cacheTypes.browserCache) {
        promises.push(this.clearBrowserCaches());
      }

      // Execute all cache clearing operations in parallel
      await Promise.allSettled(promises);

      const endTime = performance.now();
      this.lastClearTime = new Date();
      
      this.log(`Cache clearing completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      // Dispatch custom event for components to react to cache clearing
      window.dispatchEvent(new CustomEvent('cacheCleared', {
        detail: { 
          timestamp: this.lastClearTime,
          duration: endTime - startTime,
          clearedTypes: Object.entries(this.config.cacheTypes)
            .filter(([_, enabled]) => enabled)
            .map(([type, _]) => type)
        }
      }));

    } catch (error) {
      this.log('Error during cache clearing:', error);
      throw error;
    }
  }

  /**
   * Get current cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    const stats: CacheStats = {
      localStorage: 0,
      sessionStorage: 0,
      serviceWorkerCaches: 0,
      lastClearTime: this.lastClearTime
    };

    try {
      // Count localStorage items
      stats.localStorage = localStorage.length;

      // Count sessionStorage items  
      stats.sessionStorage = sessionStorage.length;

      // Count service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        stats.serviceWorkerCaches = cacheNames.length;
      }
    } catch (error) {
      this.log('Error getting cache stats:', error);
    }

    return stats;
  }

  /**
   * Update cache manager configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    const oldInterval = this.config.clearInterval;
    this.config = { ...this.config, ...newConfig };
    
    // Persist configuration
    this.persistConfig();
    
    this.log('Configuration updated:', newConfig);
    
    // Restart with new config if interval changed and currently running
    if (this.intervalId && oldInterval !== this.config.clearInterval) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Clear localStorage while preserving essential data
   */
  private async clearLocalStorage(): Promise<void> {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !this.essentialKeys.includes(key)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      this.log(`Cleared ${keysToRemove.length} localStorage items (preserved ${this.essentialKeys.length} essential keys)`);
    } catch (error) {
      this.log('Error clearing localStorage:', error);
      throw error;
    }
  }

  /**
   * Clear sessionStorage
   */
  private async clearSessionStorage(): Promise<void> {
    try {
      const itemCount = sessionStorage.length;
      sessionStorage.clear();
      this.log(`Cleared ${itemCount} sessionStorage items`);
    } catch (error) {
      this.log('Error clearing sessionStorage:', error);
      throw error;
    }
  }

  /**
   * Clear IndexedDB databases
   */
  private async clearIndexedDB(): Promise<void> {
    try {
      if (!('indexedDB' in window)) {
        this.log('IndexedDB not available');
        return;
      }

      // Get list of databases (if supported)
      if ('databases' in indexedDB) {
        const databases = await indexedDB.databases();
        const deletePromises = databases.map(db => {
          if (db.name) {
            return new Promise<void>((resolve, reject) => {
              const deleteReq = indexedDB.deleteDatabase(db.name!);
              deleteReq.onsuccess = () => resolve();
              deleteReq.onerror = () => reject(deleteReq.error);
              deleteReq.onblocked = () => {
                this.log(`IndexedDB deletion blocked for: ${db.name}`);
                resolve(); // Don't fail the entire operation
              };
            });
          }
          return Promise.resolve();
        });

        await Promise.allSettled(deletePromises);
        this.log(`Cleared ${databases.length} IndexedDB databases`);
      } else {
        this.log('IndexedDB.databases() not supported, skipping IndexedDB clearing');
      }
    } catch (error) {
      this.log('Error clearing IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Clear Service Worker caches
   */
  private async clearServiceWorkerCaches(): Promise<void> {
    try {
      if (!('caches' in window)) {
        this.log('Cache API not available');
        return;
      }

      const cacheNames = await caches.keys();
      
      // Send message to service worker to clear caches
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_CACHE',
          cacheTypes: cacheNames
        });
      }
      
      // Also clear caches directly from main thread
      const deletePromises = cacheNames.map(cacheName => caches.delete(cacheName));
      await Promise.allSettled(deletePromises);
      
      this.log(`Cleared ${cacheNames.length} service worker caches`);
    } catch (error) {
      this.log('Error clearing service worker caches:', error);
      throw error;
    }
  }

  /**
   * Clear browser caches (limited by browser security)
   */
  private async clearBrowserCaches(): Promise<void> {
    try {
      // Force reload of cached resources by updating cache-busting parameters
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      let updatedCount = 0;
      
      links.forEach((link: Element) => {
        const href = (link as HTMLLinkElement).href;
        if (href) {
          const url = new URL(href);
          url.searchParams.set('_cache_bust', Date.now().toString());
          (link as HTMLLinkElement).href = url.toString();
          updatedCount++;
        }
      });

      // Clear memory caches where possible
      if ('memory' in performance && 'clear' in (performance as any).memory) {
        try {
          (performance as any).memory.clear();
        } catch (e) {
          // Silently fail if not supported
        }
      }

      this.log(`Browser caches cleared (updated ${updatedCount} stylesheets)`);
    } catch (error) {
      this.log('Error clearing browser caches:', error);
      throw error;
    }
  }

  /**
   * Load persisted configuration from localStorage
   */
  private loadPersistedConfig(): void {
    try {
      const persistedConfig = localStorage.getItem('cache-manager-config');
      if (persistedConfig) {
        const config = JSON.parse(persistedConfig);
        this.config = { ...this.config, ...config };
        this.log('Loaded persisted configuration');
      }
    } catch (error) {
      this.log('Error loading persisted config, using defaults:', error);
    }
  }

  /**
   * Persist current configuration to localStorage
   */
  private persistConfig(): void {
    try {
      localStorage.setItem('cache-manager-config', JSON.stringify(this.config));
    } catch (error) {
      this.log('Error persisting configuration:', error);
    }
  }

  /**
   * Log messages if logging is enabled
   */
  private log(...args: any[]): void {
    if (this.config.enableLogging) {
      console.log('[CacheManager]', new Date().toISOString(), ...args);
    }
  }
}

// Create singleton instance
export const cacheManager = new CacheManager();

// Export types for external use
export type { CacheConfig, CacheStats };
export { CacheManager };