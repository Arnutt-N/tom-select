/**
 * Search Worker for Virtual Scrolling
 * Background search processing for large datasets
 * Prevents main thread blocking during intensive search operations
 */

// Worker-specific search utilities and algorithms
class SearchProcessor {
  constructor() {
    this.searchIndex = new Map();
    this.dataset = [];
    this.initialized = false;
  }
  
  /**
   * Initialize the search processor with dataset
   */
  initialize(data) {
    this.dataset = Array.isArray(data) ? data : (data.items || []);
    this.buildSearchIndex();
    this.initialized = true;
    
    return {
      success: true,
      totalItems: this.dataset.length,
      indexSize: this.searchIndex.size
    };
  }
  
  /**
   * Build comprehensive search index
   */
  buildSearchIndex() {
    console.log('[SearchWorker] Building search index...');
    this.searchIndex.clear();
    
    this.dataset.forEach((item, index) => {
      // Extract all searchable terms
      const terms = this.extractSearchTerms(item);
      
      // Add to inverted index
      terms.forEach(term => {
        if (!this.searchIndex.has(term)) {
          this.searchIndex.set(term, []);
        }
        this.searchIndex.get(term).push({
          index,
          item,
          relevance: this.getTermRelevance(term, item)
        });
      });
    });
    
    console.log(`[SearchWorker] Index built with ${this.searchIndex.size} terms`);
  }
  
  /**
   * Extract searchable terms from an item
   */
  extractSearchTerms(item) {
    const terms = new Set();
    
    // Process text fields
    const textFields = ['text', 'description', 'category'];
    textFields.forEach(field => {
      if (item[field] && typeof item[field] === 'string') {
        const fieldTerms = this.tokenize(item[field]);
        fieldTerms.forEach(term => terms.add(term));
      }
    });
    
    // Process array fields (tags, keywords)
    const arrayFields = ['tags', 'searchKeywords'];
    arrayFields.forEach(field => {
      if (item[field] && Array.isArray(item[field])) {
        item[field].forEach(value => {
          const tokens = this.tokenize(String(value));
          tokens.forEach(term => terms.add(term));
        });
      }
    });
    
    // Process nested object fields
    if (item.metrics && typeof item.metrics === 'object') {
      Object.values(item.metrics).forEach(value => {
        if (typeof value === 'string') {
          const tokens = this.tokenize(value);
          tokens.forEach(term => terms.add(term));
        }
      });
    }
    
    return Array.from(terms);
  }
  
