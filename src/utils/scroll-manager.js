/**
 * Scroll Manager for Virtual Scrolling
 * Handles scroll events, infinite loading, and performance monitoring
 * for high-performance virtual scrolling in Tom-Select
 */

/**
 * Manages scroll behavior, infinite loading, and performance optimization
 * for virtual scrolling implementations
 */
export class ScrollManager {
  constructor(tomSelect, virtualCore, dataProvider, options = {}) {
    this.tomSelect = tomSelect;
    this.virtualCore = virtualCore;
    this.dataProvider = dataProvider;
    
    this.options = {
      scrollDebounce: 16,        // 60fps scroll handling (1000/60)
      infiniteThreshold: 0.8,    // Load more when 80% scrolled
      velocityThreshold: 5,      // Minimum velocity for momentum detection
      performanceMonitoring: true, // Track FPS and performance
      touchOptimized: true,      // Optimize for touch devices
      snapToItems: false,        // Snap scroll to item boundaries
      ...options
    };
    
    // Scroll state
    this.isMonitoring = false;
    this.lastScrollTop = 0;
    this.scrollDirection = 'down';
    this.scrollVelocity = 0;
    this.isScrolling = false;
    this.scrollTimeout = null;
    
    // Infinite scroll state
    this.isLoadingMore = false;
    this.hasMoreData = true;
    this.lastLoadTrigger = 0;
    
    // Performance tracking
    this.performance = {
      fps: 60,
      frameCount: 0,
      lastFrameTime: 0,
      scrollEvents: 0,
      renderTime: 0,
      lastRenderStart: 0
    };
    
    // Event handlers (bound to maintain context)
    this.boundHandleScroll = this.handleScroll.bind(this);
    this.boundHandleWheel = this.handleWheel.bind(this);
    this.boundHandleTouch = this.handleTouch.bind(this);
    this.boundMonitorPerformance = this.monitorPerformance.bind(this);
    
    // RAF and timer IDs
    this.rafId = null;
    this.performanceRafId = null;
    this.debounceTimer = null;
    
    console.log('[ScrollManager] Initialized with options:', this.options);
  }
  
  /**
   * Start monitoring scroll events and performance
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.warn('[ScrollManager] Already monitoring');
      return;
    }
    
    this.isMonitoring = true;
    
    const dropdown = this.tomSelect.dropdown;
    if (!dropdown) {
      console.error('[ScrollManager] No dropdown element found');
      return;
    }
    
    // Initialize scroll state
    this.lastScrollTop = dropdown.scrollTop;
    this.scrollDirection = 'down';
    
    // Attach scroll event listeners
    this.attachEventListeners(dropdown);
    
    // Start performance monitoring
    if (this.options.performanceMonitoring) {
      this.startPerformanceMonitoring();
    }
    
    // Start scroll loop
    this.startScrollLoop();
    
    console.log('[ScrollManager] Started monitoring');
  }
  
  /**
   * Stop monitoring and clean up
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    // Remove event listeners
    this.removeEventListeners();
    
    // Cancel RAF loops
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    if (this.performanceRafId) {
      cancelAnimationFrame(this.performanceRafId);
      this.performanceRafId = null;
    }
    
    // Clear timers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }
    
    console.log('[ScrollManager] Stopped monitoring');
  }
  
  /**
   * Attach event listeners to dropdown
   */
  attachEventListeners(dropdown) {
    // Main scroll event (passive for better performance)
    dropdown.addEventListener('scroll', this.boundHandleScroll, { passive: true });
    
    // Wheel events for momentum detection
    dropdown.addEventListener('wheel', this.boundHandleWheel, { passive: true });
    
    // Touch events for mobile optimization
    if (this.options.touchOptimized) {
      dropdown.addEventListener('touchstart', this.boundHandleTouch, { passive: true });
      dropdown.addEventListener('touchmove', this.boundHandleTouch, { passive: true });
      dropdown.addEventListener('touchend', this.boundHandleTouch, { passive: true });
    }
  }
  
