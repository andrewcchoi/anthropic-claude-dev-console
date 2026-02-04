/**
 * Format timestamp as relative time from now
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Human-readable relative time (e.g., "5m ago", "2h ago", "3d ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Format duration between two timestamps
 * @param startMs - Start timestamp in milliseconds
 * @param endMs - End timestamp in milliseconds
 * @returns Human-readable duration (e.g., "15m", "2h 30m", "3d 5h")
 */
export function formatDuration(startMs: number, endMs: number): string {
  const diff = endMs - startMs;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/**
 * Format timestamp with contextual display:
 * - Within 12h today: "2:30 PM"
 * - Yesterday within 12h: "Yesterday 5:15 PM"
 * - Older: relative time "2d ago"
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Contextual time string
 */
export function formatSmartTime(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - timestamp;
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  // Check if same calendar day
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (diffMs < TWELVE_HOURS) {
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    if (isToday) return timeStr;
    if (isYesterday) return `Yesterday ${timeStr}`;
  }

  // Fall back to relative time
  return formatRelativeTime(timestamp);
}