  /**
   * Tokenize text into searchable terms
   */
  tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Replace non-word chars with spaces
      .split(/\s+/)              // Split on whitespace
      .filter(term => term.length > 1)  // Remove single chars
      .map(term => term.trim())  // Trim whitespace
      .filter(term => term.length > 0); // Remove empty terms
  }
  
  /**
   * Get relevance score for a term in an item
   */
  getTermRelevance(term, item) {
    let relevance = 0;
    
    // Text field relevance (highest priority)
    if (item.text && item.text.toLowerCase().includes(term)) {
      relevance += item.text.toLowerCase() === term ? 100 : 50;
    }
    
    // Description relevance
    if (item.description && item.description.toLowerCase().includes(term)) {
      relevance += 20;
    }
    
    // Category relevance
    if (item.category && item.category.toLowerCase().includes(term)) {
      relevance += 15;
    }
    
    // Tags relevance
    if (item.tags && Array.isArray(item.tags)) {
      const tagMatches = item.tags.filter(tag => 
        tag.toLowerCase().includes(term)
      ).length;
      relevance += tagMatches * 10;
    }
    
    // Weight boost
    relevance += (item.weight || 0) * 0.1;
    
    return relevance;
  }
  
  /**
   * Perform search with ranking and filtering
   */
  search(query, options = {}) {
    if (!this.initialized) {
      throw new Error('Search processor not initialized');
    }
    
    const startTime = performance.now();
    
    // Parse query and options
    const searchQuery = query.trim().toLowerCase();
    const searchOptions = {
      limit: options.limit || 50,
      offset: options.offset || 0,
      sortBy: options.sortBy || 'relevance',
      sortOrder: options.sortOrder || 'desc',
      minRelevance: options.minRelevance || 0,
      fuzzySearch: options.fuzzySearch !== false,
      exactMatch: options.exactMatch || false,
      ...options
    };
    
    let results = [];
    
    if (!searchQuery) {
      // No query - return all items
      results = this.dataset.map((item, index) => ({
        item,
        index,
        relevance: item.weight || 0,
        matches: []
      }));
    } else {
      // Perform search
      results = this.performSearch(searchQuery, searchOptions);
    }
    
    // Sort results
    this.sortResults(results, searchOptions);
    
    // Apply pagination
    const totalResults = results.length;
    const paginatedResults = results.slice(
      searchOptions.offset,
      searchOptions.offset + searchOptions.limit
    );
    
    const searchTime = performance.now() - startTime;
    
    return {
      query: query,
      results: paginatedResults.map(r => ({
        ...r.item,
        _relevance: r.relevance,
        _matches: r.matches
      })),
      pagination: {
        offset: searchOptions.offset,
        limit: searchOptions.limit,
        total: totalResults,
        hasMore: totalResults > searchOptions.offset + searchOptions.limit
      },
      performance: {
        searchTime: Math.round(searchTime),
        indexHits: this.lastIndexHits || 0,
        totalItems: this.dataset.length
      }
    };
  }
  
  /**
   * Perform the actual search operation
   */
  performSearch(query, options) {
    const queryTerms = this.tokenize(query);
    const candidateSet = new Map(); // item index -> {item, relevance, matches}
    
    this.lastIndexHits = 0;
    
    // Find candidates using search index
    queryTerms.forEach(term => {
      const indexEntries = this.searchIndex.get(term) || [];
      this.lastIndexHits += indexEntries.length;
      
      indexEntries.forEach(entry => {
        const { index, item, relevance } = entry;
        
        if (candidateSet.has(index)) {
          // Boost existing candidate
          const candidate = candidateSet.get(index);
          candidate.relevance += relevance;
          candidate.matches.push(term);
        } else {
          // New candidate
          candidateSet.set(index, {
            item,
            index,
            relevance,
            matches: [term]
          });
        }
      });
    });
    
    // Convert to array and apply fuzzy search if needed
    let candidates = Array.from(candidateSet.values());
    
    // Apply fuzzy search for partial matches
    if (options.fuzzySearch && candidates.length < options.limit) {
      const fuzzyResults = this.performFuzzySearch(query, queryTerms, candidates);
      candidates = [...candidates, ...fuzzyResults];
    }
    
    // Filter by minimum relevance
    if (options.minRelevance > 0) {
      candidates = candidates.filter(c => c.relevance >= options.minRelevance);
    }
    
    // Apply exact match filter if requested
    if (options.exactMatch) {
      candidates = candidates.filter(c => 
        c.matches.some(match => match === query.toLowerCase())
      );
    }
    
    return candidates;
  }
  
  /**
   * Perform fuzzy search for partial matches
   */
  performFuzzySearch(originalQuery, queryTerms, existingCandidates) {
    const fuzzyResults = [];
    const existingIndices = new Set(existingCandidates.map(c => c.index));
    
    // Search for partial matches
    this.dataset.forEach((item, index) => {
      if (existingIndices.has(index)) return;
      
      const fuzzyScore = this.calculateFuzzyScore(item, originalQuery, queryTerms);
      
      if (fuzzyScore > 0) {
        fuzzyResults.push({
          item,
          index,
          relevance: fuzzyScore,
          matches: queryTerms.filter(term => 
            JSON.stringify(item).toLowerCase().includes(term)
          )
        });
      }
    });
    
    return fuzzyResults;
  }
  
  /**
   * Calculate fuzzy matching score
   */
  calculateFuzzyScore(item, query, queryTerms) {
    let score = 0;
    const itemText = JSON.stringify(item).toLowerCase();
    
    // Partial string matching
    if (itemText.includes(query.toLowerCase())) {
      score += 25;
    }
    
    // Term matching with edit distance
    queryTerms.forEach(term => {
      if (itemText.includes(term)) {
        score += 10;
      } else {
        // Simple character-based similarity
        const similarity = this.calculateSimilarity(term, itemText);
        if (similarity > 0.6) {
          score += similarity * 5;
        }
      }
    });
    
    return Math.round(score);
  }
  
  /**
   * Calculate string similarity (Jaccard index)
   */
  calculateSimilarity(str1, str2) {
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
  
  /**
   * Sort search results
   */
  sortResults(results, options) {
    const { sortBy, sortOrder } = options;
    
    results.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'relevance':
          aVal = a.relevance || 0;
          bVal = b.relevance || 0;
          break;
        case 'text':
          aVal = a.item.text || '';
          bVal = b.item.text || '';
          break;
        case 'weight':
          aVal = a.item.weight || 0;
          bVal = b.item.weight || 0;
          break;
        default:
          aVal = a.item[sortBy] || '';
          bVal = b.item[sortBy] || '';
      }
      
      // Handle numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      }
      
      // Handle string comparison
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }
  
  /**
   * Get search statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      totalItems: this.dataset.length,
      indexSize: this.searchIndex.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  
  /**
   * Estimate memory usage
   */
  estimateMemoryUsage() {
    // Rough estimate: dataset + index
    const datasetSize = this.dataset.length * 1024; // ~1KB per item
    const indexSize = this.searchIndex.size * 512;  // ~512B per index entry
    
    return Math.round((datasetSize + indexSize) / 1024 / 1024 * 100) / 100; // MB
  }
  
  /**
   * Clear all data and reset
   */
  clear() {
    this.dataset = [];
    this.searchIndex.clear();
    this.initialized = false;
    
    return { success: true };
  }
}

// Create search processor instance
const searchProcessor = new SearchProcessor();

// Worker message handler
self.addEventListener('message', async (event) => {
  const { id, type, data } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'initialize':
        result = searchProcessor.initialize(data);
        break;
        
      case 'search':
        result = searchProcessor.search(data.query, data.options);
        break;
        
      case 'getStats':
        result = searchProcessor.getStats();
        break;
        
      case 'clear':
        result = searchProcessor.clear();
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    // Send success response
    self.postMessage({
      id,
      type: 'success',
      data: result
    });
    
  } catch (error) {
    // Send error response
    self.postMessage({
      id,
      type: 'error',
      data: {
        message: error.message,
        stack: error.stack
      }
    });
  }
});

// Handle worker termination
self.addEventListener('beforeunload', () => {
  searchProcessor.clear();
});

// Notify that worker is ready
self.postMessage({
  type: 'ready',
  data: { 
    timestamp: Date.now(),
    capabilities: ['search', 'fuzzy-search', 'indexing', 'ranking']
  }
});