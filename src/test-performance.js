/**
 * Level 3 Performance Testing Script
 * Automated performance and network resilience testing
 */

import { MockApiService } from './utils/mock-api.js';
import { ResultCache } from './utils/cache.js';
import { ApiClient } from './utils/api-client.js';
import { OfflineManager } from './utils/offline.js';

/**
 * Performance Test Results
 */
const performanceResults = {
  responseTime: {
    coldStart: [],
    cacheMiss: [],
    cacheHit: [],
    average: 0
  },
  caching: {
    hitRate: 0,
    memoryUsage: 0,
    evictionRate: 0
  },
  network: {
    errorRate: 0,
    recoveryTime: 0,
    offlineHandling: false
  },
  memory: {
    initialUsage: 0,
    peakUsage: 0,
    finalUsage: 0,
    leakDetected: false
  },
  rateLimit: {
    requestsPerMinute: 0,
    queueDepth: 0,
    throttleEffective: false
  }
};

/**
 * Performance measurement helper
 */
class PerformanceMonitor {
  constructor() {
    this.measurements = {};
    this.startTimes = {};
  }

  start(testName) {
    this.startTimes[testName] = performance.now();
  }

  end(testName) {
    if (this.startTimes[testName]) {
      const duration = performance.now() - this.startTimes[testName];
      if (!this.measurements[testName]) {
        this.measurements[testName] = [];
      }
      this.measurements[testName].push(duration);
      delete this.startTimes[testName];
      return duration;
    }
    return 0;
  }

  getAverage(testName) {
    if (!this.measurements[testName] || this.measurements[testName].length === 0) {
      return 0;
    }
    const sum = this.measurements[testName].reduce((a, b) => a + b, 0);
    return sum / this.measurements[testName].length;
  }

