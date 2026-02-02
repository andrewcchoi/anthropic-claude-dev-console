import { setServerDebugMode, isServerDebugMode } from '@/lib/logger/server';
import { enableLogStreaming, disableLogStreaming } from '@/lib/logger/log-stream';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { enabled } = await request.json();
  setServerDebugMode(enabled);

  // Also enable/disable log streaming
  if (enabled) {
    enableLogStreaming();
  } else {
    disableLogStreaming();
  }

  return NextResponse.json({ debugMode: isServerDebugMode() });
}

export async function GET() {
  return NextResponse.json({ debugMode: isServerDebugMode() });
}
