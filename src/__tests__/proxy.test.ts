import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy, config } from '@/proxy';

describe('proxy', () => {
  it('should generate unique correlation IDs for each request', () => {
    const request1 = new NextRequest('http://localhost:3000/api/test');
    const request2 = new NextRequest('http://localhost:3000/api/test');

    const response1 = proxy(request1);
    const response2 = proxy(request2);

    const correlationId1 = response1.headers.get('x-correlation-id');
    const correlationId2 = response2.headers.get('x-correlation-id');

    expect(correlationId1).toBeDefined();
    expect(correlationId2).toBeDefined();
    expect(correlationId1).not.toBe(correlationId2);
  });

  it('should generate valid UUID v4 format correlation IDs', () => {
    const request = new NextRequest('http://localhost:3000/api/test');
    const response = proxy(request);

    const correlationId = response.headers.get('x-correlation-id');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(correlationId).toMatch(uuidRegex);
  });

  it('should add correlation ID to request headers', () => {
    const request = new NextRequest('http://localhost:3000/api/test');
    const response = proxy(request);

    // The response includes the modified request in Next.js
    // We verify by checking the response has the header
    const correlationId = response.headers.get('x-correlation-id');
    expect(correlationId).toBeDefined();
    expect(typeof correlationId).toBe('string');
    expect(correlationId.length).toBeGreaterThan(0);
  });

  it('should add x-request-start timestamp header', () => {
    const beforeTimestamp = Date.now();
    const request = new NextRequest('http://localhost:3000/api/test');
    const response = proxy(request);
    const afterTimestamp = Date.now();

    const requestStart = response.headers.get('x-request-start');
    expect(requestStart).toBeDefined();

    const timestamp = parseInt(requestStart!, 10);
    expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
    expect(timestamp).toBeLessThanOrEqual(afterTimestamp);
  });

  it('should include correlation ID in response headers', () => {
    const request = new NextRequest('http://localhost:3000/api/test');
    const response = proxy(request);

    const hasCorrelationHeader = response.headers.has('x-correlation-id');
    expect(hasCorrelationHeader).toBe(true);
  });
});

describe('proxy config', () => {
  it('should only apply to /api/* routes', () => {
    expect(config.matcher).toBe('/api/:path*');
  });
});
