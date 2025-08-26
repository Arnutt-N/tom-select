/**
 * Offline Support for Tom-Select Remote Data
 * Provides network detection, fallback data, and sync capabilities
 */
export class OfflineManager {
  constructor(options = {}) {
    // Configuration
    this.fallbackDataUrl = options.fallbackDataUrl || '/data/fallback.json';
    this.syncOnReconnect = options.syncOnReconnect !== false;
    this.cacheKey = options.cacheKey || 'offline_fallback_data';
    this.notifyUser = options.notifyUser !== false;
    
    // State
    this.isOnline = navigator.onLine;
    this.fallbackData = null;
    this.pendingRequests = [];
    this.listeners = new Map();
    
    // Initialize
    this.initialize();
  }

  /**
   * Initialize offline manager
   */
  initialize() {
    // Load fallback data
    this.loadFallbackData();
    
    // Setup network status listeners
    this.setupNetworkListeners();
    
    // Check initial connection status
    this.checkConnection();
  }

  /**
   * Setup network status event listeners
   */
  setupNetworkListeners() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Periodic connection check
    this.connectionCheckInterval = setInterval(() => {
      this.checkConnection();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Handle online event
   */
  handleOnline() {
    console.log('Network connection restored');
    this.isOnline = true;
    
    // Notify listeners
    this.notifyListeners('online');
    
    // Show user notification
    if (this.notifyUser) {
      this.showNotification('Connection restored', 'success');
    }
    
    // Process pending requests
    if (this.syncOnReconnect) {
      this.processPendingRequests();
    }
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('Network connection lost');
    this.isOnline = false;
    
    // Notify listeners
    this.notifyListeners('offline');
    
    // Show user notification
    if (this.notifyUser) {
      this.showNotification('Working offline - using cached data', 'warning');
    }
  }

  /**
   * Check actual connection status with ping
   */
  async checkConnection() {
    try {
      // Try to fetch a small resource
      const response = await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-cache',
        mode: 'no-cors'
      });
      
      // Update status if changed
      if (!this.isOnline) {
        this.handleOnline();
      }
      
      return true;
    } catch {
      // Update status if changed
      if (this.isOnline) {
        this.handleOffline();
      }
      
      return false;
    }
  }

  /**
   * Load fallback data for offline use
   */
  async loadFallbackData() {
    try {
      // Try to load from cache first
      const cached = this.loadFromCache();
      if (cached) {
        this.fallbackData = cached;
        console.log('Loaded fallback data from cache');
        return;
      }
      
      // Load from file/API
      const response = await fetch(this.fallbackDataUrl);
      if (response.ok) {
        this.fallbackData = await response.json();
        this.saveToCache(this.fallbackData);
        console.log('Loaded fallback data from server');
      }
    } catch (error) {
      console.warn('Failed to load fallback data:', error);
      
      // Use default fallback data
      this.fallbackData = this.getDefaultFallbackData();
    }
  }

  /**
   * Get fallback data for offline queries
   */
  getFallbackData(query = '', options = {}) {
    if (!this.fallbackData) {
      return this.getDefaultFallbackData();
    }
    
    let data = Array.isArray(this.fallbackData) 
      ? this.fallbackData 
      : this.fallbackData.items || [];
    
    // Filter by query if provided
    if (query) {
      const searchTerm = query.toLowerCase();
      data = data.filter(item => {
        const searchFields = options.searchFields || ['name', 'title', 'text', 'value'];
        
        return searchFields.some(field => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(searchTerm);
        });
      });
    }
    
    // Apply pagination
    if (options.limit) {
      const offset = options.offset || 0;
      data = data.slice(offset, offset + options.limit);
    }
    
    // Sort results
    if (options.sortField) {
      data.sort((a, b) => {
        const aVal = a[options.sortField] || '';
        const bVal = b[options.sortField] || '';
        return options.sortDirection === 'desc' 
          ? bVal.localeCompare(aVal)
          : aVal.localeCompare(bVal);
      });
    }
    
