/**
 * Data Provider for Virtual Scrolling
 * Manages large datasets, chunked loading, and search indexing
 * for high-performance virtual scrolling in Tom-Select
 */

/**
 * Manages large datasets with efficient loading, searching, and memory optimization
 */
export class DataProvider {
  constructor(options = {}) {
    this.options = {
      chunkSize: 1000,           // Items per chunk
      maxMemoryChunks: 5,        // Maximum chunks to keep in memory
      searchChunkSize: 500,      // Items to process per search chunk
      preloadChunks: 2,          // Chunks to preload ahead
      enableIndexing: true,      // Enable search indexing
      enableSorting: true,       // Enable sorting capabilities
      cacheDuration: 5 * 60 * 1000, // 5 minutes cache duration
      ...options
    };
    
    // Data management
    this.chunks = new Map();           // Loaded data chunks
    this.chunkIndex = new Map();       // Index of which items are in which chunks
    this.searchIndex = new Map();      // Search index for fast lookups
    this.sortedIndices = new Map();    // Sorted indices for different sort orders
    
    // Dataset state
    this.totalItems = 0;
    this.loadedItems = 0;
    this.currentChunk = 0;
    this.maxChunks = 0;
    
    // Data source
    this.dataSource = null;
    this.baseDataset = null;
    
    // Loading state
    this.isLoading = false;
    this.loadingPromises = new Map();
    this.lastLoadTime = 0;
    
    // Search state
    this.searchWorker = null;
    this.lastSearchQuery = '';
    this.searchResults = null;
    
    // Performance tracking
    this.stats = {
      chunksLoaded: 0,
      searchQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalLoadTime: 0,
      averageLoadTime: 0
    };
    
    console.log('[DataProvider] Initialized with options:', this.options);
  }
  
  /**
   * Initialize the data provider with a data source
   */
  async initialize(dataSource) {
    try {
      console.log('[DataProvider] Initializing with data source...');
      
      this.dataSource = dataSource;
      
      // Load metadata or initial chunk
      if (typeof dataSource === 'string') {
        // URL-based data source
        await this.loadFromURL(dataSource);
      } else if (Array.isArray(dataSource)) {
        // Array-based data source
        await this.loadFromArray(dataSource);
      } else if (typeof dataSource === 'object' && dataSource.items) {
        // Object with items array
        await this.loadFromObject(dataSource);
      } else if (typeof dataSource === 'function') {
        // Function-based data source
        await this.loadFromFunction(dataSource);
      } else {
        throw new Error('Unsupported data source type');
      }
      
      // Initialize search indexing if enabled
      if (this.options.enableIndexing) {
        await this.buildSearchIndex();
      }
      
      console.log(`[DataProvider] Initialized with ${this.totalItems} total items`);
      
    } catch (error) {
      console.error('[DataProvider] Initialization error:', error);
      throw error;
    }
  }
  
