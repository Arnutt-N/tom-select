/**
 * Remote Select Component for Tom-Select
 * Integrates API client, caching, and offline support for remote data loading
 */
import TomSelect from 'tom-select';
import 'tom-select/dist/css/tom-select.css';
import { ApiClient, ApiError } from '../utils/api-client.js';
import { ResultCache } from '../utils/cache.js';
import { OfflineManager } from '../utils/offline.js';

export class RemoteSelect {
  constructor(selector, options = {}) {
    this.selector = selector;
    this.element = document.querySelector(selector);
    
    if (!this.element) {
      throw new Error(`Element ${selector} not found`);
    }
    
    const self = this;
    
    // Initialize utilities
    this.initializeUtilities(options);
    
    // Tom-Select configuration
    this.config = this.buildConfig(options);
    
    // Initialize
    this.init();
  }

  /**
   * Initialize utilities (API client, cache, offline manager)
   */
  initializeUtilities(options) {
    // API Client
    this.apiClient = options.apiClient || new ApiClient(
      options.apiBaseUrl || window.location.origin,
      {
        timeout: options.timeout || 10000,
        retries: options.retries || 3,
        rateLimit: options.rateLimit || 100
      }
    );
    
    // Cache
    this.cache = options.cache || new ResultCache({
      maxSize: options.cacheSize || 100,
      ttl: options.cacheTTL || 5 * 60 * 1000, // 5 minutes
      namespace: options.cacheNamespace || 'remote_select'
    });
    
    // Offline Manager
    this.offlineManager = options.offlineManager || new OfflineManager({
      fallbackDataUrl: options.fallbackDataUrl || '/data/fallback.json',
      syncOnReconnect: options.syncOnReconnect !== false,
      notifyUser: options.notifyUser !== false
    });
    
    // Request management
    this.currentRequest = null;
    this.requestHistory = [];
    
    // Pagination
    this.currentPage = 1;
    this.hasMore = true;
    
    // Settings
    this.apiEndpoint = options.apiEndpoint || '/api/search';
    this.valueField = options.valueField || 'id';
    this.labelField = options.labelField || 'name';
  }

  /**
   * Build Tom-Select configuration
   */
  buildConfig(options) {
    return {
      // Core settings
      valueField: this.valueField,
      labelField: this.labelField,
      searchField: options.searchField || [this.labelField],
      create: false,
      
      // Loading behavior
      preload: options.preload !== false,
      loadThrottle: options.loadThrottle || 300,
      maxOptions: options.maxOptions || 50,
      
      // Plugins
      plugins: options.plugins || {
        'remove_button': {}
      },
      
      // Remote loading function
      load: this.handleLoad.bind(this),
      
      // First load URL (optional)
      firstUrl: options.firstUrl || null,
      
      // Custom rendering
      render: {
        option: this.renderOption.bind(this),
        item: this.renderItem.bind(this),
        no_results: this.renderNoResults.bind(this),
        loading: this.renderLoading.bind(this),
        option_create: options.create ? this.renderOptionCreate.bind(this) : undefined
      },
      
      // Event handlers
      onInitialize: function() {
        // Store instance reference when Tom-Select calls this
        self.tomselect = this;
        self.onInitialize();
      },
      onFocus: this.onFocus.bind(this),
      onBlur: this.onBlur.bind(this),
      onLoad: this.onLoad.bind(this),
      onDropdownOpen: this.onDropdownOpen.bind(this),
      onDropdownClose: this.onDropdownClose.bind(this),
      onChange: this.onChange.bind(this),
      
      // Pass through other options
      ...options
    };
  }

  /**
   * Initialize the component
   */
  init() {
    try {
      // Create Tom-Select instance
      this.tomselect = new TomSelect(this.selector, this.config);
      
      // Setup offline event listeners
      this.setupOfflineListeners();
      
      // Store instance globally for debugging
      window.tomSelectInstances = window.tomSelectInstances || {};
      window.tomSelectInstances[this.element.id] = this.tomselect;
      
      console.log('Remote select initialized successfully');
    } catch (error) {
      console.error('Failed to initialize remote select:', error);
      // Fallback to native select
      this.element.style.display = 'block';
    }
  }