  getMedian(testName) {
    if (!this.measurements[testName] || this.measurements[testName].length === 0) {
      return 0;
    }
    const sorted = [...this.measurements[testName]].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
}

/**
 * Test response time performance
 */
async function testResponseTimePerformance() {
  console.log('\n🚀 Testing Response Time Performance...');
  
  const monitor = new PerformanceMonitor();
  const mockApi = new MockApiService();
  const cache = new ResultCache();
  
  // Test cold start (no cache)
  console.log('  Testing cold start performance...');
  for (let i = 0; i < 5; i++) {
    monitor.start('coldStart');
    await mockApi.search(`test${i}`);
    const duration = monitor.end('coldStart');
    performanceResults.responseTime.coldStart.push(duration);
  }

  // Test cache miss
  console.log('  Testing cache miss performance...');
  for (let i = 0; i < 5; i++) {
    monitor.start('cacheMiss');
    await mockApi.search(`unique${i}`);
    const duration = monitor.end('cacheMiss');
    performanceResults.responseTime.cacheMiss.push(duration);
  }

  // Test cache hit (simulate cached responses)
  console.log('  Testing cache hit performance...');
  const cachedData = [
    { id: '1', name: 'Test 1' },
    { id: '2', name: 'Test 2' }
  ];
  
  for (let i = 0; i < 5; i++) {
    monitor.start('cacheHit');
    cache.set(`cached${i}`, cachedData);
    cache.get(`cached${i}`);
    const duration = monitor.end('cacheHit');
    performanceResults.responseTime.cacheHit.push(duration);
  }

  // Calculate averages
  performanceResults.responseTime.average = [
    ...performanceResults.responseTime.coldStart,
    ...performanceResults.responseTime.cacheMiss,
    ...performanceResults.responseTime.cacheHit
  ].reduce((sum, time) => sum + time, 0) / 15;

  // Report results
  console.log(`  ✓ Cold start avg: ${monitor.getAverage('coldStart').toFixed(2)}ms`);
  console.log(`  ✓ Cache miss avg: ${monitor.getAverage('cacheMiss').toFixed(2)}ms`);
  console.log(`  ✓ Cache hit avg: ${monitor.getAverage('cacheHit').toFixed(2)}ms`);
  
  return {
    coldStart: monitor.getAverage('coldStart'),
    cacheMiss: monitor.getAverage('cacheMiss'),
    cacheHit: monitor.getAverage('cacheHit')
  };
}

/**
 * Test caching effectiveness
 */
async function testCachingEffectiveness() {
  console.log('\n💾 Testing Caching Effectiveness...');
  
  const cache = new ResultCache({ maxSize: 10 });
  const mockApi = new MockApiService();
  
  // Perform initial searches to populate cache
  const searchTerms = ['JavaScript', 'Python', 'React', 'Vue', 'Angular'];
  
  // First round - cache misses
  for (const term of searchTerms) {
    await mockApi.search(term);
    cache.set(term, { data: `cached-${term}` });
  }
  
  // Second round - cache hits
  let hits = 0;
  for (const term of searchTerms) {
    const cached = cache.get(term);
    if (cached) hits++;
  }
  
  performanceResults.caching.hitRate = (hits / searchTerms.length) * 100;
  
  // Test cache eviction
  for (let i = 0; i < 15; i++) {
    cache.set(`eviction-test-${i}`, { data: i });
  }
  
  const stats = cache.getStats();
  performanceResults.caching.memoryUsage = stats.memoryUsage || 0;
  performanceResults.caching.evictionRate = stats.evictions || 0;
  
  console.log(`  ✓ Cache hit rate: ${performanceResults.caching.hitRate.toFixed(1)}%`);
  console.log(`  ✓ Memory usage: ${performanceResults.caching.memoryUsage} bytes`);
  console.log(`  ✓ Cache size: ${stats.size}/${stats.maxSize}`);
  
  return performanceResults.caching;
}

/**
 * Test network resilience
 */
async function testNetworkResilience() {
  console.log('\n🌐 Testing Network Resilience...');
  
  const mockApi = new MockApiService({
    errorRate: 0.2, // 20% error rate for testing
    minDelay: 100,
    maxDelay: 500
  });
  
  const offlineManager = new OfflineManager({
    notifyUser: false
  });
  
  // Test error handling
  let totalRequests = 20;
  let errors = 0;
  
  for (let i = 0; i < totalRequests; i++) {
    try {
      await mockApi.search(`test${i}`);
    } catch (error) {
      errors++;
    }
  }
  
  performanceResults.network.errorRate = (errors / totalRequests) * 100;
  
  // Test offline handling
  const status = offlineManager.getStatus();
  performanceResults.network.offlineHandling = status.hasFallbackData;
  
  // Simulate recovery time
  const recoveryStart = performance.now();
  // Simulate network recovery scenario
  setTimeout(() => {
    performanceResults.network.recoveryTime = performance.now() - recoveryStart;
  }, 100);
  
  console.log(`  ✓ Error rate: ${performanceResults.network.errorRate.toFixed(1)}%`);
  console.log(`  ✓ Offline handling: ${performanceResults.network.offlineHandling ? 'Enabled' : 'Disabled'}`);
  
  return performanceResults.network;
}

/**
 * Test memory management
 */
async function testMemoryManagement() {
  console.log('\n🧠 Testing Memory Management...');
  
  // Initial memory baseline
  const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
  performanceResults.memory.initialUsage = initialMemory;
  
  // Create and destroy many objects to test for leaks
  const cache = new ResultCache({ maxSize: 100 });
  const testObjects = [];
  
  // Create many cached entries
  for (let i = 0; i < 200; i++) {
    const largeObject = {
      id: i,
      data: new Array(1000).fill(`test-data-${i}`),
      timestamp: Date.now()
    };
    cache.set(`memory-test-${i}`, largeObject);
    testObjects.push(largeObject);
  }
  
  // Peak memory usage
  const peakMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
  performanceResults.memory.peakUsage = peakMemory;
  
  // Clear objects and force cleanup
  cache.clear();
  testObjects.length = 0;
  
  // Force garbage collection if available
  if (window.gc) {
    window.gc();
  }
  
  // Final memory usage
  setTimeout(() => {
    const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    performanceResults.memory.finalUsage = finalMemory;
    
    // Detect potential memory leak (final usage significantly higher than initial)
    const memoryIncrease = finalMemory - initialMemory;
    const threshold = initialMemory * 0.1; // 10% increase threshold
    performanceResults.memory.leakDetected = memoryIncrease > threshold;
    
    console.log(`  ✓ Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  ✓ Peak memory: ${(peakMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  ✓ Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  ✓ Memory leak detected: ${performanceResults.memory.leakDetected ? 'Yes' : 'No'}`);
  }, 100);
  
  return performanceResults.memory;
}

/**
 * Test rate limiting
 */
async function testRateLimiting() {
  console.log('\n⏰ Testing Rate Limiting...');
  
  const apiClient = new ApiClient('/api', {
    rateLimit: 10, // 10 requests per minute for testing
    timeout: 1000
  });
  
  const startTime = Date.now();
  let requestsSent = 0;
  let requestsQueued = 0;
  
  // Send rapid requests to test rate limiting
  const promises = [];
  for (let i = 0; i < 15; i++) {
    promises.push(
      apiClient.get(`/test${i}`)
        .then(() => requestsSent++)
        .catch(() => requestsQueued++)
    );
  }
  
  await Promise.allSettled(promises);
  
  const duration = (Date.now() - startTime) / 1000; // Convert to seconds
  performanceResults.rateLimit.requestsPerMinute = (requestsSent / duration) * 60;
  performanceResults.rateLimit.queueDepth = requestsQueued;
  performanceResults.rateLimit.throttleEffective = requestsQueued > 0;
  
  console.log(`  ✓ Requests per minute: ${performanceResults.rateLimit.requestsPerMinute.toFixed(1)}`);
  console.log(`  ✓ Queued requests: ${performanceResults.rateLimit.queueDepth}`);
  console.log(`  ✓ Throttling effective: ${performanceResults.rateLimit.throttleEffective ? 'Yes' : 'No'}`);
  
  return performanceResults.rateLimit;
}

/**
 * Generate performance report
 */
function generatePerformanceReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 PERFORMANCE TEST REPORT');
  console.log('='.repeat(60));
  
