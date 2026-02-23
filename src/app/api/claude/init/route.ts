import { spawn } from 'child_process';
import { NextRequest } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createServerLogger } from '@/lib/logger/server';

const log = createServerLogger('ClaudeInitAPI');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sanitize stderr to prevent secret exposure in logs
const sanitizeStderr = (stderr: string): string => {
  // Remove API keys (sk- prefix + 32+ chars)
  let sanitized = stderr.replace(/sk-[a-zA-Z0-9_-]{32,}/g, '[API_KEY_REDACTED]');
  // Remove long tokens (48+ chars)
  sanitized = sanitized.replace(/[a-zA-Z0-9_-]{48,}/g, '[TOKEN_REDACTED]');
  // Remove file paths with usernames
  sanitized = sanitized.replace(/\/home\/[^\/\s]+/g, '/home/[USER]');
  sanitized = sanitized.replace(/\/Users\/[^\/\s]+/g, '/Users/[USER]');
  return sanitized;
};

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

    // Validate provider configuration BEFORE spawning CLI
    if (provider === 'foundry') {
      const config = providerConfig as any;

      if (!config?.foundryApiKey) {
        const errorMsg = 'Foundry provider requires API key. Please configure in Settings.';
        log.error('Missing foundry API key', {
          provider,
          hasConfig: !!providerConfig,
          configKeys: providerConfig ? Object.keys(providerConfig) : [],
        });

        return new Response(
          JSON.stringify({ error: errorMsg }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (!config?.foundryResource) {
        const errorMsg = 'Foundry provider requires resource configuration.';
        log.error('Missing foundry resource', { provider });

        return new Response(
          JSON.stringify({ error: errorMsg }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      log.debug('Foundry provider config validated', {
        hasApiKey: !!config.foundryApiKey,
        hasResource: !!config.foundryResource,
      });
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
            const stderrChunk = chunk.toString();
            stderrBuffer += stderrChunk;

            // Log sanitized stderr for debugging (only in debug mode)
            if (process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
              log.debug('CLI stderr output', { stderr: sanitizeStderr(stderrChunk) });
            }
          });

          // Handle process completion
          claude.on('close', (code) => {
            log.debug('CLI pre-warm process closed', {
              exitCode: code,
              receivedInit
            });

            // Report errors if we didn't receive init message
            if (!receivedInit) {
              const errorMessage = stderrBuffer || `CLI pre-warm exited with code ${code} (no error output)`;

              log.error('CLI pre-warm failed', {
                exitCode: code,
                hadStderr: !!stderrBuffer,
                stderrLength: stderrBuffer.length,
                provider,
                model,
              });

              const errorEvent = {
                type: 'error',
                error: `Pre-warm failed: ${errorMessage}`,
              };
              try {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
                );
              } catch (e) {
                log.error('Failed to send error event', { error: e });
              }
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
