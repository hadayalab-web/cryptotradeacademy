// scripts/backtest/performance_monitor.js
// Performance monitoring utility for backtest operations

/**
 * Simple performance timer
 */
export class PerformanceTimer {
  constructor(name) {
    this.name = name;
    this.startTime = null;
    this.endTime = null;
    this.checkpoints = [];
  }

  start() {
    this.startTime = Date.now();
    console.log(`⏱️ ${this.name}: Started`);
    return this;
  }

  checkpoint(label) {
    if (!this.startTime) {
      console.warn('Timer not started');
      return this;
    }
    
    const now = Date.now();
    const elapsed = now - this.startTime;
    this.checkpoints.push({ label, time: now, elapsed });
    console.log(`  ⏱️ ${label}: ${(elapsed / 1000).toFixed(2)}s`);
    return this;
  }

  end() {
    this.endTime = Date.now();
    const total = this.endTime - this.startTime;
    console.log(`✅ ${this.name}: Completed in ${(total / 1000).toFixed(2)}s`);
    return total;
  }

  getReport() {
    if (!this.startTime || !this.endTime) {
      return 'Timer not completed';
    }

    const total = this.endTime - this.startTime;
    let report = `Performance Report: ${this.name}\n`;
    report += `Total Time: ${(total / 1000).toFixed(2)}s\n\n`;
    
    if (this.checkpoints.length > 0) {
      report += 'Checkpoints:\n';
      let lastTime = this.startTime;
      
      for (const checkpoint of this.checkpoints) {
        const elapsed = checkpoint.time - this.startTime;
        const delta = checkpoint.time - lastTime;
        report += `  ${checkpoint.label}: ${(elapsed / 1000).toFixed(2)}s (+${(delta / 1000).toFixed(2)}s)\n`;
        lastTime = checkpoint.time;
      }
    }

    return report;
  }
}

/**
 * Memory usage monitor
 */
export class MemoryMonitor {
  constructor(name) {
    this.name = name;
    this.snapshots = [];
  }

  snapshot(label) {
    const usage = process.memoryUsage();
    this.snapshots.push({
      label,
      timestamp: Date.now(),
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
    });
    
    const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);
    console.log(`💾 ${label}: Heap ${mb(usage.heapUsed)}MB / ${mb(usage.heapTotal)}MB`);
    
    return this;
  }

  getReport() {
    if (this.snapshots.length === 0) {
      return 'No memory snapshots';
    }

    let report = `Memory Report: ${this.name}\n\n`;
    
    const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);
    
    for (const snapshot of this.snapshots) {
      report += `${snapshot.label}:\n`;
      report += `  RSS: ${mb(snapshot.rss)}MB\n`;
      report += `  Heap Used: ${mb(snapshot.heapUsed)}MB\n`;
      report += `  Heap Total: ${mb(snapshot.heapTotal)}MB\n`;
      report += `  External: ${mb(snapshot.external)}MB\n\n`;
    }

    // Calculate deltas
    if (this.snapshots.length > 1) {
      const first = this.snapshots[0];
      const last = this.snapshots[this.snapshots.length - 1];
      
      report += 'Memory Growth:\n';
      report += `  RSS: ${mb(last.rss - first.rss)}MB\n`;
      report += `  Heap Used: ${mb(last.heapUsed - first.heapUsed)}MB\n`;
      report += `  Heap Total: ${mb(last.heapTotal - first.heapTotal)}MB\n`;
    }

    return report;
  }

  checkMemoryLimit(limitMB = 512) {
    const current = process.memoryUsage();
    const heapUsedMB = current.heapUsed / 1024 / 1024;
    
    if (heapUsedMB > limitMB) {
      console.warn(`⚠️ Memory usage high: ${heapUsedMB.toFixed(2)}MB > ${limitMB}MB`);
      return true;
    }
    
    return false;
  }
}

/**
 * Progress tracker for long-running operations
 */
export class ProgressTracker {
  constructor(total, name = 'Progress') {
    this.total = total;
    this.name = name;
    this.current = 0;
    this.startTime = Date.now();
    this.lastUpdate = 0;
    this.updateInterval = 1000; // Update every 1 second
  }

  update(count = 1) {
    this.current += count;
    
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval && this.current < this.total) {
      return;
    }
    
    this.lastUpdate = now;
    this.logProgress();
  }

  logProgress() {
    const percent = ((this.current / this.total) * 100).toFixed(1);
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = this.current / elapsed;
    const remaining = (this.total - this.current) / rate;
    
    console.log(
      `📊 ${this.name}: ${this.current}/${this.total} (${percent}%) - ` +
      `${rate.toFixed(1)}/s - ETA: ${remaining.toFixed(0)}s`
    );
  }

  complete() {
    this.current = this.total;
    const elapsed = (Date.now() - this.startTime) / 1000;
    console.log(
      `✅ ${this.name}: Complete - ${this.total} items in ${elapsed.toFixed(1)}s ` +
      `(${(this.total / elapsed).toFixed(1)}/s)`
    );
  }
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
  constructor(maxPerInterval, intervalMs = 1000) {
    this.maxPerInterval = maxPerInterval;
    this.intervalMs = intervalMs;
    this.queue = [];
    this.processing = false;
  }

  async acquire() {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.process();
    });
  }

  async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.maxPerInterval);
      
      // Resolve all in batch
      for (const resolve of batch) {
        resolve();
      }

      // Wait for interval if more items in queue
      if (this.queue.length > 0) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, this.intervalMs));
      }
    }

    this.processing = false;
  }
}

/**
 * Batch processor with memory management
 */
export async function processBatch(items, batchSize, processor, options = {}) {
  const {
    memoryLimitMB = 512,
    progressName = 'Batch Processing',
    onBatchComplete = null,
  } = options;

  const memMonitor = new MemoryMonitor('Batch');
  const progress = new ProgressTracker(items.length, progressName);
  const results = [];

  memMonitor.snapshot('Start');

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, Math.min(i + batchSize, items.length));
    
    // Process batch
    // eslint-disable-next-line no-await-in-loop
    const batchResults = await processor(batch);
    results.push(...batchResults);
    
    progress.update(batch.length);

    // Check memory and trigger GC if needed
    if (memMonitor.checkMemoryLimit(memoryLimitMB)) {
      if (global.gc) {
        global.gc();
        console.log('🗑️ Garbage collection triggered');
      }
    }

    if (onBatchComplete) {
      onBatchComplete(i + batch.length, items.length);
    }
  }

  memMonitor.snapshot('End');
  progress.complete();

  return results;
}

/**
 * Retry helper with exponential backoff
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    backoffMultiplier = 2,
    onRetry = null,
  } = options;

  let lastError;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        console.warn(`⚠️ Attempt ${attempt + 1} failed: ${error.message}`);
        console.warn(`   Retrying in ${delay}ms...`);
        
        if (onRetry) {
          onRetry(attempt, error);
        }
        
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= backoffMultiplier;
      }
    }
  }

  throw new Error(`Failed after ${maxRetries + 1} attempts: ${lastError.message}`);
}
