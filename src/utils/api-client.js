/**
 * API Client for Tom-Select Remote Data Loading
 * Handles fetch requests with error handling, rate limiting, and request cancellation
 */
export class ApiClient {
  constructor(baseURL, options = {}) {
    this.baseURL = baseURL || window.location.origin;
    this.timeout = options.timeout || 10000; // 10 seconds default
    this.retries = options.retries || 3;
    this.rateLimit = options.rateLimit || 100; // requests per minute
    this.headers = options.headers || {};
    
    // Request management
    this.requestQueue = [];
    this.activeRequests = new Map();
    this.lastRequestTime = 0;
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cancelledRequests: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Perform GET request with automatic retry and rate limiting
   */
  async get(endpoint, params = {}, options = {}) {
    const url = this.buildURL(endpoint, params);
    const requestId = this.generateRequestId();
    
    try {
      // Apply rate limiting
      await this.enforceRateLimit();
      
      // Create abort controller for this request
      const controller = new AbortController();
      this.activeRequests.set(requestId, controller);
      
      // Set timeout
      const timeoutId = setTimeout(() => {
        controller.abort();
        this.stats.failedRequests++;
      }, options.timeout || this.timeout);
      
      // Track request timing
      const startTime = performance.now();
      this.stats.totalRequests++;
      
      // Perform fetch request
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...this.headers,
          ...options.headers
        },
        signal: controller.signal,
        credentials: options.credentials || 'same-origin'
      });
      
      clearTimeout(timeoutId);
      
      // Handle response
      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          await this.extractErrorMessage(response)
        );
      }
      
      const data = await response.json();
      
      // Update statistics
      const responseTime = performance.now() - startTime;
      this.updateAverageResponseTime(responseTime);
      this.stats.successfulRequests++;
      
      // Clean up
      this.activeRequests.delete(requestId);
      
      return {
        data,
        status: response.status,
        headers: response.headers,
        responseTime
      };
      
    } catch (error) {
      // Clean up request tracking
      this.activeRequests.delete(requestId);
      
      // Handle abort errors
      if (error.name === 'AbortError') {
        this.stats.cancelledRequests++;
        throw new ApiError('Request cancelled', 0, 'ABORT');
      }
      
      // Retry logic for network errors
      if (options.retry !== false && this.shouldRetry(error, options.retryCount || 0)) {
        const retryCount = (options.retryCount || 0) + 1;
        const delay = this.calculateRetryDelay(retryCount);
        
        console.log(`Retrying request (attempt ${retryCount}/${this.retries}) after ${delay}ms`);
        await this.delay(delay);
        
        return this.get(endpoint, params, { ...options, retryCount });
      }
      
      // Update failure statistics
      this.stats.failedRequests++;
      
      throw error;
    }
  }

  /**
   * Cancel a specific request or all active requests
   */
  cancelRequest(requestId = null) {
    if (requestId) {
      const controller = this.activeRequests.get(requestId);
      if (controller) {
        controller.abort();
        this.activeRequests.delete(requestId);
      }
    } else {
      // Cancel all active requests
      for (const [id, controller] of this.activeRequests) {
        controller.abort();
        this.activeRequests.delete(id);
      }
    }
  }

  /**
   * Build complete URL with query parameters
   */
  buildURL(endpoint, params) {
    // Handle both absolute and relative endpoints
    const url = endpoint.startsWith('http') 
      ? new URL(endpoint)
      : new URL(endpoint, this.baseURL);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => url.searchParams.append(key, v));
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    });
    
    return url.toString();
  }

  /**
   * Enforce rate limiting between requests
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 60000 / this.rateLimit; // milliseconds between requests
    
    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await this.delay(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Determine if request should be retried
   */
  shouldRetry(error, currentRetryCount) {
    // Don't retry if max retries reached
    if (currentRetryCount >= this.retries) {
      return false;
    }
    
    // Don't retry client errors (4xx)
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
      return false;
    }
    
    // Retry network errors and server errors (5xx)
    return true;
  }

  /**
   * Calculate exponential backoff delay for retries
   */
  calculateRetryDelay(retryCount) {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    const baseDelay = 1000;
    const maxDelay = 30000; // 30 seconds max
    const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    
    return delay + jitter;
  }

  /**
   * Extract error message from response
   */
  async extractErrorMessage(response) {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        return errorData.message || errorData.error || response.statusText;
      }
      return response.statusText;
    } catch {
      return response.statusText;
    }
  }

  /**
   * Update average response time statistic
   */
  updateAverageResponseTime(responseTime) {
    const currentAvg = this.stats.averageResponseTime;
    const totalCount = this.stats.successfulRequests;
    
    // Calculate new average
    this.stats.averageResponseTime = 
      (currentAvg * (totalCount - 1) + responseTime) / totalCount;
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeRequests: this.activeRequests.size,
      successRate: this.stats.totalRequests > 0 
        ? (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cancelledRequests: 0,
      averageResponseTime: 0
    };
  }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, status = 0, code = 'UNKNOWN') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Check if error is a network error
   */
  isNetworkError() {
    return this.status === 0 || this.code === 'NETWORK_ERROR';
  }

  /**
   * Check if error is a server error
   */
  isServerError() {
    return this.status >= 500 && this.status < 600;
  }

  /**
   * Check if error is a client error
   */
  isClientError() {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage() {
    if (this.isNetworkError()) {
      return 'Network connection error. Please check your internet connection.';
    }
    
    if (this.status === 401) {
      return 'Authentication required. Please log in.';
    }
    
    if (this.status === 403) {
      return 'Access denied. You don\'t have permission to perform this action.';
    }
    
    if (this.status === 404) {
      return 'The requested resource was not found.';
    }
    
    if (this.status === 429) {
      return 'Too many requests. Please try again later.';
    }
    
    if (this.isServerError()) {
      return 'Server error. Please try again later.';
    }
    
    return this.message || 'An unexpected error occurred.';
  }
}

// Export singleton instance for convenience
export const apiClient = new ApiClient(window.location.origin, {
  timeout: 10000,
  retries: 3,
  rateLimit: 100
});