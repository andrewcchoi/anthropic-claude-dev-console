/**
 * Example API Route with Logging
 * Demonstrates usage of withLogging wrapper
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging, createApiLogger, timeOperation } from '@/lib/api/withLogging';

export const dynamic = 'force-dynamic';

/**
 * Example GET endpoint with automatic request/response logging
 */
export const GET = withLogging(async (request: NextRequest) => {
  // Create a scoped logger for this route
  const log = createApiLogger(request, 'ExampleAPI');

  log.info('Processing GET request');

  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 100));

  return NextResponse.json({
    message: 'Hello from API with logging!',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Example POST endpoint with timing
 */
export const POST = withLogging(async (request: NextRequest) => {
  const log = createApiLogger(request, 'ExampleAPI');

  // Time a specific operation
  const endTimer = timeOperation(request, 'DataProcessing');

  try {
    const body = await request.json();
    log.info('Processing POST request', { bodyKeys: Object.keys(body) });

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 200));

    endTimer(); // Log operation duration

    return NextResponse.json({
      success: true,
      processed: body,
    });
  } catch (error) {
    endTimer();
    log.error('Failed to process request', { error });

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
});