  /**
   * Load data from URL
   */
  async loadFromURL(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load data from ${url}: ${response.statusText}`);
    }
    
    const data = await response.json();
    await this.loadFromObject(data);
  }
  
  /**
   * Load data from array
   */
  async loadFromArray(array) {
    this.baseDataset = array;
    this.totalItems = array.length;
    this.maxChunks = Math.ceil(this.totalItems / this.options.chunkSize);
    
    // Load first chunk
    await this.loadChunk(0);
  }
  
  /**
   * Load data from object with metadata
   */
  async loadFromObject(dataObj) {
    if (dataObj.items && Array.isArray(dataObj.items)) {
      // Check if we need to generate more data
      if (dataObj.metadata && dataObj.metadata.totalItems > dataObj.items.length) {
        // Generate synthetic data based on templates
        await this.generateSyntheticData(dataObj);
      } else {
        await this.loadFromArray(dataObj.items);
      }
    } else {
      throw new Error('Data object must contain an "items" array');
    }
  }
  
  /**
   * Load data from function
   */
  async loadFromFunction(fn) {
    const result = await fn(0, this.options.chunkSize);
    
    if (result && result.items && Array.isArray(result.items)) {
      this.totalItems = result.total || result.items.length;
      this.maxChunks = Math.ceil(this.totalItems / this.options.chunkSize);
      
      // Store first chunk
      this.storeChunk(0, result.items);
    } else {
      throw new Error('Function must return object with items array');
    }
  }
  
  /**
   * Generate synthetic data based on templates
   */
  async generateSyntheticData(dataObj) {
    console.log('[DataProvider] Generating synthetic data...');
    
    const { metadata, items: baseItems, dataGenerator } = dataObj;
    const targetTotal = metadata.totalItems || 15000;
    const generated = [];
    
    // Use base items as templates
    const templates = baseItems.slice(0, Math.min(10, baseItems.length));
    
    for (let i = baseItems.length; i < targetTotal; i++) {
      const template = templates[i % templates.length];
      const syntheticItem = this.generateSyntheticItem(template, i, dataGenerator);
      generated.push(syntheticItem);
    }
    
    // Combine base and generated items
    const allItems = [...baseItems, ...generated];
    await this.loadFromArray(allItems);
    
    console.log(`[DataProvider] Generated ${generated.length} synthetic items`);
  }
  
  /**
   * Generate a single synthetic item
   */
  generateSyntheticItem(template, index, dataGenerator) {
    const categories = ['companies', 'technologies', 'locations', 'people', 'products'];
    const category = categories[index % categories.length];
    
    const item = {
      id: String(index + 1),
      value: `item-${index + 1}`,
      virtualIndex: index,
      category: category,
      ...this.generateItemByCategory(category, index, dataGenerator)
    };
    
    return item;
  }
  
  /**
   * Generate item content by category
   */
  generateItemByCategory(category, index, dataGenerator) {
    const colors = ['FF6B6B', '4ECDC4', '45B7D1', 'F9CA24', 'F0932B', 'EB4D4B', '6C5CE7'];
    const color = colors[index % colors.length];
    
    switch (category) {
      case 'companies':
        return {
          text: `${dataGenerator?.companies?.[index % 25] || 'Company'} ${index}`,
          description: `Innovative technology company focused on next-generation solutions. Founded in ${1990 + (index % 30)}.`,
          avatar: `https://via.placeholder.com/32/${color}/ffffff?text=C`,
          badge: index % 10 === 0 ? 'Fortune 500' : index % 5 === 0 ? 'Startup' : '',
          tags: ['business', 'technology', 'innovation'],
          weight: 50 + (index % 50)
        };
        
      case 'technologies':
        return {
          text: `${dataGenerator?.technologies?.[index % 30] || 'Technology'} v${(index % 10) + 1}.0`,
          description: `Advanced programming technology for modern software development. Created in ${2000 + (index % 20)}.`,
          avatar: `https://via.placeholder.com/32/${color}/ffffff?text=T`,
          badge: index % 7 === 0 ? 'Popular' : index % 11 === 0 ? 'Trending' : '',
          tags: ['programming', 'software', 'development'],
          weight: 60 + (index % 40)
        };
        
      case 'locations':
        return {
          text: `${dataGenerator?.locations?.[index % 25] || 'Location'} ${index}`,
          description: `Dynamic metropolitan area with rich culture and growing economy. Population: ${(100000 + (index * 1000)).toLocaleString()}.`,
          avatar: `https://via.placeholder.com/32/${color}/ffffff?text=L`,
          badge: index % 8 === 0 ? 'Major City' : index % 12 === 0 ? 'Growing' : '',
          tags: ['location', 'city', 'metropolitan'],
          weight: 40 + (index % 60)
        };
        
      case 'people':
        const firstNames = dataGenerator?.firstNames || ['John', 'Jane', 'Michael', 'Sarah', 'David'];
        const lastNames = dataGenerator?.lastNames || ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
        const firstName = firstNames[index % firstNames.length];
        const lastName = lastNames[(index + 3) % lastNames.length];
        
        return {
          text: `${firstName} ${lastName}`,
          description: `Professional with ${(index % 20) + 5} years of experience in technology and innovation.`,
          avatar: `https://via.placeholder.com/32/${color}/ffffff?text=${firstName.charAt(0)}`,
          badge: index % 6 === 0 ? 'Expert' : index % 9 === 0 ? 'Leader' : '',
          tags: ['professional', 'expert', 'individual'],
          weight: 45 + (index % 55)
        };
        
      case 'products':
        return {
          text: `${dataGenerator?.products?.[index % 20] || 'Product'} ${index}`,
          description: `Innovative consumer product designed for modern lifestyle. Price: $${(10 + (index % 1000)).toLocaleString()}.`,
          avatar: `https://via.placeholder.com/32/${color}/ffffff?text=P`,
          badge: index % 15 === 0 ? 'Best Seller' : index % 20 === 0 ? 'New' : '',
          tags: ['product', 'consumer', 'innovation'],
          weight: 35 + (index % 65)
        };
        
