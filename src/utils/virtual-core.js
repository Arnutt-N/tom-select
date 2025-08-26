/**
 * Virtual Scroll Core Engine
 * Handles viewport calculations, item positioning, and height measurements
 * for high-performance virtual scrolling in Tom-Select
 */

/**
 * Core virtual scrolling engine that manages viewport calculations
 * and item positioning for massive datasets
 */
export class VirtualScrollCore {
  constructor(tomSelect, options = {}) {
    this.tomSelect = tomSelect;
    this.options = {
      itemHeight: 40,          // Default item height
      bufferSize: 10,          // Items to render outside viewport
      preloadSize: 100,        // Items to preload ahead
      maxMeasurements: 1000,   // Maximum height measurements to cache
      ...options
    };
    
    // Viewport state
    this.viewport = {
      top: 0,
      height: 300,
      scrollTop: 0,
      clientHeight: 300
    };
    
    // Item measurements and calculations
    this.itemHeights = new Map();
    this.averageItemHeight = this.options.itemHeight;
    this.totalHeight = 0;
    this.totalItems = 0;
    
    // Visible range tracking
    this.visibleRange = { start: 0, end: 50 };
    this.renderedItems = new Set();
    
    // Performance tracking
    this.stats = {
      measurements: 0,
      calculations: 0,
      renders: 0,
      scrollEvents: 0
    };
    
    // Intersection observer for efficient viewport detection
    this.intersectionObserver = null;
    this.resizeObserver = null;
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the virtual scrolling core
   */
  initialize() {
    this.setupObservers();
    console.log('[VirtualCore] Initialized with options:', this.options);
  }
  
  /**
   * Setup intersection and resize observers for efficient monitoring
   */
  setupObservers() {
    // Intersection Observer for viewport detection
    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          root: null,
          rootMargin: `${this.options.bufferSize * this.averageItemHeight}px`,
          threshold: 0
        }
      );
    }
    
    // Resize Observer for dynamic height changes
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(
        this.handleResize.bind(this)
      );
    }
  }
  
  /**
   * Calculate current viewport dimensions and scroll position
   */
  calculateViewport() {
    const dropdown = this.tomSelect.dropdown;
    if (!dropdown) {
      console.warn('[VirtualCore] No dropdown element found');
      return;
    }
    
    const rect = dropdown.getBoundingClientRect();
    const scrollTop = dropdown.scrollTop;
    
    // Update viewport state
    this.viewport = {
      top: scrollTop,
      height: rect.height,
      scrollTop: scrollTop,
      clientHeight: dropdown.clientHeight
    };
    
    // Calculate which items should be visible
    this.calculateVisibleRange();
    
    this.stats.calculations++;
  }
  
  /**
   * Calculate which items should be visible based on viewport
   */
  calculateVisibleRange() {
    const { top, height } = this.viewport;
    const buffer = this.options.bufferSize;
    
    // Calculate start and end indices using cumulative heights
    let startIndex = this.findItemAtOffset(top) - buffer;
    let endIndex = this.findItemAtOffset(top + height) + buffer;
    
    // Clamp to dataset bounds
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(this.totalItems - 1, endIndex);
    
    // Update visible range
    const oldRange = this.visibleRange;
    this.visibleRange = { start: startIndex, end: endIndex };
    
    // Log range changes for debugging
    if (oldRange.start !== startIndex || oldRange.end !== endIndex) {
      console.log(`[VirtualCore] Visible range: ${startIndex}-${endIndex} (${endIndex - startIndex + 1} items)`);
    }
    
    return this.visibleRange;
  }
  
  /**
   * Find which item is at a given scroll offset
   */
  findItemAtOffset(offset) {
    if (offset <= 0) return 0;
    if (this.itemHeights.size === 0) {
      // No measurements yet, use average
      return Math.floor(offset / this.averageItemHeight);
    }
    
    let currentOffset = 0;
    let itemIndex = 0;
    
    // Walk through measured items
    for (let i = 0; i < this.totalItems; i++) {
      const itemHeight = this.itemHeights.get(i) || this.averageItemHeight;
      if (currentOffset + itemHeight > offset) {
        return i;
      }
      currentOffset += itemHeight;
      itemIndex = i;
    }
    
    return itemIndex;
  }
  
  /**
   * Update item height measurement and recalculate totals
   */
  updateItemHeight(index, height) {
    if (typeof index !== 'number' || typeof height !== 'number' || height <= 0) {
      console.warn('[VirtualCore] Invalid height measurement:', { index, height });
      return;
    }
    
    const oldHeight = this.itemHeights.get(index) || this.averageItemHeight;
    this.itemHeights.set(index, height);
    
    // Update total height
    this.totalHeight += (height - oldHeight);
    
    // Update average height (weighted average to smooth out outliers)
    const totalMeasured = this.itemHeights.size;
    if (totalMeasured > 10) {
      const sum = Array.from(this.itemHeights.values()).reduce((a, b) => a + b, 0);
      const newAverage = sum / totalMeasured;
      
      // Smooth transition to new average (avoid sudden jumps)
      this.averageItemHeight = (this.averageItemHeight * 0.8) + (newAverage * 0.2);
    }
    
    // Cleanup old measurements if we exceed the limit
    if (this.itemHeights.size > this.options.maxMeasurements) {
      this.cleanupOldMeasurements();
    }
    
    this.stats.measurements++;
    
    console.log(`[VirtualCore] Updated item ${index} height: ${height}px (avg: ${this.averageItemHeight.toFixed(1)}px)`);
  }
  
  /**
   * Clean up old height measurements to prevent memory bloat
   */
  cleanupOldMeasurements() {
    const { start, end } = this.visibleRange;
    const keepBuffer = this.options.bufferSize * 5; // Keep 5x buffer worth of measurements
    
    // Remove measurements outside the extended range
    for (const [index] of this.itemHeights) {
      if (index < start - keepBuffer || index > end + keepBuffer) {
        this.itemHeights.delete(index);
      }
    }
    
    console.log(`[VirtualCore] Cleaned up measurements, ${this.itemHeights.size} remaining`);
  }
  
  /**
   * Get the vertical offset for a specific item
   */
  getItemOffset(index) {
    if (index <= 0) return 0;
    
    let offset = 0;
    
    // Sum heights of all items before this one
    for (let i = 0; i < index && i < this.totalItems; i++) {
      offset += this.itemHeights.get(i) || this.averageItemHeight;
    }
    
    return offset;
  }
  
  /**
   * Get estimated total height of all items
   */
  getTotalHeight() {
    if (this.itemHeights.size === 0) {
      return this.totalItems * this.averageItemHeight;
    }
    
    // Calculate based on measured + estimated items
    const measuredHeight = Array.from(this.itemHeights.values()).reduce((a, b) => a + b, 0);
    const unmeasuredItems = this.totalItems - this.itemHeights.size;
    const estimatedHeight = unmeasuredItems * this.averageItemHeight;
    
    return measuredHeight + estimatedHeight;
  }
  
  /**
   * Scroll to a specific item with alignment options
   */
  scrollToItem(index, align = 'top', smooth = false) {
    if (index < 0 || index >= this.totalItems) {
      console.warn('[VirtualCore] Invalid scroll index:', index);
      return;
    }
    
    const itemOffset = this.getItemOffset(index);
    const itemHeight = this.itemHeights.get(index) || this.averageItemHeight;
    const viewportHeight = this.viewport.height;
    
    let scrollTop;
    
    switch (align) {
      case 'center':
        scrollTop = itemOffset - (viewportHeight / 2) + (itemHeight / 2);
        break;
      case 'bottom':
        scrollTop = itemOffset - viewportHeight + itemHeight;
        break;
      case 'top':
      default:
        scrollTop = itemOffset;
        break;
    }
    
    // Clamp to valid scroll range
    scrollTop = Math.max(0, Math.min(scrollTop, this.getTotalHeight() - viewportHeight));
    
    // Apply scroll
    const dropdown = this.tomSelect.dropdown;
    if (dropdown) {
      if (smooth && 'scrollTo' in dropdown) {
        dropdown.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      } else {
        dropdown.scrollTop = scrollTop;
      }
      
      console.log(`[VirtualCore] Scrolled to item ${index} at ${scrollTop}px (${align})`);
    }
    
    // Update viewport after scroll
    setTimeout(() => this.calculateViewport(), 100);
  }
  
  /**
   * Set total number of items in the dataset
   */
  setTotalItems(count) {
    this.totalItems = count;
    console.log(`[VirtualCore] Total items set to ${count}`);
  }
  
  /**
   * Get visible range for rendering
   */
  getVisibleRange() {
    return { ...this.visibleRange };
  }
  
  /**
   * Get items that should be rendered (visible + buffer)
   */
  getItemsToRender() {
    const { start, end } = this.visibleRange;
    const items = [];
    
    for (let i = start; i <= end; i++) {
      if (i >= 0 && i < this.totalItems) {
        items.push({
          index: i,
          offset: this.getItemOffset(i),
          height: this.itemHeights.get(i) || this.averageItemHeight
        });
      }
    }
    
    return items;
  }
  
  /**
   * Handle intersection observer events
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Item entered viewport
        const index = parseInt(entry.target.dataset.virtualIndex);
        if (!isNaN(index)) {
          this.renderedItems.add(index);
        }
      } else {
        // Item left viewport
        const index = parseInt(entry.target.dataset.virtualIndex);
        if (!isNaN(index)) {
          this.renderedItems.delete(index);
        }
      }
    });
  }
  
  /**
   * Handle resize observer events
   */
  handleResize(entries) {
    entries.forEach(entry => {
      // Update viewport dimensions on resize
      setTimeout(() => this.calculateViewport(), 50);
    });
  }
  
  /**
   * Observe an item element for intersection and resize
   */
  observeItem(element, index) {
    if (element && typeof index === 'number') {
      element.dataset.virtualIndex = index;
      
      if (this.intersectionObserver) {
        this.intersectionObserver.observe(element);
      }
      
      if (this.resizeObserver) {
        this.resizeObserver.observe(element);
      }
    }
  }
  
  /**
   * Stop observing an item element
   */
  unobserveItem(element) {
    if (element) {
      if (this.intersectionObserver) {
        this.intersectionObserver.unobserve(element);
      }
      
      if (this.resizeObserver) {
        this.resizeObserver.unobserve(element);
      }
    }
  }
  
  /**
   * Get performance statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalItems: this.totalItems,
      measuredItems: this.itemHeights.size,
      averageHeight: this.averageItemHeight,
      totalHeight: this.getTotalHeight(),
      visibleItems: this.visibleRange.end - this.visibleRange.start + 1,
      renderedItems: this.renderedItems.size
    };
  }
  
  /**
   * Reset all measurements and calculations
   */
  reset() {
    this.itemHeights.clear();
    this.renderedItems.clear();
    this.averageItemHeight = this.options.itemHeight;
    this.totalHeight = 0;
    this.visibleRange = { start: 0, end: 50 };
    this.stats = {
      measurements: 0,
      calculations: 0,
      renders: 0,
      scrollEvents: 0
    };
    
    console.log('[VirtualCore] Reset completed');
  }
  
  /**
   * Clean up observers and resources
   */
  destroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    this.itemHeights.clear();
    this.renderedItems.clear();
    
    console.log('[VirtualCore] Destroyed and cleaned up');
  }
}