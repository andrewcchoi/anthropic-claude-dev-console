/**
 * Next.js Middleware
 * Adds correlation IDs to all requests for tracing
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export function middleware(request: NextRequest) {
  // Generate correlation ID for this request
  const correlationId = uuidv4();

  // Clone the request headers and add correlation ID
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-correlation-id', correlationId);

  // Create response with correlation ID
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add correlation ID to response headers
  response.headers.set('x-correlation-id', correlationId);

  // Add timing information
  response.headers.set('x-request-start', Date.now().toString());

  return response;
}

// Apply middleware to API routes
export const config = {
  matcher: '/api/:path*',
};
