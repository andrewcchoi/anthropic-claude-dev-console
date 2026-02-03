import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Helper to read and parse settings file
async function readSettingsFile(path: string): Promise<Record<string, unknown> | null> {
  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read settings from ${path}:`, error);
    return null;
  }
}

// Helper to detect provider from env flags
function detectProvider(env: Record<string, string>): string {
  // Priority: foundry > bedrock > vertex > anthropic
  if (env.CLAUDE_CODE_USE_FOUNDRY === '1') return 'foundry';
  if (env.CLAUDE_CODE_USE_BEDROCK === '1') return 'bedrock';
  if (env.CLAUDE_CODE_USE_VERTEX === '1') return 'vertex';
  return 'anthropic';
}

// Helper to extract provider config from env
function extractProviderConfig(env: Record<string, string>): Record<string, string> {
  const config: Record<string, string> = {};

  // Anthropic
  if (env.ANTHROPIC_API_KEY) {
    config.anthropicApiKey = env.ANTHROPIC_API_KEY;
  }

  // AWS Bedrock
  if (env.AWS_ACCESS_KEY_ID) {
    config.awsAccessKeyId = env.AWS_ACCESS_KEY_ID;
  }
  if (env.AWS_SECRET_ACCESS_KEY) {
    config.awsSecretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  }
  if (env.AWS_REGION) {
    config.awsRegion = env.AWS_REGION;
  }

  // Google Vertex AI
  if (env.CLOUD_ML_REGION) {
    config.vertexRegion = env.CLOUD_ML_REGION;
  }
  if (env.ANTHROPIC_VERTEX_PROJECT_ID) {
    config.vertexProjectId = env.ANTHROPIC_VERTEX_PROJECT_ID;
  }

  // Azure Foundry
  if (env.ANTHROPIC_FOUNDRY_API_KEY) {
    config.foundryApiKey = env.ANTHROPIC_FOUNDRY_API_KEY;
  }
  if (env.ANTHROPIC_FOUNDRY_RESOURCE) {
    config.foundryResource = env.ANTHROPIC_FOUNDRY_RESOURCE;
  }

  return config;
}

export async function GET() {
  // Settings priority: project > user
  const projectSettingsPath = join(process.cwd(), '.claude', 'settings.local.json');
  const userSettingsPath = join(homedir(), '.claude', 'settings.local.json');

  // Read both settings files
  const [projectSettings, userSettings] = await Promise.all([
    readSettingsFile(projectSettingsPath),
    readSettingsFile(userSettingsPath),
  ]);

  // If neither exists, return defaults
  if (!projectSettings && !userSettings) {
    return NextResponse.json({
      provider: 'anthropic',
      providerConfig: {},
      source: 'default',
      settings: {}
    });
  }

  // Shallow merge: project top-level keys override user completely
  const mergedSettings = { ...userSettings, ...projectSettings };

  // Extract env for provider detection
  const env = (mergedSettings.env || {}) as Record<string, string>;
  const provider = detectProvider(env);
  const providerConfig = extractProviderConfig(env);

  // Determine source
  const source = projectSettings ? 'project' : (userSettings ? 'user' : 'default');

  return NextResponse.json({
    provider,
    providerConfig,
    source,
    settings: mergedSettings
  });
}
