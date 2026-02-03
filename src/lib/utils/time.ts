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
