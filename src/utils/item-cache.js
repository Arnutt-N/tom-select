/**
 * Item Cache System for Virtual Scrolling
 * Handles DOM element recycling and memory optimization
 * for high-performance virtual scrolling in Tom-Select
 */

/**
 * Cache system that recycles DOM elements to avoid expensive create/destroy cycles
 * Uses object pooling pattern for optimal performance
 */
export class ItemCache {
  constructor(options = {}) {
    this.options = {
      maxCacheSize: 100,       // Maximum items to cache by content
      maxPoolSize: 50,         // Maximum elements in the reuse pool
      cleanupThreshold: 200,   // Trigger cleanup when total elements exceed this
      trackMetrics: true,      // Whether to track performance metrics
      ...options
    };
    
    // Content-based cache for quick lookups
    this.contentCache = new Map();
    
    // Element pool for recycling
    this.elementPool = [];
    this.inUseElements = new Set();
    
    // Performance tracking
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      elementsCreated: 0,
      elementsRecycled: 0,
      cleanupCycles: 0,
      totalRequests: 0
    };
    
    // Cleanup timer
    this.cleanupTimer = null;
    
    console.log('[ItemCache] Initialized with options:', this.options);
  }
  
  /**
   * Get or create a DOM element for the given data
   */
  getElement(data, renderFunction, tomSelect) {
    this.metrics.totalRequests++;
    
    const cacheKey = this.generateCacheKey(data);
    
    // Try to get from content cache first
    if (this.contentCache.has(cacheKey)) {
      const cachedElement = this.contentCache.get(cacheKey);
      
      // Verify element is not in use and still in DOM
      if (!this.inUseElements.has(cachedElement) && cachedElement.parentNode) {
        this.inUseElements.add(cachedElement);
        this.metrics.cacheHits++;
        
        console.log(`[ItemCache] Cache hit for key: ${cacheKey}`);
        return cachedElement;
      } else {
        // Remove invalid cached element
        this.contentCache.delete(cacheKey);
      }
    }
    
    // Cache miss - get element from pool or create new
    const element = this.getElementFromPool();
    
    // Populate element with data
    this.populateElement(element, data, renderFunction, tomSelect);
    
    // Cache the element
    this.cacheElement(cacheKey, element);
    
    // Mark as in use
    this.inUseElements.add(element);
    
    this.metrics.cacheMisses++;
    
    console.log(`[ItemCache] Cache miss for key: ${cacheKey}, created/recycled element`);
    
    // Schedule cleanup if needed
    this.scheduleCleanup();
    
    return element;
  }
  
  /**
   * Get an element from the pool or create a new one
   */
  getElementFromPool() {
    if (this.elementPool.length > 0) {
      const element = this.elementPool.pop();
      this.metrics.elementsRecycled++;
      console.log(`[ItemCache] Recycled element from pool (${this.elementPool.length} remaining)`);
      return element;
    }
    
    // Create new element
    const element = this.createElement();
    this.metrics.elementsCreated++;
    console.log(`[ItemCache] Created new element (total created: ${this.metrics.elementsCreated})`);
    return element;
  }
  
  /**
   * Create a new DOM element with proper structure
   */
  createElement() {
    const element = document.createElement('div');
    element.className = 'virtual-item absolute left-0 right-0 cursor-pointer transition-colors duration-150';
    element.style.contain = 'layout style paint';
    element.style.willChange = 'transform';
    
    // Add event handling attributes for accessibility
    element.setAttribute('role', 'option');
    element.setAttribute('tabindex', '-1');
    
    return element;
  }
  
  /**
   * Populate element with data using the render function
   */
  populateElement(element, data, renderFunction, tomSelect) {
    try {
      // Clear previous content
      element.innerHTML = '';
      
      // Set virtual index and value
      element.dataset.virtualIndex = data.virtualIndex || data.index || '';
      element.dataset.value = data.value || '';
      element.dataset.cacheKey = this.generateCacheKey(data);
      
      // Apply Tom-Select render function
      if (renderFunction && typeof renderFunction === 'function') {
        const renderedContent = renderFunction.call(tomSelect, data, tomSelect?.utils?.escape || this.escapeHtml);
        
        if (typeof renderedContent === 'string') {
          element.innerHTML = renderedContent;
        } else if (renderedContent instanceof HTMLElement) {
          element.appendChild(renderedContent);
        }
      } else {
        // Fallback rendering
        element.innerHTML = this.getDefaultContent(data);
      }
      
      // Set ARIA attributes
      element.setAttribute('aria-label', data.text || data.value || 'Option');
      if (data.description) {
        element.setAttribute('aria-describedby', `desc-${data.value}`);
      }
      
      // Apply positioning styles
      this.applyElementStyles(element, data);
      
    } catch (error) {
      console.error('[ItemCache] Error populating element:', error);
      element.innerHTML = this.getErrorContent(data);
    }
  }
  
  /**
   * Apply positioning and styling to element
   */
  applyElementStyles(element, data) {
    // Set height if available
    if (data.height) {
      element.style.height = `${data.height}px`;
    }
    
    // Set top position if available
    if (data.offset !== undefined) {
      element.style.top = `${data.offset}px`;
    }
    
    // Add any custom CSS classes
    if (data.cssClass) {
      element.classList.add(...data.cssClass.split(' '));
    }
  }
  
  /**
   * Get default content when no render function provided
   */
  getDefaultContent(data) {
    const avatar = data.avatar ? `<img src="${data.avatar}" alt="" class="w-8 h-8 rounded mr-3">` : '';
    const badge = data.badge ? `<span class="ml-auto px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">${this.escapeHtml(data.badge)}</span>` : '';
    const description = data.description ? `<div class="text-sm text-gray-600">${this.escapeHtml(data.description)}</div>` : '';
    
    return `
      <div class="flex items-center p-3 hover:bg-gray-50">
        ${avatar}
        <div class="flex-1">
          <div class="font-medium">${this.escapeHtml(data.text || data.value || '')}</div>
          ${description}
        </div>
        ${badge}
      </div>
    `;
  }
  
  /**
   * Get error content when rendering fails
   */
  getErrorContent(data) {
    return `
      <div class="flex items-center p-3 text-red-600">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <span>Error rendering item: ${this.escapeHtml(data.value || 'Unknown')}</span>
      </div>
    `;
  }
  
  /**
   * Simple HTML escape function
   */
  escapeHtml(text) {
    if (typeof text !== 'string') return String(text);
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Generate cache key for data
   */
  generateCacheKey(data) {
    // Create key based on content that affects rendering
    const keyParts = [
      data.value || '',
      data.text || '',
      data.description || '',
      data.badge || '',
      data.avatar || '',
      data.category || ''
    ];
    
    return keyParts.join('|');
  }
  
  /**
   * Cache an element by its content key
   */
  cacheElement(key, element) {
    // Don't cache if at capacity
    if (this.contentCache.size >= this.options.maxCacheSize) {
      return;
    }
    
    this.contentCache.set(key, element);
  }
  
  /**
   * Release an element back to the pool
   */
  releaseElement(element) {
    if (!element) return;
    
    // Remove from in-use set
    this.inUseElements.delete(element);
    
    // Clean up element
    this.cleanElement(element);
    
    // Return to pool if not at capacity
    if (this.elementPool.length < this.options.maxPoolSize) {
      this.elementPool.push(element);
      console.log(`[ItemCache] Released element to pool (${this.elementPool.length} in pool)`);
    } else {
      // Remove from DOM if pool is full
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      console.log('[ItemCache] Removed element (pool full)');
    }
  }
  
  /**
   * Clean element for reuse
   */
  cleanElement(element) {
    // Remove virtual-specific attributes
    delete element.dataset.virtualIndex;
    delete element.dataset.value;
    delete element.dataset.cacheKey;
    
    // Reset positioning
    element.style.top = '';
    element.style.height = '';
    
    // Remove custom classes (keep base virtual-item classes)
    element.className = 'virtual-item absolute left-0 right-0 cursor-pointer transition-colors duration-150';
    
    // Clear ARIA attributes
    element.removeAttribute('aria-describedby');
    element.setAttribute('aria-label', '');
  }
  
  /**
   * Schedule cleanup if thresholds exceeded
   */
  scheduleCleanup() {
    const totalElements = this.contentCache.size + this.elementPool.length + this.inUseElements.size;
    
    if (totalElements > this.options.cleanupThreshold && !this.cleanupTimer) {
      this.cleanupTimer = setTimeout(() => {
        this.performCleanup();
        this.cleanupTimer = null;
      }, 1000); // Cleanup after 1 second of inactivity
    }
  }
  
  /**
   * Perform cleanup of old cached elements
   */
  performCleanup() {
    console.log('[ItemCache] Starting cleanup...');
    
    const initialCacheSize = this.contentCache.size;
    const initialPoolSize = this.elementPool.length;
    
    // Clean content cache - remove LRU items
    if (this.contentCache.size > this.options.maxCacheSize * 0.8) {
      const entries = Array.from(this.contentCache.entries());
      const itemsToRemove = Math.floor(this.contentCache.size * 0.2);
      
      // Remove oldest entries (assuming Map maintains insertion order)
      for (let i = 0; i < itemsToRemove; i++) {
        const [key, element] = entries[i];
        this.contentCache.delete(key);
        
        // If element is not in use, remove from DOM
        if (!this.inUseElements.has(element) && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
    }
    
    // Clean element pool - remove excess elements
    if (this.elementPool.length > this.options.maxPoolSize * 0.8) {
      const itemsToRemove = this.elementPool.length - Math.floor(this.options.maxPoolSize * 0.8);
      const removedElements = this.elementPool.splice(0, itemsToRemove);
      
      // Remove from DOM
      removedElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    }
    
    this.metrics.cleanupCycles++;
    
    console.log(`[ItemCache] Cleanup complete: cache ${initialCacheSize}→${this.contentCache.size}, pool ${initialPoolSize}→${this.elementPool.length}`);
  }
  
  /**
   * Force cleanup of all cached elements
   */
  clear() {
    console.log('[ItemCache] Clearing all cached elements...');
    
    // Remove all cached elements from DOM
    this.contentCache.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    
    // Remove all pool elements from DOM
    this.elementPool.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    
    // Clear collections
    this.contentCache.clear();
    this.elementPool = [];
    this.inUseElements.clear();
    
    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    console.log('[ItemCache] All cached elements cleared');
  }
  
  /**
   * Get cache performance statistics
   */
  getStats() {
    const hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / this.metrics.totalRequests * 100).toFixed(1)
      : '0';
    
    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      contentCacheSize: this.contentCache.size,
      elementPoolSize: this.elementPool.length,
      inUseElements: this.inUseElements.size,
      totalElements: this.contentCache.size + this.elementPool.length + this.inUseElements.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  
  /**
   * Estimate memory usage of cached elements
   */
  estimateMemoryUsage() {
    // Rough estimate: 1KB per cached element
    const totalElements = this.contentCache.size + this.elementPool.length;
    return `${(totalElements * 1024 / 1024).toFixed(2)}MB`;
  }
  
  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      elementsCreated: 0,
      elementsRecycled: 0,
      cleanupCycles: 0,
      totalRequests: 0
    };
    
    console.log('[ItemCache] Metrics reset');
  }
  
  /**
   * Destroy the cache and clean up all resources
   */
  destroy() {
    console.log('[ItemCache] Destroying cache...');
    
    // Clear all elements
    this.clear();
    
    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    console.log('[ItemCache] Cache destroyed');
  }
}