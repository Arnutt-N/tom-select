/**
 * Virtual Select Component
 * High-performance virtual scrolling integration for Tom-Select
 * Handles 10,000+ items with 60fps performance and memory optimization
 */

import TomSelect from 'tom-select';
import { VirtualScrollCore } from '../utils/virtual-core.js';
import { ItemCache } from '../utils/item-cache.js';
import { ScrollManager } from '../utils/scroll-manager.js';
import { DataProvider } from '../utils/data-provider.js';

/**
 * Virtual Select - Main integration component that coordinates all virtual scrolling
 * utilities with Tom-Select for high-performance dropdown handling
 */
export class VirtualSelect {
  constructor(element, options = {}) {
    this.element = typeof element === 'string' ? document.querySelector(element) : element;
    
    if (!this.element) {
      throw new Error('VirtualSelect: Element not found');
    }
    
    // Configuration with performance-optimized defaults
    this.options = {
      // Virtual scrolling settings
      itemHeight: 40,
      bufferSize: 10,
      preloadSize: 100,
      maxRenderedItems: 200,
      
      // Performance settings
      performanceMonitoring: true,
      targetFPS: 60,
      memoryLimit: 100 * 1024 * 1024, // 100MB
      
      // Data settings
      chunkSize: 1000,
      searchWorker: true,
      enableInfiniteScroll: true,
      
      // Tom-Select integration
      tomSelectOptions: {},
      
      // Data source
      dataSource: null,
      
      // Custom renderers
      render: {
        option: null,
        item: null,
        loading: null,
        noResults: null
      },
      
      // Accessibility
      accessibility: {
        enabled: true,
        announceChanges: true,
        keyboardNavigation: true
      },
      
      // Mobile optimization
      mobile: {
        touchOptimized: true,
        snapToItems: false,
        momentumScrolling: true
      },
      
      ...options
    };
    
    // Component state
    this.initialized = false;
    this.destroyed = false;
    this.isRendering = false;
    this.currentData = [];
    this.visibleItems = new Map();
    
    // Performance tracking
    this.performance = {
      renderCount: 0,
      avgRenderTime: 0,
      memoryUsage: 0,
      fps: 60,
      dropframes: 0,
      startTime: performance.now()
    };
    
    // Event handlers
    this.boundHandlers = {
      resize: this.handleResize.bind(this),
      keydown: this.handleKeydown.bind(this),
      focus: this.handleFocus.bind(this),
      blur: this.handleBlur.bind(this)
    };
    
    // Initialize components
    this.initializeComponents();
    this.setupEventListeners();
    
    console.log('[VirtualSelect] Initialized with options:', this.options);
  }
  