  /**
   * Remove all event listeners
   */
  removeEventListeners() {
    const dropdown = this.tomSelect.dropdown;
    if (!dropdown) return;
    
    dropdown.removeEventListener('scroll', this.boundHandleScroll);
    dropdown.removeEventListener('wheel', this.boundHandleWheel);
    dropdown.removeEventListener('touchstart', this.boundHandleTouch);
    dropdown.removeEventListener('touchmove', this.boundHandleTouch);
    dropdown.removeEventListener('touchend', this.boundHandleTouch);
  }
  
  /**
   * Main scroll event handler
   */
  handleScroll(event) {
    if (!this.isMonitoring) return;
    
    this.performance.scrollEvents++;
    this.isScrolling = true;
    
    // Clear existing scroll end timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    // Set scroll end timeout
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
      this.onScrollEnd();
    }, 150); // 150ms after last scroll event
    
    // Debounced scroll processing
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.processScroll();
    }, this.options.scrollDebounce);
  }
  
  /**
   * Process scroll changes
   */
  processScroll() {
    const dropdown = this.tomSelect.dropdown;
    if (!dropdown) return;
    
    const currentScrollTop = dropdown.scrollTop;
    const scrollDelta = currentScrollTop - this.lastScrollTop;
    
    // Calculate velocity
    this.scrollVelocity = Math.abs(scrollDelta);
    
    // Determine direction
    this.scrollDirection = scrollDelta > 0 ? 'down' : scrollDelta < 0 ? 'up' : this.scrollDirection;
    
    // Update viewport calculations
    this.virtualCore.calculateViewport();
    
    // Check for infinite scroll trigger
    this.checkInfiniteScroll(dropdown);
    
    // Update last scroll position
    this.lastScrollTop = currentScrollTop;
    
    // Notify virtual core of scroll change
    this.notifyScrollChange({
      scrollTop: currentScrollTop,
      direction: this.scrollDirection,
      velocity: this.scrollVelocity,
      delta: scrollDelta
    });
  }
  
  /**
   * Handle wheel events for momentum detection
   */
  handleWheel(event) {
    // Track wheel momentum for smooth scrolling
    const wheelDelta = Math.abs(event.deltaY);
    
    if (wheelDelta > this.options.velocityThreshold) {
      // High velocity scroll - may need to preload more items
      this.handleFastScroll();
    }
  }
  
  /**
   * Handle touch events for mobile optimization
   */
  handleTouch(event) {
    switch (event.type) {
      case 'touchstart':
        this.handleTouchStart(event);
        break;
      case 'touchmove':
        this.handleTouchMove(event);
        break;
      case 'touchend':
        this.handleTouchEnd(event);
        break;
    }
  }
  
  /**
   * Handle touch start
   */
  handleTouchStart(event) {
    this.touchStartY = event.touches[0].clientY;
    this.touchStartTime = performance.now();
  }
  
  /**
   * Handle touch move
   */
  handleTouchMove(event) {
    if (!this.touchStartY) return;
    
    const currentY = event.touches[0].clientY;
    const deltaY = this.touchStartY - currentY;
    const deltaTime = performance.now() - this.touchStartTime;
    
    // Calculate touch velocity
    this.touchVelocity = Math.abs(deltaY / deltaTime);
    
    // Handle fast touch scrolling
    if (this.touchVelocity > this.options.velocityThreshold) {
      this.handleFastScroll();
    }
  }
  
  /**
   * Handle touch end
   */
  handleTouchEnd(event) {
    // Implement momentum scrolling if needed
    if (this.touchVelocity > this.options.velocityThreshold * 2) {
      this.handleMomentumScroll();
    }
    
    this.touchStartY = null;
    this.touchStartTime = null;
    this.touchVelocity = 0;
  }
  
  /**
   * Handle fast scrolling by preloading more items
   */
  handleFastScroll() {
    if (this.dataProvider && typeof this.dataProvider.preloadItems === 'function') {
      this.dataProvider.preloadItems(this.options.preloadSize || 50);
    }
  }
  
  /**
   * Handle momentum scrolling
   */
  handleMomentumScroll() {
    // Could implement custom momentum scrolling here if needed
    // For now, rely on browser's native momentum
    console.log('[ScrollManager] Momentum scroll detected');
  }
  
  /**
   * Check if infinite scroll should be triggered
   */
  checkInfiniteScroll(dropdown) {
    if (!this.hasMoreData || this.isLoadingMore) {
      return;
    }
    
    const scrollTop = dropdown.scrollTop;
    const scrollHeight = dropdown.scrollHeight;
    const clientHeight = dropdown.clientHeight;
    
    // Calculate scroll percentage
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
    
    // Trigger loading if past threshold and scrolling down
    if (scrollPercentage >= this.options.infiniteThreshold && this.scrollDirection === 'down') {
      // Prevent multiple triggers
      const now = performance.now();
      if (now - this.lastLoadTrigger > 1000) { // 1 second cooldown
        this.triggerInfiniteLoad();
        this.lastLoadTrigger = now;
      }
    }
  }
  
  /**
   * Trigger infinite scroll loading
   */
  async triggerInfiniteLoad() {
    if (!this.dataProvider || this.isLoadingMore) {
      return;
    }
    
    console.log('[ScrollManager] Triggering infinite scroll load');
    
    this.isLoadingMore = true;
    
    try {
      // Show loading indicator
      this.showLoadingIndicator(true);
      
      // Load more data
      const hasMore = await this.dataProvider.loadMoreData();
      this.hasMoreData = hasMore;
      
      // Notify virtual core of new data
      if (hasMore && this.virtualCore) {
        const newTotalItems = this.dataProvider.getTotalItems();
        this.virtualCore.setTotalItems(newTotalItems);
      }
      
      console.log(`[ScrollManager] Infinite load complete, hasMore: ${hasMore}`);
      
    } catch (error) {
      console.error('[ScrollManager] Infinite load error:', error);
      this.hasMoreData = false;
    } finally {
      this.isLoadingMore = false;
      this.showLoadingIndicator(false);
    }
  }
  
  /**
   * Show/hide loading indicator
   */
  showLoadingIndicator(show) {
    // Dispatch event for UI to handle
    const event = new CustomEvent('virtualscroll:loading', {
      detail: { loading: show }
    });
    
    if (this.tomSelect.wrapper) {
      this.tomSelect.wrapper.dispatchEvent(event);
    }
  }
  
  /**
   * Handle scroll end event
   */
  onScrollEnd() {
    // Implement snap-to-item if enabled
    if (this.options.snapToItems) {
      this.snapToNearestItem();
    }
    
    // Clean up item cache
    if (this.tomSelect.itemCache) {
      this.tomSelect.itemCache.performCleanup();
    }
  }
  
  /**
   * Snap scroll to nearest item
   */
  snapToNearestItem() {
    const dropdown = this.tomSelect.dropdown;
    if (!dropdown) return;
    
    const scrollTop = dropdown.scrollTop;
    const averageHeight = this.virtualCore.averageItemHeight;
    
    // Find nearest item boundary
    const itemIndex = Math.round(scrollTop / averageHeight);
    const targetOffset = this.virtualCore.getItemOffset(itemIndex);
    
    // Smooth scroll to target
    if (Math.abs(targetOffset - scrollTop) > 5) {
      dropdown.scrollTo({
        top: targetOffset,
        behavior: 'smooth'
      });
    }
  }
  
  /**
   * Start performance monitoring loop
   */
  startPerformanceMonitoring() {
    this.performance.lastFrameTime = performance.now();
    this.monitorPerformance();
  }
  
  /**
   * Monitor scroll performance and FPS
   */
  monitorPerformance() {
    if (!this.isMonitoring) return;
    
    const now = performance.now();
    const deltaTime = now - this.performance.lastFrameTime;
    
    if (deltaTime >= 16) { // ~60fps
      this.performance.frameCount++;
      this.performance.fps = 1000 / deltaTime;
      this.performance.lastFrameTime = now;
      
      // Track render performance
      if (this.performance.lastRenderStart > 0) {
        this.performance.renderTime = now - this.performance.lastRenderStart;
        this.performance.lastRenderStart = 0;
      }
    }
    
    this.performanceRafId = requestAnimationFrame(this.boundMonitorPerformance);
  }
  
  /**
   * Start scroll processing loop
   */
  startScrollLoop() {
    if (!this.isMonitoring) return;
    
    // Process any pending scroll updates
    if (this.isScrolling) {
      this.processScroll();
    }
    
    this.rafId = requestAnimationFrame(() => this.startScrollLoop());
  }
  
  /**
   * Notify listeners of scroll changes
   */
  notifyScrollChange(scrollInfo) {
    const event = new CustomEvent('virtualscroll:change', {
      detail: scrollInfo
    });
    
    if (this.tomSelect.wrapper) {
      this.tomSelect.wrapper.dispatchEvent(event);
    }
  }
  
  /**
   * Scroll to a specific position
   */
  scrollTo(position, smooth = false) {
    const dropdown = this.tomSelect.dropdown;
    if (!dropdown) return;
    
    if (smooth && 'scrollTo' in dropdown) {
      dropdown.scrollTo({
        top: position,
        behavior: 'smooth'
      });
    } else {
      dropdown.scrollTop = position;
    }
    
    // Update tracking
    this.lastScrollTop = position;
  }
  
  /**
   * Scroll to a specific item
   */
  scrollToItem(index, align = 'top', smooth = false) {
    if (this.virtualCore) {
      this.virtualCore.scrollToItem(index, align, smooth);
    }
  }
  
  /**
   * Get current scroll information
   */
  getScrollInfo() {
    const dropdown = this.tomSelect.dropdown;
    
    return {
      scrollTop: dropdown?.scrollTop || 0,
      scrollHeight: dropdown?.scrollHeight || 0,
      clientHeight: dropdown?.clientHeight || 0,
      direction: this.scrollDirection,
      velocity: this.scrollVelocity,
      isScrolling: this.isScrolling,
      isLoadingMore: this.isLoadingMore,
      hasMoreData: this.hasMoreData
    };
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      ...this.performance,
      averageFps: this.performance.frameCount > 0 ? 
        Math.round(this.performance.frameCount / ((performance.now() - this.performance.lastFrameTime) / 1000)) : 0,
      scrollEventsPerSecond: this.performance.scrollEvents,
      isMonitoring: this.isMonitoring
    };
  }
  
  /**
   * Reset performance statistics
   */
  resetPerformanceStats() {
    this.performance = {
      fps: 60,
      frameCount: 0,
      lastFrameTime: performance.now(),
      scrollEvents: 0,
      renderTime: 0,
      lastRenderStart: 0
    };
  }
  
  /**
   * Set whether more data is available for infinite loading
   */
  setHasMoreData(hasMore) {
    this.hasMoreData = hasMore;
    console.log(`[ScrollManager] Has more data: ${hasMore}`);
  }
  
  /**
   * Force refresh of scroll state
   */
  refresh() {
    if (this.isMonitoring) {
      this.processScroll();
    }
  }
  
  /**
   * Destroy scroll manager and clean up
   */
  destroy() {
    console.log('[ScrollManager] Destroying...');
    
    this.stopMonitoring();
    
    // Clear any remaining references
    this.tomSelect = null;
    this.virtualCore = null;
    this.dataProvider = null;
    
    console.log('[ScrollManager] Destroyed');
  }
}