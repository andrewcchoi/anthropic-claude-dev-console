/**
 * Rate Limiter
 * API rate limiting with sliding window
 */

interface RateLimitEntry {
  timestamps: number[];
}

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '10000', 10); // 10 seconds
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '10', 10); // 10 requests

export class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup old entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if request is allowed
   */
  check(key: string): boolean {
    const now = Date.now();
    const entry = this.requests.get(key) ?? { timestamps: [] };

    // Remove timestamps outside window
    entry.timestamps = entry.timestamps.filter(t => now - t < WINDOW_MS);

    // Check if under limit
    if (entry.timestamps.length >= MAX_REQUESTS) {
      return false;
    }

    // Add current timestamp
    entry.timestamps.push(now);
    this.requests.set(key, entry);

    return true;
  }

  /**
   * Get remaining requests in window
   */
  getRemaining(key: string): number {
    const now = Date.now();
    const entry = this.requests.get(key);

    if (!entry) {
      return MAX_REQUESTS;
    }

    const valid = entry.timestamps.filter(t => now - t < WINDOW_MS);
    return Math.max(0, MAX_REQUESTS - valid.length);
  }

  /**
   * Get time until window resets
   */
  getResetTime(key: string): number {
    const entry = this.requests.get(key);

    if (!entry || entry.timestamps.length === 0) {
      return 0;
    }

    const oldest = Math.min(...entry.timestamps);
    const resetAt = oldest + WINDOW_MS;

    return Math.max(0, resetAt - Date.now());
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.requests.entries()) {
      entry.timestamps = entry.timestamps.filter(t => now - t < WINDOW_MS);

      if (entry.timestamps.length === 0) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Singleton instance
let instance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!instance) {
    instance = new RateLimiter();
  }
  return instance;
}
