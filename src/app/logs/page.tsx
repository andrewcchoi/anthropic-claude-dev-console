/**
 * Log Viewer Page
 * Real-time log streaming UI for debugging
 */

import { LogViewer } from '@/components/debug/LogViewer';

export default function LogsPage() {
  return (
    <div className="h-screen flex flex-col">
      <LogViewer />
    </div>
  );
}
