import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export async function GET() {
  const settingsPath = join(homedir(), '.claude', 'settings.json');

  if (!existsSync(settingsPath)) {
    return NextResponse.json({ provider: 'anthropic', providerConfig: {} });
  }

  try {
    const content = await readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(content);
    const env = settings.env || {};

    // Detect provider from env flags (priority: foundry > bedrock > vertex > anthropic)
    let provider: string = 'anthropic';
    if (env.CLAUDE_CODE_USE_FOUNDRY === '1') provider = 'foundry';
    else if (env.CLAUDE_CODE_USE_BEDROCK === '1') provider = 'bedrock';
    else if (env.CLAUDE_CODE_USE_VERTEX === '1') provider = 'vertex';

    // Extract provider config
    const providerConfig: Record<string, string> = {};

    // Anthropic
    if (env.ANTHROPIC_API_KEY) {
      providerConfig.anthropicApiKey = env.ANTHROPIC_API_KEY;
    }

    // AWS Bedrock
    if (env.AWS_ACCESS_KEY_ID) {
      providerConfig.awsAccessKeyId = env.AWS_ACCESS_KEY_ID;
    }
    if (env.AWS_SECRET_ACCESS_KEY) {
      providerConfig.awsSecretAccessKey = env.AWS_SECRET_ACCESS_KEY;
    }
    if (env.AWS_REGION) {
      providerConfig.awsRegion = env.AWS_REGION;
    }

    // Google Vertex AI
    if (env.CLOUD_ML_REGION) {
      providerConfig.vertexRegion = env.CLOUD_ML_REGION;
    }
    if (env.ANTHROPIC_VERTEX_PROJECT_ID) {
      providerConfig.vertexProjectId = env.ANTHROPIC_VERTEX_PROJECT_ID;
    }

    // Azure Foundry
    if (env.ANTHROPIC_FOUNDRY_API_KEY) {
      providerConfig.foundryApiKey = env.ANTHROPIC_FOUNDRY_API_KEY;
    }
    if (env.ANTHROPIC_FOUNDRY_RESOURCE) {
      providerConfig.foundryResource = env.ANTHROPIC_FOUNDRY_RESOURCE;
    }

    return NextResponse.json({ provider, providerConfig });
  } catch (error) {
    console.error('Failed to read CLI settings:', error);
    return NextResponse.json({ provider: 'anthropic', providerConfig: {} });
  }
}