    return data;
  }

  /**
   * Get default fallback data
   */
  getDefaultFallbackData() {
    return [
      { id: '1', name: 'Cached Item 1', description: 'Offline data', cached: true },
      { id: '2', name: 'Cached Item 2', description: 'Offline data', cached: true },
      { id: '3', name: 'Cached Item 3', description: 'Offline data', cached: true },
      { id: '4', name: 'Cached Item 4', description: 'Offline data', cached: true },
      { id: '5', name: 'Cached Item 5', description: 'Offline data', cached: true }
    ];
  }

  /**
   * Queue request for when connection is restored
   */
  queueRequest(request) {
    this.pendingRequests.push({
      ...request,
      timestamp: Date.now(),
      id: this.generateRequestId()
    });
    
    console.log(`Queued request for sync: ${request.url}`);
    
    // Save to localStorage
    this.savePendingRequests();
  }

  /**
   * Process pending requests when back online
   */
  async processPendingRequests() {
    if (this.pendingRequests.length === 0) return;
    
    console.log(`Processing ${this.pendingRequests.length} pending requests`);
    
    const processed = [];
    const failed = [];
    
    for (const request of this.pendingRequests) {
      try {
        // Execute the request
        const response = await fetch(request.url, request.options);
        
        if (response.ok) {
          processed.push(request);
          
          // Call success callback if provided
          if (request.onSuccess) {
            const data = await response.json();
            request.onSuccess(data);
          }
        } else {
          failed.push(request);
        }
      } catch (error) {
        console.error(`Failed to process pending request:`, error);
        failed.push(request);
      }
    }
    
    // Update pending requests
    this.pendingRequests = failed;
    this.savePendingRequests();
    
    // Notify user
    if (this.notifyUser && processed.length > 0) {
      this.showNotification(
        `Synced ${processed.length} pending ${processed.length === 1 ? 'request' : 'requests'}`,
        'success'
      );
    }
    
    if (failed.length > 0) {
      console.warn(`Failed to sync ${failed.length} requests`);
    }
  }

  /**
   * Register event listener
   */
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Notify all listeners of an event
   */
  notifyListeners(event, data = {}) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback({ type: event, ...data });
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Show user notification
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded shadow-lg z-50 transition-all duration-300 transform translate-x-0`;
    
    // Set type-specific styles
    switch (type) {
      case 'success':
        notification.className += ' bg-green-100 text-green-800 border border-green-200';
        notification.innerHTML = `
          <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>${message}</span>
          </div>
        `;
        break;
        
      case 'warning':
        notification.className += ' bg-yellow-100 text-yellow-800 border border-yellow-200';
        notification.innerHTML = `
          <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <span>${message}</span>
          </div>
        `;
        break;
        
      case 'error':
        notification.className += ' bg-red-100 text-red-800 border border-red-200';
        notification.innerHTML = `
          <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            <span>${message}</span>
          </div>
        `;
        break;
        
      default:
        notification.className += ' bg-blue-100 text-blue-800 border border-blue-200';
        notification.innerHTML = `
          <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
            </svg>
            <span>${message}</span>
          </div>
        `;
    }
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Cache management methods

  /**
   * Save data to cache
   */
  saveToCache(data) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.cacheKey, JSON.stringify(data));
      }
    } catch (error) {
      console.warn('Failed to save to cache:', error);
    }
  }

  /**
   * Load data from cache
   */
  loadFromCache() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = window.localStorage.getItem(this.cacheKey);
        return cached ? JSON.parse(cached) : null;
      }
    } catch (error) {
      console.warn('Failed to load from cache:', error);
    }
    return null;
  }

  /**
   * Save pending requests to localStorage
   */
  savePendingRequests() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          'offline_pending_requests',
          JSON.stringify(this.pendingRequests)
        );
      }
    } catch (error) {
      console.warn('Failed to save pending requests:', error);
    }
  }

  /**
   * Load pending requests from localStorage
   */
  loadPendingRequests() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('offline_pending_requests');
        if (saved) {
          this.pendingRequests = JSON.parse(saved);
        }
      }
    } catch (error) {
      console.warn('Failed to load pending requests:', error);
    }
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      pendingRequests: this.pendingRequests.length,
      hasFallbackData: !!this.fallbackData,
      fallbackDataCount: this.fallbackData ? 
        (Array.isArray(this.fallbackData) ? this.fallbackData.length : 
        (this.fallbackData.items ? this.fallbackData.items.length : 0)) : 0
    };
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    // Remove event listeners
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    // Clear interval
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    
    // Clear listeners
    this.listeners.clear();
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager({
  fallbackDataUrl: '/data/fallback.json',
  syncOnReconnect: true,
  notifyUser: true
});