'use client';

import { useChatStore } from '@/lib/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import { createLogger } from '@/lib/logger';
import { Sun, Moon, Monitor } from 'lucide-react';

const log = createLogger('SettingsPanel');

export function SettingsPanel() {
  const { isSettingsPanelOpen, setSettingsPanelOpen, metadataColorScheme, setMetadataColorScheme } = useChatStore();
  const { theme, setTheme, resolvedTheme, mounted } = useAppTheme();

  if (!isSettingsPanelOpen) {
    return null;
  }

  const handleClose = () => {
    log.debug('Closing settings panel');
    setSettingsPanelOpen(false);
  };

  const handleSchemeChange = (scheme: 'semantic' | 'gradient') => {
    log.info('Metadata color scheme changed', { scheme });
    setMetadataColorScheme(scheme);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    log.info('App theme changed', { from: theme, to: newTheme });
    setTheme(newTheme);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* App Theme */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              App Theme
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Choose your preferred color scheme for the entire application
            </p>

            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                theme === 'light'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
                <input
                  type="radio"
                  name="appTheme"
                  value="light"
                  checked={theme === 'light'}
                  onChange={() => handleThemeChange('light')}
                  className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">Light</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Use light mode at all times
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                theme === 'dark'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
                <input
                  type="radio"
                  name="appTheme"
                  value="dark"
                  checked={theme === 'dark'}
                  onChange={() => handleThemeChange('dark')}
                  className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">Dark</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Use dark mode at all times
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                theme === 'system'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
                <input
                  type="radio"
                  name="appTheme"
                  value="system"
                  checked={theme === 'system'}
                  onChange={() => handleThemeChange('system')}
                  className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">System</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Follow system preferences {mounted && theme === 'system' && `(currently ${resolvedTheme})`}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Metadata Color Scheme */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Metadata Color Scheme
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Choose how session metadata (git branch, message count, dates) is color-coded
            </p>

            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                metadataColorScheme === 'semantic'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
                <input
                  type="radio"
                  name="metadataColorScheme"
                  value="semantic"
                  checked={metadataColorScheme === 'semantic'}
                  onChange={() => handleSchemeChange('semantic')}
                  className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Semantic</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Purple for branch, blue for count, gray for dates
                  </div>
                  {/* Preview */}
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      main
                    </span>
                    <span className="text-blue-600 dark:text-blue-400">42 msgs</span>
                    <span className="text-gray-500 dark:text-gray-400">2h ago</span>
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                metadataColorScheme === 'gradient'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
                <input
                  type="radio"
                  name="metadataColorScheme"
                  value="gradient"
                  checked={metadataColorScheme === 'gradient'}
                  onChange={() => handleSchemeChange('gradient')}
                  className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Gradient Spectrum</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Cyan, purple, amber, red for maximum color distinction
                  </div>
                  {/* Preview */}
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
                      main
                    </span>
                    <span className="text-purple-600 dark:text-purple-400">42 msgs</span>
                    <span className="text-amber-600 dark:text-amber-400">2h ago</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
