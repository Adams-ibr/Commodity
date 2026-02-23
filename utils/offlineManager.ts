/**
 * Offline Manager Utility
 * Handles offline detection and provides offline capabilities
 */

interface OfflineConfig {
  enableOfflineMode: boolean;
  showOfflineNotifications: boolean;
  retryInterval: number; // milliseconds
  maxRetries: number;
}

interface OfflineData {
  inventory: any[];
  transactions: any[];
  customers: any[];
  auditLogs: any[];
  lastSync: Date | null;
}

class OfflineManager {
  private config: OfflineConfig;
  private isOnline: boolean = navigator.onLine;
  private retryCount: number = 0;
  private retryTimeout: NodeJS.Timeout | null = null;
  private offlineData: OfflineData = {
    inventory: [],
    transactions: [],
    customers: [],
    auditLogs: [],
    lastSync: null
  };

  constructor(config: Partial<OfflineConfig> = {}) {
    this.config = {
      enableOfflineMode: true,
      showOfflineNotifications: true,
      retryInterval: 30000, // 30 seconds
      maxRetries: 10,
      ...config
    };

    this.initialize();
  }

  /**
   * Initialize offline manager
   */
  private initialize(): void {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
    }

    // Load cached offline data
    this.loadOfflineData();

    console.log('[OfflineManager] Initialized, online status:', this.isOnline);
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('[OfflineManager] Back online');
    this.isOnline = true;
    this.retryCount = 0;

    // Clear retry timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Dispatch online event
    window.dispatchEvent(new CustomEvent('networkStatusChanged', {
      detail: { isOnline: true, timestamp: new Date() }
    }));

    // Show notification
    if (this.config.showOfflineNotifications) {
      this.showNotification('Back Online', 'Connection restored. Syncing data...', 'success');
    }

    // Sync data when back online
    this.syncWhenOnline();
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('[OfflineManager] Gone offline');
    this.isOnline = false;

    // Dispatch offline event
    window.dispatchEvent(new CustomEvent('networkStatusChanged', {
      detail: { isOnline: false, timestamp: new Date() }
    }));

    // Show notification
    if (this.config.showOfflineNotifications) {
      this.showNotification('Offline Mode', 'Working offline. Changes will sync when connection is restored.', 'warning');
    }

    // Start retry mechanism
    this.startRetryMechanism();
  }

  /**
   * Handle service worker messages
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    if (event.data && event.data.type === 'BACK_ONLINE') {
      console.log('[OfflineManager] Service worker detected online status');
      if (!this.isOnline) {
        this.handleOnline();
      }
    }
  }

  /**
   * Start retry mechanism to check connection
   */
  private startRetryMechanism(): void {
    if (this.retryCount >= this.config.maxRetries) {
      console.log('[OfflineManager] Max retries reached');
      return;
    }

    this.retryTimeout = setTimeout(async () => {
      this.retryCount++;
      console.log(`[OfflineManager] Retry attempt ${this.retryCount}/${this.config.maxRetries}`);

      const isOnline = await this.checkConnection();
      if (isOnline && !this.isOnline) {
        this.handleOnline();
      } else if (!isOnline) {
        this.startRetryMechanism();
      }
    }, this.config.retryInterval);
  }

  /**
   * Check internet connection
   */
  private async checkConnection(): Promise<boolean> {
    try {
      // Try to fetch a small resource
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Sync data when back online
   */
  private async syncWhenOnline(): Promise<void> {
    if (!this.isOnline) return;

    try {
      console.log('[OfflineManager] Syncing offline data...');

      // Trigger background sync if service worker supports it
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('background-sync');
      }

      // Update last sync time
      this.offlineData.lastSync = new Date();
      this.saveOfflineData();

      // Dispatch sync complete event
      window.dispatchEvent(new CustomEvent('offlineDataSynced', {
        detail: { timestamp: this.offlineData.lastSync }
      }));

    } catch (error) {
      console.error('[OfflineManager] Sync failed:', error);
    }
  }

  /**
   * Cache data for offline use
   */
  cacheData(type: keyof OfflineData, data: any[]): void {
    if (type === 'lastSync') return;

    this.offlineData[type] = data;
    this.saveOfflineData();
    console.log(`[OfflineManager] Cached ${data.length} ${type} items`);
  }

  /**
   * Get cached data for offline use
   */
  getCachedData(type: keyof OfflineData): any[] {
    if (type === 'lastSync') return [];
    return this.offlineData[type] || [];
  }

  /**
   * Check if currently online
   */
  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Get offline status info
   */
  getOfflineStatus(): {
    isOnline: boolean;
    lastSync: Date | null;
    retryCount: number;
    hasOfflineData: boolean;
  } {
    const hasOfflineData = Object.values(this.offlineData).some(data =>
      Array.isArray(data) && data.length > 0
    );

    return {
      isOnline: this.isOnline,
      lastSync: this.offlineData.lastSync,
      retryCount: this.retryCount,
      hasOfflineData
    };
  }

  /**
   * Load offline data from localStorage
   */
  private loadOfflineData(): void {
    try {
      const stored = localStorage.getItem('offline-data');
      if (stored) {
        const data = JSON.parse(stored);
        this.offlineData = {
          ...this.offlineData,
          ...data,
          lastSync: data.lastSync ? new Date(data.lastSync) : null
        };
        console.log('[OfflineManager] Loaded offline data');
      }
    } catch (error) {
      console.error('[OfflineManager] Error loading offline data:', error);
    }
  }

  /**
   * Save offline data to localStorage
   */
  private saveOfflineData(): void {
    try {
      localStorage.setItem('offline-data', JSON.stringify(this.offlineData));
    } catch (error) {
      console.error('[OfflineManager] Error saving offline data:', error);
    }
  }

  /**
   * Show notification to user
   */
  private showNotification(title: string, message: string, type: 'success' | 'warning' | 'error'): void {
    // Dispatch notification event for UI components to handle
    window.dispatchEvent(new CustomEvent('offlineNotification', {
      detail: { title, message, type, timestamp: new Date() }
    }));
  }

  /**
   * Clear offline data
   */
  clearOfflineData(): void {
    this.offlineData = {
      inventory: [],
      transactions: [],
      customers: [],
      auditLogs: [],
      lastSync: null
    };
    localStorage.removeItem('offline-data');
    console.log('[OfflineManager] Offline data cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OfflineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[OfflineManager] Configuration updated');
  }

  /**
   * Cleanup
   */
  destroy(): void {
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    console.log('[OfflineManager] Destroyed');
  }
}

// Create singleton instance
export const offlineManager = new OfflineManager();

// Export types
export type { OfflineConfig, OfflineData };
export { OfflineManager };