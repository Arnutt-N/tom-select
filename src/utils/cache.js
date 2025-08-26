/**
 * Intelligent Cache System for Tom-Select Remote Data
 * Provides memory caching with TTL, localStorage fallback, and cache management
 */
export class ResultCache {
  constructor(options = {}) {
    // Configuration
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.namespace = options.namespace || 'tom_select_cache';
    this.useLocalStorage = options.useLocalStorage !== false;
    this.maxLocalStorageSize = options.maxLocalStorageSize || 5 * 1024 * 1024; // 5MB
    
    // Cache stores
    this.memoryCache = new Map();
    this.accessOrder = []; // For LRU eviction
    
    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      localStorageHits: 0,
      localStorageMisses: 0
    };
    
    // Initialize
    this.initialize();
  }

  /**
   * Initialize cache and load persisted data
   */
  initialize() {
    // Load cache from localStorage if available
    if (this.useLocalStorage && this.isLocalStorageAvailable()) {
      this.loadFromLocalStorage();
    }
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Set cache entry with optional TTL
   */
  set(key, data, ttl = this.defaultTTL) {
    const normalizedKey = this.normalizeKey(key);
    
    // Check if we need to evict entries
    if (this.memoryCache.size >= this.maxSize && !this.memoryCache.has(normalizedKey)) {
      this.evictOldest();
    }
    
    // Create cache entry
    const entry = {
      data: data,
      expires: Date.now() + ttl,
      created: Date.now(),
      accessed: Date.now(),
      accessCount: 0,
      size: this.estimateSize(data)
    };
    
    // Store in memory
    this.memoryCache.set(normalizedKey, entry);
    
    // Update access order
    this.updateAccessOrder(normalizedKey);
    
    // Persist to localStorage if enabled
    if (this.useLocalStorage) {
      this.persistToLocalStorage(normalizedKey, entry);
    }
    
    this.stats.sets++;
    
    return true;
  }

  /**
   * Get cache entry
   */
  get(key) {
    const normalizedKey = this.normalizeKey(key);
    
    // Try memory cache first
    let entry = this.memoryCache.get(normalizedKey);
    
    if (entry) {
      // Check if expired
      if (this.isExpired(entry)) {
        this.delete(normalizedKey);
        this.stats.misses++;
        return null;
      }
      
      // Update access metadata
      entry.accessed = Date.now();
      entry.accessCount++;
      this.updateAccessOrder(normalizedKey);
      
      this.stats.hits++;
      return this.cloneData(entry.data);
    }
    
    // Try localStorage fallback
    if (this.useLocalStorage) {
      entry = this.getFromLocalStorage(normalizedKey);
      
      if (entry) {
        // Re-populate memory cache
        this.memoryCache.set(normalizedKey, entry);
        this.updateAccessOrder(normalizedKey);
        
        this.stats.localStorageHits++;
        return this.cloneData(entry.data);
      }
      
      this.stats.localStorageMisses++;
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Check if key exists in cache
   */
  has(key) {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.memoryCache.get(normalizedKey);
    
    if (!entry) {
      return this.useLocalStorage ? this.hasInLocalStorage(normalizedKey) : false;
    }
    
    return !this.isExpired(entry);
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    const normalizedKey = this.normalizeKey(key);
    
    // Remove from memory
    const deleted = this.memoryCache.delete(normalizedKey);
    
    // Remove from access order
    const index = this.accessOrder.indexOf(normalizedKey);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    
    // Remove from localStorage
    if (this.useLocalStorage) {
      this.deleteFromLocalStorage(normalizedKey);
    }
    
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.memoryCache.clear();
    this.accessOrder = [];
    
    if (this.useLocalStorage) {
      this.clearLocalStorage();
    }
    
    this.resetStats();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100) : 0;
    const localStorageHitRate = this.stats.localStorageHits + this.stats.localStorageMisses > 0
      ? (this.stats.localStorageHits / (this.stats.localStorageHits + this.stats.localStorageMisses) * 100)
      : 0;
    
    return {
      ...this.stats,
      size: this.memoryCache.size,
      hitRate: hitRate.toFixed(2) + '%',
      localStorageHitRate: localStorageHitRate.toFixed(2) + '%',
      memoryUsage: this.getMemoryUsage(),
      localStorageUsage: this.getLocalStorageUsage()
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      localStorageHits: 0,
      localStorageMisses: 0
    };
  }

  // Private helper methods

  /**
   * Normalize cache key
   */
  normalizeKey(key) {
    if (typeof key === 'object') {
      return JSON.stringify(key);
    }
    return String(key);
  }

  /**
   * Check if entry is expired
   */
  isExpired(entry) {
    return Date.now() > entry.expires;
  }

  /**
   * Update access order for LRU
   */
  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict oldest entry (LRU)
   */
  evictOldest() {
    if (this.accessOrder.length === 0) return;
    
    const oldestKey = this.accessOrder[0];
    this.delete(oldestKey);
    this.stats.evictions++;
    
    console.log(`Cache evicted: ${oldestKey}`);
  }

  /**
   * Estimate data size in bytes
   */
  estimateSize(data) {
    try {
      return JSON.stringify(data).length * 2; // Unicode characters = 2 bytes
    } catch {
      return 1000; // Default estimate
    }
  }

  /**
   * Clone data to prevent mutations
   */
  cloneData(data) {
    try {
      return JSON.parse(JSON.stringify(data));
    } catch {
      return data;
    }
  }

  /**
   * Get total memory usage
   */
  getMemoryUsage() {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
    }
    return this.formatBytes(totalSize);
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Start cleanup interval for expired entries
   */
  startCleanupInterval() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }

  /**
   * Clean up expired entries
   */
  cleanupExpired() {
    let cleaned = 0;
    
    for (const [key, entry] of this.memoryCache) {
      if (this.isExpired(entry)) {
        this.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  // localStorage methods

  /**
   * Check if localStorage is available
   */
  isLocalStorageAvailable() {
    try {
      const test = '__cache_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Persist entry to localStorage
   */
  persistToLocalStorage(key, entry) {
    if (!this.isLocalStorageAvailable()) return;
    
    try {
      const storageKey = `${this.namespace}_${key}`;
      const data = JSON.stringify(entry);
      
      // Check size limit
      if (data.length > this.maxLocalStorageSize) {
        console.warn(`Cache entry too large for localStorage: ${key}`);
        return;
      }
      
      window.localStorage.setItem(storageKey, data);
    } catch (e) {
      console.warn('Failed to persist cache to localStorage:', e);
      
      // If quota exceeded, clear old entries
      if (e.name === 'QuotaExceededError') {
        this.clearOldLocalStorageEntries();
      }
    }
  }

  /**
   * Get entry from localStorage
   */
  getFromLocalStorage(key) {
    if (!this.isLocalStorageAvailable()) return null;
    
    try {
      const storageKey = `${this.namespace}_${key}`;
      const data = window.localStorage.getItem(storageKey);
      
      if (!data) return null;
      
      const entry = JSON.parse(data);
      
      // Check if expired
      if (this.isExpired(entry)) {
        window.localStorage.removeItem(storageKey);
        return null;
      }
      
      return entry;
    } catch {
      return null;
    }
  }

  /**
   * Check if key exists in localStorage
   */
  hasInLocalStorage(key) {
    if (!this.isLocalStorageAvailable()) return false;
    
    const storageKey = `${this.namespace}_${key}`;
    return window.localStorage.getItem(storageKey) !== null;
  }

  /**
   * Delete from localStorage
   */
  deleteFromLocalStorage(key) {
    if (!this.isLocalStorageAvailable()) return;
    
    const storageKey = `${this.namespace}_${key}`;
    window.localStorage.removeItem(storageKey);
  }

  /**
   * Clear all cache entries from localStorage
   */
  clearLocalStorage() {
    if (!this.isLocalStorageAvailable()) return;
    
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(this.namespace)) {
        keys.push(key);
      }
    }
    
    keys.forEach(key => window.localStorage.removeItem(key));
  }

  /**
   * Load cache from localStorage on initialization
   */
  loadFromLocalStorage() {
    if (!this.isLocalStorageAvailable()) return;
    
    let loaded = 0;
    const keys = [];
    
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(this.namespace)) {
        keys.push(key);
      }
    }
    
    keys.forEach(storageKey => {
      try {
        const data = window.localStorage.getItem(storageKey);
        if (data) {
          const entry = JSON.parse(data);
          
          // Skip expired entries
          if (!this.isExpired(entry)) {
            const cacheKey = storageKey.replace(`${this.namespace}_`, '');
            this.memoryCache.set(cacheKey, entry);
            this.updateAccessOrder(cacheKey);
            loaded++;
          } else {
            window.localStorage.removeItem(storageKey);
          }
        }
      } catch {
        // Remove corrupted entries
        window.localStorage.removeItem(storageKey);
      }
    });
    
    if (loaded > 0) {
      console.log(`Cache loaded ${loaded} entries from localStorage`);
    }
  }

  /**
   * Clear old localStorage entries when quota exceeded
   */
  clearOldLocalStorageEntries() {
    if (!this.isLocalStorageAvailable()) return;
    
    const entries = [];
    
    // Collect all cache entries
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(this.namespace)) {
        try {
          const data = JSON.parse(window.localStorage.getItem(key));
          entries.push({ key, accessed: data.accessed || 0 });
        } catch {
          // Remove corrupted entries
          window.localStorage.removeItem(key);
        }
      }
    }
    
    // Sort by access time (oldest first)
    entries.sort((a, b) => a.accessed - b.accessed);
    
    // Remove oldest 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      window.localStorage.removeItem(entries[i].key);
    }
    
    console.log(`Cleared ${toRemove} old cache entries from localStorage`);
  }

  /**
   * Get localStorage usage
   */
  getLocalStorageUsage() {
    if (!this.isLocalStorageAvailable()) return '0 Bytes';
    
    let totalSize = 0;
    
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(this.namespace)) {
        const value = window.localStorage.getItem(key);
        totalSize += key.length + (value ? value.length : 0);
      }
    }
    
    return this.formatBytes(totalSize * 2); // Unicode = 2 bytes per character
  }

  /**
   * Destroy cache and cleanup
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Export singleton instance for convenience
export const defaultCache = new ResultCache({
  maxSize: 100,
  ttl: 5 * 60 * 1000, // 5 minutes
  useLocalStorage: true
});