  /**
   * Handle remote data loading
   */
  async handleLoad(query, callback) {
    // Don't load if empty query and not preloading
    if (!query.length && !this.config.preload) {
      return callback();
    }
    
    try {
      // Cancel previous request if exists
      this.cancelCurrentRequest();
      
      // Check cache first
      const cacheKey = this.getCacheKey(query);
      const cachedData = this.cache.get(cacheKey);
      
      if (cachedData) {
        console.log(`Loading from cache: ${query}`);
        callback(cachedData);
        return;
      }
      
      // Check if offline
      if (!navigator.onLine || !this.offlineManager.isOnline) {
        console.log('Offline mode - using fallback data');
        const fallbackData = this.offlineManager.getFallbackData(query, {
          limit: this.config.maxOptions,
          searchFields: this.config.searchField
        });
        const transformed = this.transformApiResponse({ items: fallbackData });
        callback(transformed);
        return;
      }
      
      // Show loading state
      this.showLoadingState(true);
      
      // Build request parameters
      const params = {
        q: query,
        limit: this.config.maxOptions,
        page: this.currentPage
      };
      
      // Make API request
      this.currentRequest = this.apiClient.get(this.apiEndpoint, params);
      const response = await this.currentRequest;
      
      // Transform response
      const transformed = this.transformApiResponse(response.data);
      
      // Cache results
      this.cache.set(cacheKey, transformed);
      
      // Update request history
      this.requestHistory.push({
        query,
        timestamp: Date.now(),
        responseTime: response.responseTime,
        resultCount: transformed.length
      });
      
      // Hide loading state
      this.showLoadingState(false);
      
      // Return results
      callback(transformed);
      
    } catch (error) {
      this.handleLoadError(error, query, callback);
    } finally {
      this.currentRequest = null;
    }
  }

  /**
   * Transform API response to Tom-Select format
   */
  transformApiResponse(data) {
    // Handle different response formats
    let items = data;
    
    // GitHub-style response
    if (data.items && Array.isArray(data.items)) {
      items = data.items;
    }
    
    // Paginated response
    if (data.results && Array.isArray(data.results)) {
      items = data.results;
      this.hasMore = data.has_more || data.next_page || false;
    }
    
    // Ensure array
    if (!Array.isArray(items)) {
      items = [];
    }
    
    // Transform to Tom-Select format
    return items.map(item => ({
      [this.valueField]: item[this.valueField] || item.id,
      [this.labelField]: item[this.labelField] || item.name || item.title || '',
      // Preserve all original data for rendering
      ...item
    }));
  }

  /**
   * Handle load errors
   */
  handleLoadError(error, query, callback) {
    console.error('Load error:', error);
    
    this.showLoadingState(false);
    
    // Check if request was aborted
    if (error.name === 'AbortError' || (error instanceof ApiError && error.code === 'ABORT')) {
      return callback();
    }
    
    // Check if offline
    if (!navigator.onLine || error.isNetworkError?.()) {
      console.log('Network error - switching to offline mode');
      const fallbackData = this.offlineManager.getFallbackData(query, {
        limit: this.config.maxOptions,
        searchFields: this.config.searchField
      });
      const transformed = this.transformApiResponse({ items: fallbackData });
      callback(transformed);
      
      // Show offline notification
      this.showErrorNotification('Working offline - using cached data', 'warning');
      return;
    }
    
    // Show error message
    const userMessage = error instanceof ApiError ? error.getUserMessage() : error.message;
    this.showErrorNotification(userMessage, 'error');
    
    // Return empty results
    callback();
  }

  /**
   * Cancel current request
   */
  cancelCurrentRequest() {
    if (this.currentRequest) {
      if (this.currentRequest.abort) {
        this.currentRequest.abort();
      } else if (this.apiClient) {
        this.apiClient.cancelRequest();
      }
      this.currentRequest = null;
    }
  }

  /**
   * Generate cache key
   */
  getCacheKey(query) {
    return `${this.apiEndpoint}_${query}_page${this.currentPage}`;
  }

