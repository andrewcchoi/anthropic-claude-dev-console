import { spawn } from 'child_process';
import { NextRequest } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createServerLogger } from '@/lib/logger/server';

const log = createServerLogger('ClaudeInitAPI');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, cwd, model, provider, providerConfig, defaultMode } = body;

    log.debug('CLI pre-warm request', {
      sessionId,
      cwd,
      model,
      provider,
      defaultMode
    });

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate defaultMode
    const VALID_MODES = ['default', 'acceptEdits', 'plan', 'dontAsk', 'bypassPermissions'] as const;
    const validatedMode = defaultMode && VALID_MODES.includes(defaultMode) ? defaultMode : 'default';

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        try {
          // Build Claude CLI arguments
          const args = [
            '-p',
            '--verbose',
            '--output-format',
            'stream-json',
            '--include-partial-messages',
          ];

          // Add permission mode if not default
          if (validatedMode && validatedMode !== 'default') {
            args.push('--permission-mode', validatedMode);
          }

          // Check if session file exists - for pre-warm, it should NOT exist
          const sessionPath = join(homedir(), '.claude', 'projects', '-workspace', `${sessionId}.jsonl`);
          const sessionExists = existsSync(sessionPath);

          if (sessionExists) {
            // Session already exists, send error
            const errorMessage = {
              type: 'error',
              error: 'Session already exists - cannot pre-warm',
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`)
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }

          // Create new session with session-id
          args.push('--session-id', sessionId);

          // Add model flag
          if (model) {
            args.push('--model', model);
          }

          // Build environment based on provider
          const env = { ...process.env };

          if (provider === 'anthropic') {
            if (providerConfig?.anthropicApiKey) {
              env.ANTHROPIC_API_KEY = providerConfig.anthropicApiKey;
            }
          } else if (provider === 'bedrock') {
            env.CLAUDE_CODE_USE_BEDROCK = '1';
            if (providerConfig?.awsAccessKeyId) {
              env.AWS_ACCESS_KEY_ID = providerConfig.awsAccessKeyId;
            }
            if (providerConfig?.awsSecretAccessKey) {
              env.AWS_SECRET_ACCESS_KEY = providerConfig.awsSecretAccessKey;
            }
            if (providerConfig?.awsRegion) {
              env.AWS_REGION = providerConfig.awsRegion;
            }
          } else if (provider === 'vertex') {
            env.CLAUDE_CODE_USE_VERTEX = '1';
            if (providerConfig?.vertexRegion) {
              env.CLOUD_ML_REGION = providerConfig.vertexRegion;
            }
            if (providerConfig?.vertexProjectId) {
              env.ANTHROPIC_VERTEX_PROJECT_ID = providerConfig.vertexProjectId;
            }
          } else if (provider === 'foundry') {
            env.CLAUDE_CODE_USE_FOUNDRY = '1';
            if (providerConfig?.foundryApiKey) {
              env.ANTHROPIC_FOUNDRY_API_KEY = providerConfig.foundryApiKey;
            }
            if (providerConfig?.foundryResource) {
              env.ANTHROPIC_FOUNDRY_RESOURCE = providerConfig.foundryResource;
            }
          }

          // Spawn Claude CLI process
          log.debug('Spawning CLI for pre-warm', {
            args,
            cwd: cwd || '/workspace',
            provider,
            permissionMode: validatedMode
          });

          const claude = spawn('claude', args, {
            cwd: cwd || '/workspace',
            stdio: ['pipe', 'pipe', 'pipe'],
            env,
          });

          let stderrBuffer = '';
          let receivedInit = false;

          // Handle stdout - looking for system.init message
          claude.stdout.on('data', (chunk: Buffer) => {
            const data = chunk.toString();
            const lines = data.split('\n');

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              try {
                const parsed = JSON.parse(trimmed);

                // Only send valid Claude CLI messages
                if (parsed.type) {
                  // Check for system.init message
                  if (parsed.type === 'system' && parsed.subtype === 'init') {
                    receivedInit = true;
                    log.debug('Received system.init', { model: parsed.model });
                  }

                  controller.enqueue(encoder.encode(`data: ${trimmed}\n\n`));
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          });

          // Capture stderr
          claude.stderr.on('data', (chunk: Buffer) => {
            stderrBuffer += chunk.toString();
          });

          // Handle process completion
          claude.on('close', (code) => {
            log.debug('CLI pre-warm process closed', {
              exitCode: code,
              receivedInit
            });

            if (!receivedInit && stderrBuffer) {
              const errorMessage = {
                type: 'error',
                error: `Pre-warm failed: ${stderrBuffer}`,
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`)
              );
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          });

          // Handle process errors
          claude.on('error', (error) => {
            const errorMessage = {
              type: 'error',
              error: `Failed to spawn CLI: ${error.message}`,
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`)
            );
            controller.close();
          });

          // Send /status command to trigger system.init without API cost
          claude.stdin.write('/status\n');
          claude.stdin.end();
        } catch (error: any) {
          const errorMessage = {
            type: 'error',
            error: error.message || 'Unknown error occurred',
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
