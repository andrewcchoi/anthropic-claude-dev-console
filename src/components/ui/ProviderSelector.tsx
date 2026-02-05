'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/lib/store';
import { ChevronDown, Cloud } from 'lucide-react';

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic', description: 'Direct API (default)' },
  { value: 'bedrock', label: 'AWS Bedrock', description: 'Amazon Web Services' },
  { value: 'vertex', label: 'Vertex AI', description: 'Google Cloud' },
  { value: 'foundry', label: 'Azure Foundry', description: 'Microsoft Azure' },
] as const;

// Reusable input styles
const inputClass = "mt-2 w-full px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 disabled:opacity-50";

export function ProviderSelector() {
  const { provider, setProvider, providerConfig, setProviderConfig, isStreaming } = useChatStore();
  const [loaded, setLoaded] = useState(false);

  // Prepopulate from CLI settings on mount (only if no localStorage values)
  useEffect(() => {
    async function loadSettings() {
      // Skip if already loaded or if localStorage has provider config
      const hasExistingConfig = Object.keys(providerConfig).length > 0;
      if (loaded || hasExistingConfig) return;

      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const { provider: cliProvider, providerConfig: cliConfig } = await response.json();

          // Only populate if CLI has config we don't have
          if (cliProvider && cliProvider !== 'anthropic') {
            setProvider(cliProvider);
          }
          if (cliConfig && Object.keys(cliConfig).length > 0) {
            setProviderConfig(cliConfig);
          }
        }
      } catch (error) {
        console.error('Failed to load CLI settings:', error);
      } finally {
        setLoaded(true);
      }
    }
    loadSettings();
  }, [loaded, providerConfig, setProvider, setProviderConfig]);

  return (
    <form onSubmit={(e) => e.preventDefault()} autoComplete="off" className="px-3 py-2">
      <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
        <Cloud className="h-3.5 w-3.5" />
        Provider
      </label>
      <div className="relative">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as any)}
          disabled={isStreaming}
          className="w-full px-3 py-2 pr-8 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 appearance-none cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Anthropic config */}
      {provider === 'anthropic' && (
        <input
          type="password"
          placeholder="Anthropic API Key"
          value={providerConfig.anthropicApiKey || ''}
          onChange={(e) => setProviderConfig({ anthropicApiKey: e.target.value })}
          disabled={isStreaming}
          className={inputClass}
        />
      )}

      {/* AWS Bedrock config */}
      {provider === 'bedrock' && (
        <>
          <input
            type="password"
            placeholder="AWS Access Key ID"
            value={providerConfig.awsAccessKeyId || ''}
            onChange={(e) => setProviderConfig({ awsAccessKeyId: e.target.value })}
            disabled={isStreaming}
            className={inputClass}
          />
          <input
            type="password"
            placeholder="AWS Secret Access Key"
            value={providerConfig.awsSecretAccessKey || ''}
            onChange={(e) => setProviderConfig({ awsSecretAccessKey: e.target.value })}
            disabled={isStreaming}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="AWS Region (e.g., us-east-1)"
            value={providerConfig.awsRegion || ''}
            onChange={(e) => setProviderConfig({ awsRegion: e.target.value })}
            disabled={isStreaming}
            className={inputClass}
          />
        </>
      )}

      {/* Google Vertex AI config */}
      {provider === 'vertex' && (
        <>
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Vertex AI requires gcloud auth (run: gcloud auth application-default login)
          </div>
          <input
            type="text"
            placeholder="Region (e.g., global, us-east5)"
            value={providerConfig.vertexRegion || ''}
            onChange={(e) => setProviderConfig({ vertexRegion: e.target.value })}
            disabled={isStreaming}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Project ID"
            value={providerConfig.vertexProjectId || ''}
            onChange={(e) => setProviderConfig({ vertexProjectId: e.target.value })}
            disabled={isStreaming}
            className={inputClass}
          />
        </>
      )}

      {/* Azure Foundry config */}
      {provider === 'foundry' && (
        <>
          <input
            type="password"
            placeholder="Foundry API Key"
            value={providerConfig.foundryApiKey || ''}
            onChange={(e) => setProviderConfig({ foundryApiKey: e.target.value })}
            disabled={isStreaming}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Foundry Resource Name"
            value={providerConfig.foundryResource || ''}
            onChange={(e) => setProviderConfig({ foundryResource: e.target.value })}
            disabled={isStreaming}
            className={inputClass}
          />
        </>
      )}
    </form>
  );
}
