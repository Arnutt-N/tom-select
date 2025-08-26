/**
 * Mock API Service for Testing Remote Data Loading
 * Simulates backend API endpoints with realistic responses and delays
 */

// Mock database with extended data
const MOCK_DATA = [
  {
    id: '1',
    name: 'JavaScript',
    description: 'High-level, interpreted programming language',
    avatar: 'https://via.placeholder.com/32/f7df1e/000000?text=JS',
    language: 'JavaScript',
    stars: 95000,
    updated: '2025-01-26',
    tags: ['web', 'frontend', 'backend', 'fullstack'],
    category: 'Language',
    difficulty: 'Beginner'
  },
  {
    id: '2',
    name: 'TypeScript',
    description: 'Typed superset of JavaScript that compiles to plain JavaScript',
    avatar: 'https://via.placeholder.com/32/007acc/ffffff?text=TS',
    language: 'TypeScript',
    stars: 88000,
    updated: '2025-01-26',
    tags: ['web', 'frontend', 'backend', 'typed'],
    category: 'Language',
    difficulty: 'Intermediate'
  },
  {
    id: '3',
    name: 'React',
    description: 'A JavaScript library for building user interfaces',
    avatar: 'https://via.placeholder.com/32/61dafb/000000?text=R',
    language: 'JavaScript',
    stars: 210000,
    updated: '2025-01-26',
    tags: ['web', 'frontend', 'ui', 'library'],
    category: 'Framework',
    difficulty: 'Intermediate'
  },
  {
    id: '4',
    name: 'Vue.js',
    description: 'The Progressive JavaScript Framework',
    avatar: 'https://via.placeholder.com/32/4fc08d/ffffff?text=V',
    language: 'JavaScript',
    stars: 205000,
    updated: '2025-01-26',
    tags: ['web', 'frontend', 'ui', 'framework'],
    category: 'Framework',
    difficulty: 'Beginner'
  },
  {
    id: '5',
    name: 'Node.js',
    description: 'JavaScript runtime built on Chrome\'s V8 JavaScript engine',
    avatar: 'https://via.placeholder.com/32/339933/ffffff?text=N',
    language: 'JavaScript',
    stars: 92000,
    updated: '2025-01-26',
    tags: ['backend', 'runtime', 'server'],
    category: 'Runtime',
    difficulty: 'Intermediate'
  },
  {
    id: '6',
    name: 'Python',
    description: 'High-level programming language for general-purpose programming',
    avatar: 'https://via.placeholder.com/32/3776ab/ffffff?text=PY',
    language: 'Python',
    stars: 180000,
    updated: '2025-01-26',
    tags: ['backend', 'data-science', 'ai', 'scripting'],
    category: 'Language',
    difficulty: 'Beginner'
  },
  {
    id: '7',
    name: 'Django',
    description: 'High-level Python web framework',
    avatar: 'https://via.placeholder.com/32/092e20/ffffff?text=DJ',
    language: 'Python',
    stars: 72000,
    updated: '2025-01-26',
    tags: ['backend', 'framework', 'python', 'web'],
    category: 'Framework',
    difficulty: 'Intermediate'
  },
  {
    id: '8',
    name: 'Express.js',
    description: 'Fast, unopinionated, minimalist web framework for Node.js',
    avatar: 'https://via.placeholder.com/32/000000/ffffff?text=EX',
    language: 'JavaScript',
    stars: 61000,
    updated: '2025-01-26',
    tags: ['backend', 'framework', 'nodejs', 'web'],
    category: 'Framework',
    difficulty: 'Beginner'
  },
  {
    id: '9',
    name: 'Docker',
    description: 'Platform for developing, shipping, and running applications',
    avatar: 'https://via.placeholder.com/32/2496ed/ffffff?text=D',
    language: 'Go',
    stars: 67000,
    updated: '2025-01-26',
    tags: ['devops', 'containerization', 'deployment'],
    category: 'Tool',
    difficulty: 'Intermediate'
  },
  {
    id: '10',
    name: 'Kubernetes',
    description: 'Open-source container orchestration platform',
    avatar: 'https://via.placeholder.com/32/326ce5/ffffff?text=K8',
    language: 'Go',
    stars: 100000,
    updated: '2025-01-26',
    tags: ['devops', 'orchestration', 'containers'],
    category: 'Tool',
    difficulty: 'Advanced'
  },
  {
    id: '11',
    name: 'PostgreSQL',
    description: 'Advanced open-source relational database',
    avatar: 'https://via.placeholder.com/32/336791/ffffff?text=PG',
    language: 'C',
    stars: 14000,
    updated: '2025-01-26',
    tags: ['database', 'sql', 'relational'],
    category: 'Database',
    difficulty: 'Intermediate'
  },
  {
    id: '12',
    name: 'MongoDB',
    description: 'Document-oriented NoSQL database',
    avatar: 'https://via.placeholder.com/32/47a248/ffffff?text=MG',
    language: 'C++',
    stars: 24000,
    updated: '2025-01-26',
    tags: ['database', 'nosql', 'document'],
    category: 'Database',
    difficulty: 'Beginner'
  },
  {
    id: '13',
    name: 'Redis',
    description: 'In-memory data structure store',
    avatar: 'https://via.placeholder.com/32/dc382d/ffffff?text=RD',
    language: 'C',
    stars: 60000,
    updated: '2025-01-26',
    tags: ['database', 'cache', 'nosql'],
    category: 'Database',
    difficulty: 'Intermediate'
  },
  {
    id: '14',
    name: 'GraphQL',
    description: 'Query language for APIs',
    avatar: 'https://via.placeholder.com/32/e10098/ffffff?text=GQ',
    language: 'JavaScript',
    stars: 20000,
    updated: '2025-01-26',
    tags: ['api', 'query', 'web'],
    category: 'Tool',
    difficulty: 'Intermediate'
  },
  {
    id: '15',
    name: 'Webpack',
    description: 'Static module bundler for JavaScript applications',
    avatar: 'https://via.placeholder.com/32/8dd6f9/000000?text=WP',
    language: 'JavaScript',
    stars: 63000,
    updated: '2025-01-26',
    tags: ['build-tool', 'bundler', 'frontend'],
    category: 'Tool',
    difficulty: 'Advanced'
  },
  {
    id: '16',
    name: 'Vite',
    description: 'Next generation frontend tooling',
    avatar: 'https://via.placeholder.com/32/646cff/ffffff?text=V',
    language: 'JavaScript',
    stars: 60000,
    updated: '2025-01-26',
    tags: ['build-tool', 'bundler', 'frontend', 'fast'],
    category: 'Tool',
    difficulty: 'Beginner'
  },
  {
    id: '17',
    name: 'Tailwind CSS',
    description: 'Utility-first CSS framework',
    avatar: 'https://via.placeholder.com/32/38bdf8/000000?text=TW',
    language: 'CSS',
    stars: 73000,
    updated: '2025-01-26',
    tags: ['css', 'framework', 'frontend', 'utility'],
    category: 'Framework',
    difficulty: 'Beginner'
  },
  {
    id: '18',
    name: 'Next.js',
    description: 'React framework for production',
    avatar: 'https://via.placeholder.com/32/000000/ffffff?text=NX',
    language: 'JavaScript',
    stars: 110000,
    updated: '2025-01-26',
    tags: ['react', 'framework', 'fullstack', 'ssr'],
    category: 'Framework',
    difficulty: 'Intermediate'
  },
  {
    id: '19',
    name: 'Svelte',
    description: 'Cybernetically enhanced web apps',
    avatar: 'https://via.placeholder.com/32/ff3e00/ffffff?text=SV',
    language: 'JavaScript',
    stars: 72000,
    updated: '2025-01-26',
    tags: ['frontend', 'framework', 'compiler'],
    category: 'Framework',
    difficulty: 'Intermediate'
  },
  {
    id: '20',
    name: 'Go',
    description: 'Open source programming language',
    avatar: 'https://via.placeholder.com/32/00add8/000000?text=GO',
    language: 'Go',
    stars: 115000,
    updated: '2025-01-26',
    tags: ['backend', 'systems', 'concurrent'],
    category: 'Language',
    difficulty: 'Intermediate'
  },
  // Additional items for better search testing
  {
    id: '21',
    name: 'Angular',
    description: 'Platform for building mobile and desktop web applications',
    avatar: 'https://via.placeholder.com/32/dd1b16/ffffff?text=NG',
    language: 'TypeScript',
    stars: 88000,
    updated: '2025-01-26',
    tags: ['frontend', 'framework', 'spa', 'typescript'],
    category: 'Framework',
    difficulty: 'Advanced'
  },
  {
    id: '22',
    name: 'Laravel',
    description: 'PHP web application framework with expressive syntax',
    avatar: 'https://via.placeholder.com/32/ff2d20/ffffff?text=L',
    language: 'PHP',
    stars: 75000,
    updated: '2025-01-26',
    tags: ['backend', 'framework', 'php', 'web'],
    category: 'Framework',
    difficulty: 'Intermediate'
  },
  {
    id: '23',
    name: 'Spring Boot',
    description: 'Java-based framework for creating production-grade applications',
    avatar: 'https://via.placeholder.com/32/6db33f/ffffff?text=SB',
    language: 'Java',
    stars: 68000,
    updated: '2025-01-26',
    tags: ['backend', 'framework', 'java', 'microservices'],
    category: 'Framework',
    difficulty: 'Advanced'
  },
  {
    id: '24',
    name: 'Flutter',
    description: 'UI toolkit for building natively compiled applications',
    avatar: 'https://via.placeholder.com/32/02569b/ffffff?text=FL',
    language: 'Dart',
    stars: 155000,
    updated: '2025-01-26',
    tags: ['mobile', 'frontend', 'cross-platform', 'ui'],
    category: 'Framework',
    difficulty: 'Intermediate'
  },
  {
    id: '25',
    name: 'Rust',
    description: 'Systems programming language focused on safety and speed',
    avatar: 'https://via.placeholder.com/32/000000/ffffff?text=RS',
    language: 'Rust',
    stars: 78000,
    updated: '2025-01-26',
    tags: ['systems', 'performance', 'safety', 'backend'],
    category: 'Language',
    difficulty: 'Advanced'
  }
];

