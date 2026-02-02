/**
 * API Route Wrapper with Request/Response Logging
 * Adds timing, correlation IDs, and structured logging to API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerLogger } from '../logger/server';

interface RequestLogData {
  method: string;
  path: string;
  correlationId: string;
  userAgent?: string;
  ip?: string;
  query?: Record<string, string>;
}

interface ResponseLogData extends RequestLogData {
  status: number;
  durationMs: number;
  error?: string;
}

/**
 * Extract correlation ID from request headers
 */
function getCorrelationId(request: NextRequest): string {
  return request.headers.get('x-correlation-id') || 'unknown';
}

/**
 * Extract client IP from request
 */
function getClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || undefined;
}

/**
 * Get query parameters as object
 */
function getQueryParams(request: NextRequest): Record<string, string> {
  const params: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

/**
 * API route handler type
 */
type ApiHandler = (
  request: NextRequest,
  context?: { params: any }
) => Promise<NextResponse> | NextResponse;

/**
 * Wrap an API route handler with logging
 *
 * @example
 * export const GET = withLogging(async (request) => {
 *   return NextResponse.json({ data: 'hello' });
 * });
 */
export function withLogging(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: { params: any }) => {
    const startTime = Date.now();
    const correlationId = getCorrelationId(request);
    const method = request.method;
    const path = request.nextUrl.pathname;

    // Create scoped logger with correlation ID
    const log = createServerLogger('API', correlationId);

    // Log incoming request
    const requestData: RequestLogData = {
      method,
      path,
      correlationId,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: getClientIp(request),
      query: getQueryParams(request),
    };

    log.info('Request received', requestData);

    try {
      // Execute the handler
      const response = await handler(request, context);
      const durationMs = Date.now() - startTime;

      // Log successful response
      const responseData: ResponseLogData = {
        ...requestData,
        status: response.status,
        durationMs,
      };

      const logLevel = response.status >= 400 ? 'warn' : 'info';
      if (logLevel === 'warn') {
        log.warn('Request completed with error status', responseData);
      } else {
        log.info('Request completed', responseData);
      }

      return response;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // Log error response
      const errorData: ResponseLogData = {
        ...requestData,
        status: 500,
        durationMs,
        error: error instanceof Error ? error.message : String(error),
      };

      log.error('Request failed', errorData);

      // Re-throw to let Next.js handle it
      throw error;
    }
  };
}

/**
 * Create a scoped logger for an API route
 * Includes correlation ID from request
 *
 * @example
 * export const POST = async (request: NextRequest) => {
 *   const log = createApiLogger(request, 'ChatAPI');
 *   log.info('Processing chat message');
 *   return NextResponse.json({ ok: true });
 * };
 */
export function createApiLogger(request: NextRequest, module: string) {
  const correlationId = getCorrelationId(request);
  return createServerLogger(module, correlationId);
}

/**
 * Time an operation within an API route
 * Logs duration with correlation ID
 *
 * @example
 * const endTimer = timeOperation(request, 'DatabaseQuery');
 * await db.query(...);
 * endTimer();
 */
export function timeOperation(request: NextRequest, operation: string): () => void {
  const correlationId = getCorrelationId(request);
  const log = createServerLogger('API', correlationId);
  const startTime = Date.now();

  log.debug(`${operation} started`, { correlationId });

  return () => {
    const durationMs = Date.now() - startTime;
    log.debug(`${operation} completed`, { durationMs, correlationId });
  };
}