  /**
   * Initialize all virtual scrolling components
   */
  initializeComponents() {
    try {
      // Initialize data provider
      this.dataProvider = new DataProvider({
        chunkSize: this.options.chunkSize,
        dataSource: this.options.dataSource,
        enableWorker: this.options.searchWorker
      });
      
      // Initialize item cache for DOM recycling
      this.itemCache = new ItemCache({
        maxCacheSize: this.options.maxRenderedItems,
        trackMetrics: this.options.performanceMonitoring
      });
      
      // Initialize virtual scrolling core
      this.virtualCore = new VirtualScrollCore(null, {
        itemHeight: this.options.itemHeight,
        bufferSize: this.options.bufferSize,
        preloadSize: this.options.preloadSize
      });
      
      // Initialize Tom-Select with virtual scrolling customizations
      this.initializeTomSelect();
      
      // Initialize scroll manager after Tom-Select is ready
      this.scrollManager = new ScrollManager(
        this.tomSelect,
        this.virtualCore,
        this.dataProvider,
        {
          performanceMonitoring: this.options.performanceMonitoring,
          touchOptimized: this.options.mobile.touchOptimized,
          snapToItems: this.options.mobile.snapToItems
        }
      );
      
      // Setup performance monitoring
      if (this.options.performanceMonitoring) {
        this.startPerformanceMonitoring();
      }
      
      console.log('[VirtualSelect] All components initialized successfully');
      
    } catch (error) {
      console.error('[VirtualSelect] Component initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Initialize Tom-Select with virtual scrolling integration
   */
  initializeTomSelect() {
    // Merge default virtual scrolling options with user options
    const tomSelectOptions = {
      // Core Tom-Select options optimized for virtual scrolling
      maxItems: this.options.tomSelectOptions.maxItems || null,
      maxOptions: null, // Unlimited since we handle virtualization
      create: this.options.tomSelectOptions.create || false,
      persist: this.options.tomSelectOptions.persist !== false,
      
      // Search configuration
      searchField: this.options.tomSelectOptions.searchField || ['text'],
      sortField: this.options.tomSelectOptions.sortField || null, // Let virtual system handle sorting
      
      // Loading configuration
      preload: true, // Always preload for virtual scrolling
      
      // Custom loaders
      load: this.handleLoad.bind(this),
      
      // Custom rendering for virtual scrolling
      render: {
        dropdown: this.renderDropdown.bind(this),
        option: this.renderOption.bind(this),
        item: this.renderItem.bind(this),
        option_create: this.renderOptionCreate.bind(this),
        loading: this.renderLoading.bind(this),
        no_results: this.renderNoResults.bind(this)
      },
      
      // Event handlers
      onInitialize: this.onTomSelectInitialize.bind(this),
      onFocus: this.onTomSelectFocus.bind(this),
      onBlur: this.onTomSelectBlur.bind(this),
      onItemAdd: this.onItemAdd.bind(this),
      onItemRemove: this.onItemRemove.bind(this),
      onDropdownOpen: this.onDropdownOpen.bind(this),
      onDropdownClose: this.onDropdownClose.bind(this),
      onType: this.onType.bind(this),
      
      // Merge user options
      ...this.options.tomSelectOptions
    };
    
    // Initialize Tom-Select
    this.tomSelect = new TomSelect(this.element, tomSelectOptions);
    
    // Store reference in virtual core
    this.virtualCore.tomSelect = this.tomSelect;
    
    console.log('[VirtualSelect] Tom-Select initialized with virtual scrolling');
  }
  
  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Resize handling for responsive design
    window.addEventListener('resize', this.boundHandlers.resize);
    
    // Global keyboard navigation
    if (this.options.accessibility.keyboardNavigation) {
      document.addEventListener('keydown', this.boundHandlers.keydown);
    }
    
    // Focus management
    this.element.addEventListener('focus', this.boundHandlers.focus);
    this.element.addEventListener('blur', this.boundHandlers.blur);
    
    // Custom virtual scroll events
    this.element.addEventListener('virtualscroll:change', this.handleVirtualScrollChange.bind(this));
    this.element.addEventListener('virtualscroll:loading', this.handleVirtualScrollLoading.bind(this));
  }
  
  /**
   * Load data for Tom-Select (called by Tom-Select load option)
   */
  async handleLoad(query, callback) {
    try {
      console.log(`[VirtualSelect] Loading data for query: "${query}"`);
      
      // Use data provider to search and load data
      const results = await this.dataProvider.search(query, {
        limit: this.options.preloadSize,
        offset: 0
      });
      
      // Store current data reference
      this.currentData = results.items;
      
      // Set total items in virtual core
      this.virtualCore.setTotalItems(results.totalCount);
      
      // Execute callback with results
      callback(results.items);
      
      // Start virtual rendering after initial load
      if (!this.initialized) {
        this.initialized = true;
        this.startVirtualRendering();
      }
      
      console.log(`[VirtualSelect] Loaded ${results.items.length} items, total: ${results.totalCount}`);
      
    } catch (error) {
      console.error('[VirtualSelect] Data loading error:', error);
      callback([]);
    }
  }
  
  /**
   * Custom dropdown renderer with virtual scrolling container
   */
  renderDropdown() {
    return `
      <div class="ts-dropdown virtual-dropdown">
        <div class="virtual-scroll-container" style="position: relative; height: 300px; overflow-y: auto;">
          <div class="virtual-content" style="position: relative;"></div>
          <div class="virtual-spacer" style="height: 0px;"></div>
        </div>
        <div class="virtual-loading hidden">
          <div class="flex items-center justify-center p-4">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span class="ml-2">Loading more items...</span>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Custom option renderer for virtual scrolling
   */
  renderOption(data, escape) {
    // Use cached element if available
    const element = this.itemCache.getElement(
      data, 
      this.options.render.option || this.defaultOptionRenderer,
      this.tomSelect
    );
    
    return element.outerHTML;
  }
  
  /**
   * Default option renderer
   */
  defaultOptionRenderer(data, escape) {
    const avatar = data.avatar ? `<img src="${data.avatar}" alt="" class="w-8 h-8 rounded mr-3" loading="lazy">` : '';
    const badge = data.badge ? `<span class="ml-auto px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">${escape(data.badge)}</span>` : '';
    const description = data.description ? `<div class="text-sm text-gray-600">${escape(data.description)}</div>` : '';
    
    return `
      <div class="flex items-center p-3 hover:bg-gray-50 cursor-pointer transition-colors">
        ${avatar}
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">${escape(data.text || data.value || '')}</div>
          ${description}
        </div>
        ${badge}
      </div>
    `;
  }
  
  /**
   * Custom item renderer for selected items
   */
  renderItem(data, escape) {
    if (this.options.render.item && typeof this.options.render.item === 'function') {
      return this.options.render.item.call(this, data, escape);
    }
    
    return `<div class="item" data-value="${escape(data.value)}">${escape(data.text)}</div>`;
  }
  
  /**
   * Render option create
   */
  renderOptionCreate(data, escape) {
    return `<div class="create">Add <strong>${escape(data.input)}</strong>&hellip;</div>`;
  }
  
  /**
   * Render loading indicator
   */
  renderLoading() {
    if (this.options.render.loading) {
      return this.options.render.loading();
    }
    
    return `
      <div class="loading flex items-center justify-center p-4">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        <span class="ml-2 text-sm">Loading...</span>
      </div>
    `;
  }
  
  /**
   * Render no results message
   */
  renderNoResults() {
    if (this.options.render.noResults) {
      return this.options.render.noResults();
    }
    
    return `
      <div class="no-results text-center p-4 text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <div>No results found</div>
      </div>
    `;
  }
  
  /**
   * Start virtual rendering after Tom-Select initialization
   */
  startVirtualRendering() {
    if (this.isRendering) return;
    
    this.isRendering = true;
    
    // Get virtual scrolling elements
    const dropdown = this.tomSelect.dropdown;
    const scrollContainer = dropdown?.querySelector('.virtual-scroll-container');
    const contentContainer = dropdown?.querySelector('.virtual-content');
    const spacer = dropdown?.querySelector('.virtual-spacer');
    
    if (!scrollContainer || !contentContainer || !spacer) {
      console.error('[VirtualSelect] Virtual scrolling elements not found in dropdown');
      return;
    }
    
    // Configure virtual core with actual elements
    this.virtualCore.dropdown = scrollContainer;
    this.virtualCore.content = contentContainer;
    this.virtualCore.spacer = spacer;
    
    // Start scroll monitoring
    this.scrollManager.startMonitoring();
    
    // Initial viewport calculation and render
    this.virtualCore.calculateViewport();
    this.renderVirtualItems();
    
    console.log('[VirtualSelect] Virtual rendering started');
  }
  
  /**
   * Render virtual items in viewport
   */
  renderVirtualItems() {
    if (!this.virtualCore.content || !this.currentData.length) return;
    
    const renderStart = performance.now();
    const itemsToRender = this.virtualCore.getItemsToRender();
    
    // Clear existing virtual items
    this.clearVirtualItems();
    
    // Render visible items
    itemsToRender.forEach(itemInfo => {
      const data = this.currentData[itemInfo.index];
      if (!data) return;
      
      // Add virtual index and positioning info to data
      const virtualData = {
        ...data,
        virtualIndex: itemInfo.index,
        offset: itemInfo.offset,
        height: itemInfo.height
      };
      
      // Get element from cache
      const element = this.itemCache.getElement(
        virtualData,
        this.options.render.option || this.defaultOptionRenderer,
        this.tomSelect
      );
      
      // Set virtual item attributes
      element.classList.add('virtual-option');
      element.style.position = 'absolute';
      element.style.top = `${itemInfo.offset}px`;
      element.style.height = `${itemInfo.height}px`;
      element.style.left = '0';
      element.style.right = '0';
      
      // Add to visible items tracking
      this.visibleItems.set(itemInfo.index, element);
      
      // Add to DOM
      this.virtualCore.content.appendChild(element);
      
      // Measure actual height if needed
      if (!this.virtualCore.itemHeights.has(itemInfo.index)) {
        const actualHeight = element.offsetHeight;
        if (actualHeight > 0) {
          this.virtualCore.updateItemHeight(itemInfo.index, actualHeight);
        }
      }
    });
    
    // Update spacer height for total scroll area
    const totalHeight = this.virtualCore.getTotalHeight();
    if (this.virtualCore.spacer) {
      this.virtualCore.spacer.style.height = `${totalHeight}px`;
    }
    
    // Track performance
    const renderTime = performance.now() - renderStart;
    this.updatePerformanceMetrics(renderTime);
    
    console.log(`[VirtualSelect] Rendered ${itemsToRender.length} virtual items in ${renderTime.toFixed(2)}ms`);
  }
  
  /**
   * Clear virtual items from DOM and cache
   */
  clearVirtualItems() {
    // Release visible items back to cache
    this.visibleItems.forEach(element => {
      this.itemCache.releaseElement(element);
    });
    
    // Clear visible items tracking
    this.visibleItems.clear();
    
    // Clear content container
    if (this.virtualCore.content) {
      this.virtualCore.content.innerHTML = '';
    }
  }
  
  /**
   * Handle virtual scroll changes
   */
  handleVirtualScrollChange(event) {
    const { scrollTop, direction, velocity } = event.detail;
    
    // Update virtual rendering
    this.renderVirtualItems();
    
    // Preload data if scrolling fast
    if (velocity > 100 && direction === 'down') {
      this.preloadMoreData();
    }
    
    // Announce scroll position for accessibility
    if (this.options.accessibility.announceChanges) {
      this.announceScrollPosition(scrollTop);
    }
  }
  
  /**
   * Handle virtual scroll loading events
   */
  handleVirtualScrollLoading(event) {
    const { loading } = event.detail;
    const loadingIndicator = this.tomSelect.dropdown?.querySelector('.virtual-loading');
    
    if (loadingIndicator) {
      if (loading) {
        loadingIndicator.classList.remove('hidden');
      } else {
        loadingIndicator.classList.add('hidden');
      }
    }
  }
  
  /**
   * Preload more data for infinite scrolling
   */
  async preloadMoreData() {
    if (this.isLoadingMore || !this.scrollManager.hasMoreData) return;
    
    this.isLoadingMore = true;
    
    try {
      const currentLength = this.currentData.length;
      const results = await this.dataProvider.loadMoreData();
      
      if (results.items && results.items.length > 0) {
        this.currentData = [...this.currentData, ...results.items];
        this.virtualCore.setTotalItems(this.currentData.length);
        
        console.log(`[VirtualSelect] Preloaded ${results.items.length} more items, total: ${this.currentData.length}`);
      }
      
      this.scrollManager.setHasMoreData(results.hasMore);
      
    } catch (error) {
      console.error('[VirtualSelect] Error preloading data:', error);
    } finally {
      this.isLoadingMore = false;
    }
  }
  
  /**
   * Tom-Select event handlers
   */
  onTomSelectInitialize() {
    console.log('[VirtualSelect] Tom-Select initialized');
  }
  
  onTomSelectFocus() {
    if (this.options.accessibility.announceChanges) {
      this.announceState('Select focused');
    }
  }
  
  onTomSelectBlur() {
    if (this.options.accessibility.announceChanges) {
      this.announceState('Select blurred');
    }
  }
  
  onDropdownOpen() {
    // Start virtual rendering when dropdown opens
    setTimeout(() => {
      if (!this.initialized && this.currentData.length > 0) {
        this.startVirtualRendering();
      } else if (this.initialized) {
        this.renderVirtualItems();
      }
    }, 10);
    
    console.log('[VirtualSelect] Dropdown opened');
  }
  
  onDropdownClose() {
    // Clean up virtual items when dropdown closes
    this.clearVirtualItems();
    
    console.log('[VirtualSelect] Dropdown closed');
  }
  
  onItemAdd(value, item) {
    console.log('[VirtualSelect] Item added:', { value, item });
  }
  
  onItemRemove(value, item) {
    console.log('[VirtualSelect] Item removed:', { value, item });
  }
  
  onType(query) {
    // Debounce search to avoid excessive calls
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.performSearch(query);
    }, 150);
  }
  
  /**
   * Perform search with virtual scrolling
   */
  async performSearch(query) {
    try {
      console.log(`[VirtualSelect] Searching for: "${query}"`);
      
      const results = await this.dataProvider.search(query, {
        limit: this.options.preloadSize,
        offset: 0
      });
      
      // Update current data
      this.currentData = results.items;
      this.virtualCore.setTotalItems(results.totalCount);
      
      // Reset scroll position
      const scrollContainer = this.tomSelect.dropdown?.querySelector('.virtual-scroll-container');
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
      
      // Re-render virtual items
      this.renderVirtualItems();
      
      console.log(`[VirtualSelect] Search completed: ${results.items.length} results`);
      
    } catch (error) {
      console.error('[VirtualSelect] Search error:', error);
    }
  }
  
  /**
   * Handle window resize
   */
  handleResize() {
    if (this.virtualCore && this.initialized) {
      // Recalculate viewport on resize
      setTimeout(() => {
        this.virtualCore.calculateViewport();
        this.renderVirtualItems();
      }, 100);
    }
  }
  
  /**
   * Handle global keyboard navigation
   */
  handleKeydown(event) {
    if (!this.tomSelect.isOpen || !this.initialized) return;
    
    const { key } = event;
    const activeOption = this.tomSelect.activeOption;
    
    // Virtual scrolling keyboard navigation
    switch (key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        this.navigateVirtual(key === 'ArrowDown' ? 1 : -1);
        break;
      case 'PageDown':
      case 'PageUp':
        event.preventDefault();
        this.navigateVirtual(key === 'PageDown' ? 10 : -10);
        break;
      case 'Home':
        event.preventDefault();
        this.scrollToItem(0);
        break;
      case 'End':
        event.preventDefault();
        this.scrollToItem(this.currentData.length - 1);
        break;
    }
  }
  
  /**
   * Navigate virtual items with keyboard
   */
  navigateVirtual(delta) {
    const currentIndex = this.getCurrentActiveIndex();
    const newIndex = Math.max(0, Math.min(this.currentData.length - 1, currentIndex + delta));
    
    if (newIndex !== currentIndex) {
      this.setActiveItem(newIndex);
    }
  }
  
  /**
   * Get current active item index
   */
  getCurrentActiveIndex() {
    const activeOption = this.tomSelect.activeOption;
    if (!activeOption) return 0;
    
    const virtualIndex = activeOption.dataset.virtualIndex;
    return virtualIndex ? parseInt(virtualIndex) : 0;
  }
  
  /**
   * Set active item by index
   */
  setActiveItem(index) {
    const data = this.currentData[index];
    if (!data) return;
    
    // Ensure item is visible
    this.scrollToItem(index);
    
    // Set as active in Tom-Select
    const option = this.visibleItems.get(index);
    if (option) {
      this.tomSelect.setActiveOption(option);
      
      if (this.options.accessibility.announceChanges) {
        this.announceState(`${data.text || data.value} selected`);
      }
    }
  }
  
  /**
   * Scroll to specific item
   */
  scrollToItem(index, align = 'top') {
    if (this.virtualCore) {
      this.virtualCore.scrollToItem(index, align);
    }
  }
  
  /**
   * Announce state changes for accessibility
   */
  announceState(message) {
    if (!this.options.accessibility.enabled) return;
    
    // Create or update ARIA live region
    let liveRegion = document.getElementById('virtual-select-announcements');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'virtual-select-announcements';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.top = '-10000px';
      document.body.appendChild(liveRegion);
    }
    
    liveRegion.textContent = message;
  }
  
  /**
   * Announce scroll position for accessibility
   */
  announceScrollPosition(scrollTop) {
    const { start, end } = this.virtualCore.getVisibleRange();
    const total = this.currentData.length;
    
    if (total > 0) {
      this.announceState(`Showing items ${start + 1} to ${Math.min(end + 1, total)} of ${total}`);
    }
  }
  
  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    this.performanceInterval = setInterval(() => {
      this.updatePerformanceStats();
    }, 1000);
    
    console.log('[VirtualSelect] Performance monitoring started');
  }
  
  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(renderTime) {
    this.performance.renderCount++;
    this.performance.avgRenderTime = (
      (this.performance.avgRenderTime * (this.performance.renderCount - 1) + renderTime) /
      this.performance.renderCount
    );
  }
  
  /**
   * Update performance statistics
   */
  updatePerformanceStats() {
    // Memory usage estimation
    const estimatedMemory = (
      this.currentData.length * 0.5 + // 0.5KB per data item
      this.visibleItems.size * 2 + // 2KB per rendered element
      this.itemCache.getStats().totalElements * 1 // 1KB per cached element
    ) * 1024; // Convert to bytes
    
    this.performance.memoryUsage = estimatedMemory;
    
    // Get performance stats from components
    const scrollStats = this.scrollManager?.getPerformanceStats() || {};
    const cacheStats = this.itemCache?.getStats() || {};
    const virtualStats = this.virtualCore?.getStats() || {};
    
    // Update FPS from scroll manager
    this.performance.fps = scrollStats.averageFps || 60;
    
    // Log performance summary
    if (this.performance.renderCount % 10 === 0) {
      console.log('[VirtualSelect] Performance:', {
        fps: this.performance.fps.toFixed(1),
        avgRenderTime: this.performance.avgRenderTime.toFixed(2) + 'ms',
        memoryUsage: (this.performance.memoryUsage / 1024 / 1024).toFixed(2) + 'MB',
        cacheHitRate: cacheStats.hitRate,
        totalItems: this.currentData.length,
        visibleItems: this.visibleItems.size
      });
    }
  }
  
  /**
   * Get current performance statistics
   */
  getPerformanceStats() {
    return {
      ...this.performance,
      uptime: performance.now() - this.performance.startTime,
      components: {
        scrollManager: this.scrollManager?.getPerformanceStats(),
        itemCache: this.itemCache?.getStats(),
        virtualCore: this.virtualCore?.getStats(),
        dataProvider: this.dataProvider?.getStats()
      }
    };
  }
  
  /**
   * Public API methods
   */
  
  /**
   * Add new data to the virtual select
   */
  addData(items) {
    this.currentData = [...this.currentData, ...items];
    this.virtualCore.setTotalItems(this.currentData.length);
    
    if (this.initialized) {
      this.renderVirtualItems();
    }
    
    return this;
  }
  
  /**
   * Clear all data and reset
   */
  clearData() {
    this.currentData = [];
    this.virtualCore.setTotalItems(0);
    this.clearVirtualItems();
    
    if (this.tomSelect) {
      this.tomSelect.clear();
      this.tomSelect.clearOptions();
    }
    
    return this;
  }
  
  /**
   * Refresh virtual rendering
   */
  refresh() {
    if (this.initialized) {
      this.virtualCore.calculateViewport();
      this.renderVirtualItems();
    }
    
    return this;
  }
  
  /**
   * Get current value(s)
   */
  getValue() {
    return this.tomSelect ? this.tomSelect.getValue() : null;
  }
  
  /**
   * Set value(s)
   */
  setValue(value) {
    if (this.tomSelect) {
      this.tomSelect.setValue(value);
    }
    
    return this;
  }
  
  /**
   * Destroy the virtual select and clean up resources
   */
  destroy() {
    if (this.destroyed) return;
    
    console.log('[VirtualSelect] Destroying...');
    
    this.destroyed = true;
    
    // Stop performance monitoring
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = null;
    }
    
    // Clear search timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.boundHandlers.resize);
    document.removeEventListener('keydown', this.boundHandlers.keydown);
    this.element.removeEventListener('focus', this.boundHandlers.focus);
    this.element.removeEventListener('blur', this.boundHandlers.blur);
    
    // Clean up virtual items
    this.clearVirtualItems();
    
    // Destroy components
    if (this.scrollManager) {
      this.scrollManager.destroy();
      this.scrollManager = null;
    }
    
    if (this.virtualCore) {
      this.virtualCore.destroy();
      this.virtualCore = null;
    }
    
    if (this.itemCache) {
      this.itemCache.destroy();
      this.itemCache = null;
    }
    
    if (this.dataProvider) {
      this.dataProvider.destroy();
      this.dataProvider = null;
    }
    
    // Destroy Tom-Select
    if (this.tomSelect) {
      this.tomSelect.destroy();
      this.tomSelect = null;
    }
    
    // Remove announcements
    const liveRegion = document.getElementById('virtual-select-announcements');
    if (liveRegion) {
      liveRegion.remove();
    }
    
    console.log('[VirtualSelect] Destroyed successfully');
  }
}

// Export as default
export default VirtualSelect;