// Configuration for mock API behavior
const CONFIG = {
  minDelay: 200,          // Minimum response delay (ms)
  maxDelay: 800,          // Maximum response delay (ms)
  errorRate: 0.05,        // 5% error rate for testing
  networkIssueRate: 0.02, // 2% network issue simulation
  resultsPerPage: 10,     // Default pagination size
  maxResults: 50          // Maximum results per request
};

// Error types for simulation
const ERROR_TYPES = [
  { type: 'network', message: 'Network connection failed', status: 0 },
  { type: 'server', message: 'Internal server error', status: 500 },
  { type: 'timeout', message: 'Request timeout', status: 408 },
  { type: 'rate_limit', message: 'Rate limit exceeded', status: 429 },
  { type: 'not_found', message: 'Endpoint not found', status: 404 }
];

/**
 * Mock API Service Class
 */
export class MockApiService {
  constructor(options = {}) {
    this.config = { ...CONFIG, ...options };
    this.requestCount = 0;
    this.startTime = Date.now();
    
    // Track statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      errorTypes: {}
    };
  }

  /**
   * Simulate network delay
   */
  async simulateDelay() {
    const delay = Math.random() * (this.config.maxDelay - this.config.minDelay) + this.config.minDelay;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Simulate random errors for testing
   */
  simulateError() {
    if (Math.random() < this.config.errorRate) {
      const errorType = ERROR_TYPES[Math.floor(Math.random() * ERROR_TYPES.length)];
      const error = new Error(errorType.message);
      error.status = errorType.status;
      error.type = errorType.type;
      
      // Track error statistics
      this.stats.errorTypes[errorType.type] = (this.stats.errorTypes[errorType.type] || 0) + 1;
      
      return error;
    }
    return null;
  }

  /**
   * Search endpoint simulation
   */
  async search(query = '', options = {}) {
    const startTime = Date.now();
    this.requestCount++;
    this.stats.totalRequests++;

    console.log(`[MockAPI] Search request: "${query}" with options:`, options);

    try {
      // Simulate network delay
      await this.simulateDelay();

      // Simulate random errors
      const error = this.simulateError();
      if (error) {
        this.stats.failedRequests++;
        throw error;
      }

      // Parse options
      const page = parseInt(options.page) || 1;
      const limit = Math.min(parseInt(options.limit) || this.config.resultsPerPage, this.config.maxResults);
      const offset = (page - 1) * limit;
      const sortBy = options.sortBy || 'name';
      const sortOrder = options.sortOrder || 'asc';
      const category = options.category;
      const difficulty = options.difficulty;

      // Filter data based on query
      let filteredData = MOCK_DATA;

      // Text search
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase().trim();
        filteredData = MOCK_DATA.filter(item => {
          return item.name.toLowerCase().includes(searchTerm) ||
                 item.description.toLowerCase().includes(searchTerm) ||
                 item.language.toLowerCase().includes(searchTerm) ||
                 item.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
                 item.category.toLowerCase().includes(searchTerm);
        });
      }

      // Filter by category
      if (category && category !== 'all') {
        filteredData = filteredData.filter(item => 
          item.category.toLowerCase() === category.toLowerCase()
        );
      }

      // Filter by difficulty
      if (difficulty && difficulty !== 'all') {
        filteredData = filteredData.filter(item => 
          item.difficulty.toLowerCase() === difficulty.toLowerCase()
        );
      }

      // Sort data
      filteredData.sort((a, b) => {
        let aVal = a[sortBy] || '';
        let bVal = b[sortBy] || '';
        
        // Handle numeric sorting
        if (sortBy === 'stars') {
          aVal = parseInt(aVal) || 0;
          bVal = parseInt(bVal) || 0;
        } else {
          aVal = String(aVal).toLowerCase();
          bVal = String(bVal).toLowerCase();
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      // Apply pagination
      const totalResults = filteredData.length;
      const paginatedData = filteredData.slice(offset, offset + limit);

      // Calculate response time
      const responseTime = Date.now() - startTime;
      this.stats.totalResponseTime += responseTime;
      this.stats.successfulRequests++;

      // Build response
      const response = {
        data: paginatedData,
        pagination: {
          page: page,
          limit: limit,
          total: totalResults,
          totalPages: Math.ceil(totalResults / limit),
          hasNext: offset + limit < totalResults,
          hasPrev: page > 1
        },
        meta: {
          query: query,
          responseTime: responseTime,
          requestId: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        },
        filters: {
          category: category || 'all',
          difficulty: difficulty || 'all',
          sortBy: sortBy,
          sortOrder: sortOrder
        }
      };

      console.log(`[MockAPI] Search completed: ${paginatedData.length}/${totalResults} results in ${responseTime}ms`);
      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.stats.totalResponseTime += responseTime;
      this.stats.failedRequests++;
      
      console.error(`[MockAPI] Search failed:`, error);
      throw error;
    }
  }

  /**
   * Get item by ID
   */
  async getById(id) {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      await this.simulateDelay();

      const error = this.simulateError();
      if (error) {
        this.stats.failedRequests++;
        throw error;
      }

      const item = MOCK_DATA.find(item => item.id === id);
      if (!item) {
        const notFoundError = new Error('Item not found');
        notFoundError.status = 404;
        this.stats.failedRequests++;
        throw notFoundError;
      }

      const responseTime = Date.now() - startTime;
      this.stats.totalResponseTime += responseTime;
      this.stats.successfulRequests++;

      return {
        data: item,
        meta: {
          responseTime: responseTime,
          requestId: this.generateRequestId(),
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.stats.totalResponseTime += responseTime;
      this.stats.failedRequests++;
      throw error;
    }
  }

  /**
   * Get statistics for the mock API
   */
  getStats() {
    const averageResponseTime = this.stats.totalRequests > 0 
      ? Math.round(this.stats.totalResponseTime / this.stats.totalRequests)
      : 0;

    return {
      ...this.stats,
      averageResponseTime,
      uptime: Date.now() - this.startTime,
      successRate: this.stats.totalRequests > 0 
        ? Math.round((this.stats.successfulRequests / this.stats.totalRequests) * 100)
        : 0
    };
  }

  /**
   * Get available categories
   */
  async getCategories() {
    await this.simulateDelay();
    
    const categories = [...new Set(MOCK_DATA.map(item => item.category))].sort();
    return {
      data: categories.map(category => ({
        id: category.toLowerCase(),
        name: category,
        count: MOCK_DATA.filter(item => item.category === category).length
      })),
      meta: {
        total: categories.length,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      errorTypes: {}
    };
    this.requestCount = 0;
    this.startTime = Date.now();
  }
}

/**
 * Global mock API instance
 */
export const mockApi = new MockApiService();

/**
 * Fetch interceptor for development
 * Intercepts requests to /api/* and redirects to mock API
 */
export function setupMockApiInterceptor(baseURL = '/api') {
  if (typeof window === 'undefined') return;

  // Store original fetch
  const originalFetch = window.fetch;

  // Override fetch for API calls
  window.fetch = async function(input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;
    
    // Check if this is an API call we should mock
    if (url.startsWith(baseURL)) {
      const apiPath = url.replace(baseURL, '').replace(/^\/+/, '');
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      
      try {
        let mockResponse;
        
        if (apiPath === 'search') {
          // Handle search endpoint
          const query = urlParams.get('q') || urlParams.get('query') || '';
          const options = {
            page: urlParams.get('page'),
            limit: urlParams.get('limit'),
            sortBy: urlParams.get('sortBy'),
            sortOrder: urlParams.get('sortOrder'),
            category: urlParams.get('category'),
            difficulty: urlParams.get('difficulty')
          };
          
          mockResponse = await mockApi.search(query, options);
          
        } else if (apiPath === 'categories') {
          // Handle categories endpoint
          mockResponse = await mockApi.getCategories();
          
        } else if (apiPath.match(/^items?\/(.+)$/)) {
          // Handle get by ID endpoint
          const id = apiPath.match(/^items?\/(.+)$/)[1];
          mockResponse = await mockApi.getById(id);
          
        } else if (apiPath === 'stats') {
          // Handle stats endpoint
          mockResponse = { data: mockApi.getStats() };
          
        } else if (apiPath === 'ping') {
          // Handle ping endpoint for connection testing
          mockResponse = { status: 'ok', timestamp: new Date().toISOString() };
          
        } else {
          // Unknown endpoint
          throw new Error(`Unknown API endpoint: ${apiPath}`);
        }

        // Return mock response as a proper Response object
        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': 'application/json',
            'X-Mock-API': 'true'
          }
        });

      } catch (error) {
        // Return error response
        const errorResponse = {
          error: {
            message: error.message,
            type: error.type || 'unknown',
            timestamp: new Date().toISOString()
          }
        };

        return new Response(JSON.stringify(errorResponse), {
          status: error.status || 500,
          statusText: error.message,
          headers: {
            'Content-Type': 'application/json',
            'X-Mock-API': 'true',
            'X-Mock-Error': 'true'
          }
        });
      }
    }

    // For non-API calls, use original fetch
    return originalFetch.call(this, input, init);
  };

  console.log('[MockAPI] Interceptor setup complete. API calls to', baseURL, 'will be mocked.');
}

/**
 * Initialize mock API for development
 */
export function initializeMockApi() {
  if (import.meta.env.DEV) {
    setupMockApiInterceptor('/api');
    console.log('[MockAPI] Mock API initialized for development');
  }
}