  /**
   * Show/hide loading state
   */
  showLoadingState(show) {
    if (!this.tomselect || !this.tomselect.dropdown) return;
    
    if (show) {
      this.tomselect.dropdown.classList.add('loading');
      
      // Show loading spinner if no results yet
      if (this.tomselect.dropdown.children.length === 0) {
        this.tomselect.dropdown.innerHTML = this.renderLoading();
      }
    } else {
      this.tomselect.dropdown.classList.remove('loading');
    }
  }

  /**
   * Show error notification
   */
  showErrorNotification(message, type = 'error') {
    // Use offline manager's notification system
    if (this.offlineManager) {
      this.offlineManager.showNotification(message, type);
    }
  }

  /**
   * Setup offline event listeners
   */
  setupOfflineListeners() {
    // Listen for online/offline events
    this.offlineManager.addEventListener('online', () => {
      console.log('Connection restored - remote select can load fresh data');
      
      // Clear cache to get fresh data
      if (this.tomselect.loading) {
        this.tomselect.load(this.tomselect.lastQuery || '');
      }
    });
    
    this.offlineManager.addEventListener('offline', () => {
      console.log('Connection lost - remote select using cached data');
    });
  }

  // Render methods

  /**
   * Render option in dropdown
   */
  renderOption(item, escape) {
    const isOffline = item.cached === true;
    
    return `
      <div class="flex items-start p-3 hover:bg-gray-50 ${isOffline ? 'bg-yellow-50' : ''}">
        ${item.avatar ? `
          <img src="${escape(item.avatar)}" 
               class="w-8 h-8 rounded-full mr-3" 
               alt=""
               loading="lazy"
               onerror="this.style.display='none'">
        ` : ''}
        <div class="flex-1">
          <div class="font-medium text-gray-900">
            ${escape(item[this.labelField])}
            ${isOffline ? '<span class="ml-2 text-xs text-yellow-600">(Cached)</span>' : ''}
          </div>
          ${item.description ? `
            <div class="text-sm text-gray-600 line-clamp-2 mt-1">
              ${escape(item.description)}
            </div>
          ` : ''}
          <div class="flex items-center mt-1 space-x-4 text-xs text-gray-500">
            ${item.stars ? `<span>⭐ ${this.formatNumber(item.stars)}</span>` : ''}
            ${item.language ? `<span>${escape(item.language)}</span>` : ''}
            ${item.updated ? `<span>Updated ${this.formatDate(item.updated)}</span>` : ''}
            ${item.tags ? `
              <div class="flex gap-1">
                ${item.tags.slice(0, 3).map(tag => `
                  <span class="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                    ${escape(tag)}
                  </span>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render selected item
   */
  renderItem(item, escape) {
    return `
      <div class="flex items-center">
        ${item.avatar ? `
          <img src="${escape(item.avatar)}" 
               class="w-4 h-4 rounded-full mr-2" 
               alt=""
               onerror="this.style.display='none'">
        ` : ''}
        <span>${escape(item[this.labelField])}</span>
      </div>
    `;
  }

  /**
   * Render no results message
   */
  renderNoResults(data, escape) {
    const isOffline = !navigator.onLine || !this.offlineManager.isOnline;
    
    if (isOffline) {
      return `
        <div class="p-4 text-center">
          <div class="text-yellow-600 mb-2">
            <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m2.829 2.829l2.829 2.829"/>
            </svg>
          </div>
          <div class="text-gray-700 font-medium">No offline results found</div>
          <div class="text-sm text-gray-500 mt-1">
            Connect to the internet for more results
          </div>
        </div>
      `;
    }
    
    if (data.input && data.input.length > 0) {
      return `
        <div class="p-4 text-center">
          <div class="text-gray-400 mb-2">
            <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <div class="text-gray-700 font-medium">No results found</div>
          <div class="text-sm text-gray-500 mt-1">
            No matches for "${escape(data.input)}"
          </div>
          <button class="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
                  onclick="document.querySelector('${this.selector}').tomSelect.clear()">
            Clear search
          </button>
        </div>
      `;
    }
    
    return `
      <div class="p-4 text-center text-gray-500">
        <div class="text-gray-400 mb-2">
          <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <div>Start typing to search...</div>
      </div>
    `;
  }

  /**
   * Render loading state
   */
  renderLoading() {
    return `
      <div class="p-4 text-center">
        <div class="inline-flex items-center">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-600" 
               fill="none" 
               viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" 
                    stroke="currentColor" 
                    stroke-width="4" 
                    class="opacity-25"/>
            <path fill="currentColor" 
                  class="opacity-75" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <span class="text-gray-600">Loading...</span>
        </div>
      </div>
    `;
  }

  /**
   * Render option create (if enabled)
   */
  renderOptionCreate(data, escape) {
    return `
      <div class="create p-3 bg-blue-50 border-l-4 border-blue-500">
        <div class="flex items-center text-blue-700">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 4v16m8-8H4"/>
          </svg>
          <span>Create "<strong>${escape(data.input)}</strong>"</span>
        </div>
      </div>
    `;
  }

  // Event handlers

  /**
   * Handle initialization
   */
  onInitialize() {
    console.log('Remote select initialized');
    
    if (!this.tomselect || !this.tomselect.control) {
      console.warn('Remote Tom-Select instance not properly initialized');
      return;
    }
    
    // Add aria attributes
    this.tomselect.control.setAttribute('aria-label', 'Remote data search');
    this.tomselect.control.setAttribute('aria-describedby', 'remote-description');
    
    // Add loading class
    if (this.tomselect.wrapper) {
      this.tomselect.wrapper.classList.add('remote-select');
    }
  }

  /**
   * Handle focus event
   */
  onFocus() {
    // Load initial data if configured
    if (this.config.preload && !this.tomselect.options.length) {
      this.tomselect.load('');
    }
  }

  /**
   * Handle blur event
   */
  onBlur() {
    // Cancel any pending requests
    this.cancelCurrentRequest();
  }

  /**
   * Handle load complete
   */
  onLoad(data, query) {
    console.log(`Loaded ${data ? data.length : 0} items for query: "${query}"`);
    
    // Announce to screen reader
    this.announce(`Loaded ${data ? data.length : 0} results`);
  }

  /**
   * Handle dropdown open
   */
  onDropdownOpen() {
    this.tomselect.control.setAttribute('aria-expanded', 'true');
  }

  /**
   * Handle dropdown close
   */
  onDropdownClose() {
    this.tomselect.control.setAttribute('aria-expanded', 'false');
    
    // Cancel any pending requests
    this.cancelCurrentRequest();
  }

  /**
   * Handle selection change
   */
  onChange(value) {
    console.log('Selection changed:', value);
    
    // Trigger custom event
    this.element.dispatchEvent(new CustomEvent('remote-select:change', {
      detail: { value }
    }));
  }

  // Utility methods

  /**
   * Format number for display
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Format date for display
   */
  formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now - date;
      
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 30) {
        return date.toLocaleDateString();
      }
      if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
      }
      if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      }
      if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      }
      return 'just now';
    } catch {
      return dateStr;
    }
  }

  /**
   * Announce to screen readers
   */
  announce(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.classList.add('sr-only');
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      if (announcement.parentNode) {
        announcement.parentNode.removeChild(announcement);
      }
    }, 1000);
  }

  // Public API

  /**
   * Reload data
   */
  reload() {
    if (this.tomselect) {
      this.tomselect.clearOptions();
      this.tomselect.load(this.tomselect.lastQuery || '');
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('Cache cleared');
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      api: this.apiClient.getStats(),
      cache: this.cache.getStats(),
      offline: this.offlineManager.getStatus(),
      requests: this.requestHistory.length,
      lastRequest: this.requestHistory[this.requestHistory.length - 1] || null
    };
  }

  /**
   * Destroy component
   */
  destroy() {
    if (this.tomselect) {
      this.tomselect.destroy();
    }
    
    if (this.cache) {
      this.cache.destroy();
    }
    
    // Note: Don't destroy shared offline manager
  }
}

// Export for use
export default RemoteSelect;