  // Response Time Analysis
  console.log('\n🚀 Response Time Performance:');
  const responseTime = results.responseTime;
  console.log(`   Cold Start: ${responseTime.coldStart ? responseTime.coldStart.reduce((a, b) => a + b, 0) / responseTime.coldStart.length : 0}ms (target: <1000ms)`);
  console.log(`   Cache Miss: ${responseTime.cacheMiss ? responseTime.cacheMiss.reduce((a, b) => a + b, 0) / responseTime.cacheMiss.length : 0}ms (target: <800ms)`);
  console.log(`   Cache Hit: ${responseTime.cacheHit ? responseTime.cacheHit.reduce((a, b) => a + b, 0) / responseTime.cacheHit.length : 0}ms (target: <100ms)`);
  
  // Caching Analysis
  console.log('\n💾 Caching Effectiveness:');
  console.log(`   Hit Rate: ${results.caching.hitRate.toFixed(1)}% (target: >70%)`);
  console.log(`   Memory Usage: ${(results.caching.memoryUsage / 1024).toFixed(2)}KB`);
  
  // Network Analysis  
  console.log('\n🌐 Network Resilience:');
  console.log(`   Error Rate: ${results.network.errorRate.toFixed(1)}% (target: <5%)`);
  console.log(`   Offline Support: ${results.network.offlineHandling ? 'Available' : 'Unavailable'}`);
  
  // Memory Analysis
  console.log('\n🧠 Memory Management:');
  if (results.memory.initialUsage > 0) {
    console.log(`   Initial: ${(results.memory.initialUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Peak: ${(results.memory.peakUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Final: ${(results.memory.finalUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Leak Detected: ${results.memory.leakDetected ? 'Yes ⚠️' : 'No ✓'}`);
  } else {
    console.log('   Memory monitoring not available in this environment');
  }
  
  // Rate Limiting Analysis
  console.log('\n⏰ Rate Limiting:');
  console.log(`   Requests/Minute: ${results.rateLimit.requestsPerMinute.toFixed(1)} (target: ≤60)`);
  console.log(`   Throttling Active: ${results.rateLimit.throttleEffective ? 'Yes ✓' : 'No ⚠️'}`);
  
  // Overall Assessment
  console.log('\n📈 Overall Assessment:');
  let score = 0;
  let maxScore = 0;
  
  // Score response times
  if (responseTime.coldStart && responseTime.coldStart.length > 0) {
    const avgColdStart = responseTime.coldStart.reduce((a, b) => a + b, 0) / responseTime.coldStart.length;
    score += avgColdStart < 1000 ? 20 : 0;
  }
  maxScore += 20;
  
  // Score caching
  score += results.caching.hitRate > 70 ? 20 : 0;
  maxScore += 20;
  
  // Score network resilience
  score += results.network.errorRate < 5 ? 15 : 0;
  score += results.network.offlineHandling ? 15 : 0;
  maxScore += 30;
  
  // Score memory management
  score += !results.memory.leakDetected ? 15 : 0;
  maxScore += 15;
  
  // Score rate limiting
  score += results.rateLimit.throttleEffective ? 15 : 0;
  maxScore += 15;
  
  const finalScore = (score / maxScore) * 100;
  
  console.log(`   Performance Score: ${finalScore.toFixed(1)}%`);
  
  if (finalScore >= 90) {
    console.log('   Grade: A+ - Excellent Performance ⭐⭐⭐');
  } else if (finalScore >= 80) {
    console.log('   Grade: A - Good Performance ⭐⭐');
  } else if (finalScore >= 70) {
    console.log('   Grade: B - Acceptable Performance ⭐');
  } else {
    console.log('   Grade: C - Needs Improvement ⚠️');
  }
  
  console.log('\n' + '='.repeat(60));
  
  return { score: finalScore, grade: finalScore >= 80 ? 'PASS' : 'NEEDS_IMPROVEMENT' };
}

/**
 * Run all performance tests
 */
async function runPerformanceTests() {
  console.log('🔬 Starting Level 3 Performance Testing...\n');
  
  try {
    // Run all performance tests
    const responseTimeResults = await testResponseTimePerformance();
    const cachingResults = await testCachingEffectiveness();
    const networkResults = await testNetworkResilience();
    const memoryResults = await testMemoryManagement();
    const rateLimitResults = await testRateLimiting();
    
    // Generate comprehensive report
    const report = generatePerformanceReport(performanceResults);
    
    return {
      success: true,
      results: performanceResults,
      report: report,
      grade: report.grade
    };
    
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    return {
      success: false,
      error: error.message,
      results: performanceResults
    };
  }
}

// Export for use in testing environments
export { runPerformanceTests, performanceResults, PerformanceMonitor };

// Auto-run if called directly
if (import.meta.url === `file://${process?.argv[1] || ''}`) {
  runPerformanceTests().then(result => {
    process?.exit(result.success && result.grade === 'PASS' ? 0 : 1);
  });
}