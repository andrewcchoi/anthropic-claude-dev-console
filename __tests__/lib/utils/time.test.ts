// __tests__/lib/utils/time.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatISOWithRelative } from '@/lib/utils/time';

describe('formatISOWithRelative', () => {
  beforeEach(() => {
    // Mock Date.now() to fixed timestamp
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-28T15:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should format timestamp as ISO + relative (just now)', () => {
    const now = Date.now();
    const result = formatISOWithRelative(now);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} \(just now\)$/);
  });

  it('should format timestamp as ISO + relative (minutes ago)', () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const result = formatISOWithRelative(fiveMinutesAgo);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} \(5m ago\)$/);
  });

  it('should format timestamp as ISO + relative (hours ago)', () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const result = formatISOWithRelative(twoHoursAgo);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} \(2h ago\)$/);
  });

  it('should format timestamp as ISO + relative (days ago)', () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const result = formatISOWithRelative(threeDaysAgo);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} \(3d ago\)$/);
  });

  it('should format timestamp as ISO + relative (weeks ago)', () => {
    const sixWeeksAgo = Date.now() - 6 * 7 * 24 * 60 * 60 * 1000;
    const result = formatISOWithRelative(sixWeeksAgo);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} \(6w ago\)$/);
  });

  it('should format timestamp at 59 seconds boundary (just now)', () => {
    const fiftyNineSecondsAgo = Date.now() - 59 * 1000;
    const result = formatISOWithRelative(fiftyNineSecondsAgo);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} \(just now\)$/);
  });

  it('should format timestamp at 60 seconds boundary (1m ago)', () => {
    const sixtySecondsAgo = Date.now() - 60 * 1000;
    const result = formatISOWithRelative(sixtySecondsAgo);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} \(1m ago\)$/);
  });

  it('should format timestamp at exactly 7 days boundary (7d ago)', () => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const result = formatISOWithRelative(sevenDaysAgo);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} \(1w ago\)$/);
  });

  it('should handle future timestamps gracefully', () => {
    const fiveMinutesInFuture = Date.now() + 5 * 60 * 1000;
    const result = formatISOWithRelative(fiveMinutesInFuture);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} \(in the future\)$/);
  });
});
