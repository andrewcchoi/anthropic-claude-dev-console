/**
 * Log Viewer Page
 * Real-time log streaming UI for debugging
 */

import { LogViewer } from '@/components/debug/LogViewer';
import { ToastContainer } from '@/components/ui/ToastContainer';

export default function LogsPage() {
  return (
    <div className="h-screen flex flex-col">
      <LogViewer />
      <ToastContainer />
    </div>
  );
}
