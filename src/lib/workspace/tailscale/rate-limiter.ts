/**
 * Rate Limiter for Tailscale API
 *
 * Prevents DoS via CLI process exhaustion by limiting API request rate.
 * Uses TTL-based cleanup to prevent memory leaks in long-running servers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import type { RateLimitEntry, RateLimitResult, RateLimitConfig } from './types';

const log = createLogger('TailscaleRateLimiter');

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10, // Max requests per window
  windowMs: 60000, // 1 minute window
};

// ============================================================================
// Rate Limiter State
// ============================================================================

const rateLimiters = new Map<string, RateLimitEntry>();

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Check if a client is rate limited
 *
 * @param clientId - Unique client identifier (usually IP address)
 * @param config - Optional rate limit configuration
 * @returns Rate limit check result
 */
export function checkRateLimit(
  clientId: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): RateLimitResult {
  const now = Date.now();
  const limiter = rateLimiters.get(clientId);

  // If no existing limiter or window has expired, create new entry
  if (!limiter || now > limiter.resetTime) {
    // Clear any existing timer
    if (limiter?.cleanupTimer) {
      clearTimeout(limiter.cleanupTimer);
    }

    // Schedule automatic cleanup to prevent memory leak
    const cleanupTimer = setTimeout(() => {
      rateLimiters.delete(clientId);
      log.debug('Rate limiter entry cleaned up', { clientId });
    }, config.windowMs + 1000); // Cleanup 1s after window expires

    rateLimiters.set(clientId, {
      count: 1,
      resetTime: now + config.windowMs,
      cleanupTimer,
    });

    log.debug('New rate limit window started', {
      clientId,
      resetTime: new Date(now + config.windowMs).toISOString(),
    });

    return { allowed: true };
  }

  // Check if rate limit exceeded
  if (limiter.count >= config.maxRequests) {
    const retryAfter = Math.ceil((limiter.resetTime - now) / 1000);

    log.warn('Rate limit exceeded', {
      clientId,
      count: limiter.count,
      maxRequests: config.maxRequests,
      retryAfter,
    });

    return {
      allowed: false,
      retryAfter,
    };
  }

  // Increment counter
  limiter.count++;

  log.debug('Rate limit check passed', {
    clientId,
    count: limiter.count,
    maxRequests: config.maxRequests,
  });

  return { allowed: true };
}

/**
 * Get current rate limit status for a client
 *
 * @param clientId - Unique client identifier
 * @returns Current rate limit status or null if no entry
 */
export function getRateLimitStatus(
  clientId: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): {
  remaining: number;
  reset: number;
  limit: number;
} | null {
  const limiter = rateLimiters.get(clientId);

  if (!limiter || Date.now() > limiter.resetTime) {
    return null;
  }

  return {
    remaining: Math.max(0, config.maxRequests - limiter.count),
    reset: limiter.resetTime,
    limit: config.maxRequests,
  };
}

/**
 * Clear rate limiters for a specific client
 *
 * @param clientId - Client to clear, or '*' for all
 */
export function clearRateLimiter(clientId: string): void {
  if (clientId === '*') {
    clearAllRateLimiters();
    return;
  }

  const entry = rateLimiters.get(clientId);
  if (entry) {
    clearTimeout(entry.cleanupTimer);
    rateLimiters.delete(clientId);
    log.debug('Rate limiter cleared', { clientId });
  }
}

/**
 * Clear all rate limiters (for graceful shutdown)
 */
export function clearAllRateLimiters(): void {
  for (const entry of rateLimiters.values()) {
    clearTimeout(entry.cleanupTimer);
  }
  rateLimiters.clear();
  log.info('All rate limiters cleared');
}

/**
 * Get rate limiter statistics
 */
export function getRateLimiterStats(): {
  activeClients: number;
  totalRequests: number;
} {
  let totalRequests = 0;
  for (const entry of rateLimiters.values()) {
    totalRequests += entry.count;
  }

  return {
    activeClients: rateLimiters.size,
    totalRequests,
  };
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Extract client ID from request
 */
function getClientId(request: NextRequest): string {
  // Try various headers for real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take first IP in chain
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to unknown (still rate limited)
  return 'unknown';
}

/**
 * Create rate limited API route handler
 *
 * @param handler - The actual route handler
 * @param config - Optional rate limit configuration
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    const clientId = getClientId(request);
    const { allowed, retryAfter } = checkRateLimit(clientId, config);

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter,
          message: `Too many requests. Please wait ${retryAfter} seconds.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // Get current status for headers
    const status = getRateLimitStatus(clientId, config);

    const response = await handler(request);

    // Add rate limit headers to response
    if (status) {
      response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
      response.headers.set('X-RateLimit-Remaining', String(status.remaining));
      response.headers.set('X-RateLimit-Reset', String(status.reset));
    }

    return response;
  };
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset rate limiter state (for testing only)
 */
export function __resetForTesting(): void {
  clearAllRateLimiters();
}