      default:
        return {
          text: `Item ${index}`,
          description: `Generated item number ${index} for virtual scrolling testing.`,
          avatar: `https://via.placeholder.com/32/${color}/ffffff?text=I`,
          badge: '',
          tags: ['generated', 'test'],
          weight: 50
        };
    }
  }
  
  /**
   * Load a specific chunk of data
   */
  async loadChunk(chunkIndex) {
    if (this.chunks.has(chunkIndex)) {
      this.stats.cacheHits++;
      return this.chunks.get(chunkIndex);
    }
    
    // Check if already loading
    if (this.loadingPromises.has(chunkIndex)) {
      return await this.loadingPromises.get(chunkIndex);
    }
    
    const loadPromise = this.performChunkLoad(chunkIndex);
    this.loadingPromises.set(chunkIndex, loadPromise);
    
    try {
      const chunk = await loadPromise;
      this.loadingPromises.delete(chunkIndex);
      return chunk;
    } catch (error) {
      this.loadingPromises.delete(chunkIndex);
      throw error;
    }
  }
  
  /**
   * Perform the actual chunk loading
   */
  async performChunkLoad(chunkIndex) {
    const startTime = performance.now();
    
    console.log(`[DataProvider] Loading chunk ${chunkIndex}...`);
    
    this.isLoading = true;
    this.stats.cacheMisses++;
    
    try {
      const startIdx = chunkIndex * this.options.chunkSize;
      const endIdx = Math.min(startIdx + this.options.chunkSize, this.totalItems);
      
      let chunkData;
      
      if (this.baseDataset) {
        // Load from in-memory dataset
        chunkData = this.baseDataset.slice(startIdx, endIdx);
      } else if (typeof this.dataSource === 'function') {
        // Load from function
        const result = await this.dataSource(startIdx, endIdx - startIdx);
        chunkData = result.items || [];
      } else {
        throw new Error('No valid data source available');
      }
      
      // Add virtual indices
      chunkData = chunkData.map((item, localIndex) => ({
        ...item,
        virtualIndex: startIdx + localIndex
      }));
      
      // Store chunk
      this.storeChunk(chunkIndex, chunkData);
      
      const loadTime = performance.now() - startTime;
      this.updateLoadStats(loadTime);
      
      console.log(`[DataProvider] Loaded chunk ${chunkIndex} (${chunkData.length} items) in ${loadTime.toFixed(2)}ms`);
      
      return chunkData;
      
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Store a chunk in memory with cleanup
   */
  storeChunk(chunkIndex, chunkData) {
    // Store chunk data
    this.chunks.set(chunkIndex, chunkData);
    
    // Update chunk index
    chunkData.forEach((item, localIndex) => {
      const globalIndex = chunkIndex * this.options.chunkSize + localIndex;
      this.chunkIndex.set(globalIndex, chunkIndex);
    });
    
    // Update statistics
    this.stats.chunksLoaded++;
    this.loadedItems = Math.max(this.loadedItems, (chunkIndex + 1) * this.options.chunkSize);
    
    // Perform memory cleanup if needed
    this.performMemoryCleanup();
  }
  
  /**
   * Perform memory cleanup by removing old chunks
   */
  performMemoryCleanup() {
    if (this.chunks.size <= this.options.maxMemoryChunks) {
      return;
    }
    
    // Get chunks sorted by last access (LRU)
    const sortedChunks = Array.from(this.chunks.keys()).sort((a, b) => {
      const aTime = this.chunkIndex.get(a * this.options.chunkSize) || 0;
      const bTime = this.chunkIndex.get(b * this.options.chunkSize) || 0;
      return aTime - bTime;
    });
    
    // Remove oldest chunks
    const chunksToRemove = sortedChunks.slice(0, this.chunks.size - this.options.maxMemoryChunks);
    
    chunksToRemove.forEach(chunkIndex => {
      this.chunks.delete(chunkIndex);
      
      // Remove from chunk index
      for (let i = chunkIndex * this.options.chunkSize; 
           i < (chunkIndex + 1) * this.options.chunkSize; 
           i++) {
        this.chunkIndex.delete(i);
      }
    });
    
    console.log(`[DataProvider] Cleaned up ${chunksToRemove.length} chunks from memory`);
  }
  
  /**
   * Get items in a range (loads chunks as needed)
   */
  async getItemsInRange(startIndex, endIndex) {
    const items = [];
    
    const startChunk = Math.floor(startIndex / this.options.chunkSize);
    const endChunk = Math.floor(endIndex / this.options.chunkSize);
    
    // Load all required chunks
    const chunkPromises = [];
    for (let chunkIndex = startChunk; chunkIndex <= endChunk; chunkIndex++) {
      chunkPromises.push(this.loadChunk(chunkIndex));
    }
    
    const chunks = await Promise.all(chunkPromises);
    
    // Extract items from chunks
    for (let i = startIndex; i <= endIndex && i < this.totalItems; i++) {
      const chunkIndex = Math.floor(i / this.options.chunkSize);
      const localIndex = i % this.options.chunkSize;
      const chunk = chunks[chunkIndex - startChunk];
      
      if (chunk && chunk[localIndex]) {
        items.push(chunk[localIndex]);
      }
    }
    
    return items;
  }
  
  /**
   * Search through the entire dataset
   */
  async search(query, options = {}) {
    if (!query || query.trim() === '') {
      this.searchResults = null;
      return await this.getItemsInRange(0, Math.min(50, this.totalItems - 1));
    }
    
    this.stats.searchQueries++;
    this.lastSearchQuery = query;
    
    const searchOptions = {
      limit: options.limit || 50,
      offset: options.offset || 0,
      sortBy: options.sortBy || 'weight',
      sortOrder: options.sortOrder || 'desc',
      ...options
    };
    
    console.log(`[DataProvider] Searching for "${query}" with options:`, searchOptions);
    
    // Use search worker if available and dataset is large
    if (this.searchWorker && this.totalItems > 5000) {
      return await this.searchWithWorker(query, searchOptions);
    }
    
    // Perform synchronous search
    return await this.searchSynchronous(query, searchOptions);
  }
  
  /**
   * Perform synchronous search
   */
  async searchSynchronous(query, options) {
    const results = [];
    const searchTerm = query.toLowerCase().trim();
    
    // Search through loaded chunks first
    for (const [chunkIndex, chunk] of this.chunks.entries()) {
      for (const item of chunk) {
        if (this.matchesSearch(item, searchTerm)) {
          results.push({ ...item, relevance: this.calculateRelevance(item, searchTerm) });
        }
      }
    }
    
    // If we don't have enough results, search unloaded chunks
    if (results.length < options.limit) {
      const additionalResults = await this.searchUnloadedChunks(searchTerm, options);
      results.push(...additionalResults);
    }
    
    // Sort results
    this.sortSearchResults(results, options);
    
    // Apply pagination
    const paginatedResults = results.slice(options.offset, options.offset + options.limit);
    
    this.searchResults = {
      query,
      results: paginatedResults,
      total: results.length,
      hasMore: results.length > options.offset + options.limit
    };
    
    return paginatedResults;
  }
  
  /**
   * Search unloaded chunks
   */
  async searchUnloadedChunks(searchTerm, options) {
    const results = [];
    const loadedChunks = new Set(this.chunks.keys());
    
    // Search in batches to avoid loading everything at once
    for (let chunkIndex = 0; chunkIndex < this.maxChunks; chunkIndex++) {
      if (loadedChunks.has(chunkIndex)) continue;
      
      try {
        const chunk = await this.loadChunk(chunkIndex);
        for (const item of chunk) {
          if (this.matchesSearch(item, searchTerm)) {
            results.push({ ...item, relevance: this.calculateRelevance(item, searchTerm) });
          }
        }
        
        // Stop if we have enough results
        if (results.length >= options.limit * 2) {
          break;
        }
      } catch (error) {
        console.warn(`[DataProvider] Error loading chunk ${chunkIndex} for search:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Check if item matches search query
   */
  matchesSearch(item, searchTerm) {
    const searchFields = ['text', 'description', 'tags', 'category'];
    
    return searchFields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(searchTerm);
      } else if (Array.isArray(value)) {
        return value.some(v => String(v).toLowerCase().includes(searchTerm));
      }
      return false;
    });
  }
  
  /**
   * Calculate search relevance score
   */
  calculateRelevance(item, searchTerm) {
    let score = 0;
    
    // Exact matches get higher scores
    if (item.text && item.text.toLowerCase() === searchTerm) {
      score += 100;
    } else if (item.text && item.text.toLowerCase().includes(searchTerm)) {
      score += 50;
    }
    
    // Description matches
    if (item.description && item.description.toLowerCase().includes(searchTerm)) {
      score += 20;
    }
    
    // Tag matches
    if (item.tags && Array.isArray(item.tags)) {
      score += item.tags.filter(tag => tag.toLowerCase().includes(searchTerm)).length * 10;
    }
    
    // Weight factor
    score += (item.weight || 0) * 0.1;
    
    return score;
  }
  
  /**
   * Sort search results
   */
  sortSearchResults(results, options) {
    const { sortBy, sortOrder } = options;
    
    results.sort((a, b) => {
      let aVal, bVal;
      
      if (sortBy === 'relevance') {
        aVal = a.relevance || 0;
        bVal = b.relevance || 0;
      } else {
        aVal = a[sortBy] || '';
        bVal = b[sortBy] || '';
      }
      
      // Handle numeric values
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      }
      
      // Handle string values
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }
  
  /**
   * Build search index for fast lookups
   */
  async buildSearchIndex() {
    if (!this.options.enableIndexing) return;
    
    console.log('[DataProvider] Building search index...');
    
    // Clear existing index
    this.searchIndex.clear();
    
    // Index loaded chunks
    for (const [chunkIndex, chunk] of this.chunks.entries()) {
      for (const item of chunk) {
        this.indexItem(item);
      }
    }
    
    console.log(`[DataProvider] Search index built with ${this.searchIndex.size} entries`);
  }
  
  /**
   * Index a single item for search
   */
  indexItem(item) {
    const terms = new Set();
    
    // Extract searchable terms
    if (item.text) {
      item.text.toLowerCase().split(/\s+/).forEach(term => terms.add(term));
    }
    
    if (item.description) {
      item.description.toLowerCase().split(/\s+/).forEach(term => terms.add(term));
    }
    
    if (item.tags && Array.isArray(item.tags)) {
      item.tags.forEach(tag => terms.add(tag.toLowerCase()));
    }
    
    // Add to index
    terms.forEach(term => {
      if (!this.searchIndex.has(term)) {
        this.searchIndex.set(term, []);
      }
      this.searchIndex.get(term).push(item.virtualIndex);
    });
  }
  
  /**
   * Load more data for infinite scrolling
   */
  async loadMoreData() {
    if (this.currentChunk >= this.maxChunks - 1) {
      return false; // No more data
    }
    
    this.currentChunk++;
    await this.loadChunk(this.currentChunk);
    
    return this.currentChunk < this.maxChunks - 1;
  }
  
  /**
   * Preload items ahead of current position
   */
  async preloadItems(count) {
    const chunksToPreload = Math.ceil(count / this.options.chunkSize);
    const startChunk = this.currentChunk + 1;
    
    const promises = [];
    for (let i = 0; i < chunksToPreload && startChunk + i < this.maxChunks; i++) {
      promises.push(this.loadChunk(startChunk + i));
    }
    
    await Promise.all(promises);
    console.log(`[DataProvider] Preloaded ${chunksToPreload} chunks`);
  }
  
  /**
   * Update load statistics
   */
  updateLoadStats(loadTime) {
    this.stats.totalLoadTime += loadTime;
    this.stats.averageLoadTime = this.stats.totalLoadTime / this.stats.chunksLoaded;
    this.lastLoadTime = loadTime;
  }
  
  /**
   * Get total number of items
   */
  getTotalItems() {
    return this.totalItems;
  }
  
  /**
   * Get loading state
   */
  getLoadingState() {
    return {
      isLoading: this.isLoading,
      loadedItems: this.loadedItems,
      totalItems: this.totalItems,
      loadedPercentage: (this.loadedItems / this.totalItems) * 100,
      currentChunk: this.currentChunk,
      totalChunks: this.maxChunks
    };
  }
  
  /**
   * Get performance statistics
   */
  getStats() {
    return {
      ...this.stats,
      chunksInMemory: this.chunks.size,
      indexSize: this.searchIndex.size,
      totalItems: this.totalItems,
      loadedItems: this.loadedItems,
      memoryUsage: `${(this.chunks.size * this.options.chunkSize * 1024 / 1024).toFixed(2)}MB`
    };
  }
  
  /**
   * Clear all cached data
   */
  clear() {
    this.chunks.clear();
    this.chunkIndex.clear();
    this.searchIndex.clear();
    this.loadingPromises.clear();
    this.searchResults = null;
    this.currentChunk = 0;
    
    console.log('[DataProvider] All data cleared');
  }
  
  /**
   * Destroy the data provider
   */
  destroy() {
    console.log('[DataProvider] Destroying...');
    
    this.clear();
    
    if (this.searchWorker) {
      this.searchWorker.terminate();
      this.searchWorker = null;
    }
    
    console.log('[DataProvider] Destroyed');
  }
}