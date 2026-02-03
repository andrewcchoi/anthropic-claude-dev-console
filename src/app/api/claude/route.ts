import { spawn } from 'child_process';
import { NextRequest } from 'next/server';
import { appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { parseTelemetry } from '@/lib/telemetry';
import { createServerLogger } from '@/lib/logger/server';

const log = createServerLogger('ClaudeAPI');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TELEMETRY_LOG = '/workspace/logs/telemetry.jsonl';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, sessionId, cwd, model, provider, providerConfig } = body;

    log.debug('Received chat request', {
      sessionId,
      cwd,
      model,
      provider,
      promptLength: prompt.length
    });

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

          // Check if session file exists to determine whether to use --resume or --session-id
          if (sessionId) {
            const sessionPath = join(homedir(), '.claude', 'projects', '-workspace', `${sessionId}.jsonl`);
            const sessionExists = existsSync(sessionPath);

            if (sessionExists) {
              args.push('--resume', sessionId);  // Resume existing session
            } else {
              args.push('--session-id', sessionId);  // Create new session
              // Add model flag for new sessions only
              if (model) {
                args.push('--model', model);
              }
            }
          } else if (model) {
            // No session ID but model specified
            args.push('--model', model);
          }

          // Build environment based on provider (with API key authentication)
          const env = { ...process.env };

          if (provider === 'anthropic') {
            // Anthropic direct API
            if (providerConfig?.anthropicApiKey) {
              env.ANTHROPIC_API_KEY = providerConfig.anthropicApiKey;
            }
          } else if (provider === 'bedrock') {
            // AWS Bedrock
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
            // Google Vertex AI (uses gcloud auth, not API key)
            env.CLAUDE_CODE_USE_VERTEX = '1';
            if (providerConfig?.vertexRegion) {
              env.CLOUD_ML_REGION = providerConfig.vertexRegion;
            }
            if (providerConfig?.vertexProjectId) {
              env.ANTHROPIC_VERTEX_PROJECT_ID = providerConfig.vertexProjectId;
            }
          } else if (provider === 'foundry') {
            // Azure Foundry
            env.CLAUDE_CODE_USE_FOUNDRY = '1';
            if (providerConfig?.foundryApiKey) {
              env.ANTHROPIC_FOUNDRY_API_KEY = providerConfig.foundryApiKey;
            }
            if (providerConfig?.foundryResource) {
              env.ANTHROPIC_FOUNDRY_RESOURCE = providerConfig.foundryResource;
            }
          }

          // Spawn Claude CLI process
          log.debug('Spawning Claude CLI', {
            args,
            cwd: cwd || '/workspace',
            provider,
            hasCustomEnv: provider !== 'anthropic'
          });

          const claude = spawn('claude', args, {
            cwd: cwd || '/workspace',
            stdio: ['pipe', 'pipe', 'pipe'],
            env,
          });

          let stderrBuffer = '';
          let receivedSuccessResult = false;
          let telemetryBuffer = '';
          let inTelemetryBlock = false;
          let bracketDepth = 0;

          // Handle stdout (JSON stream)
          claude.stdout.on('data', (chunk: Buffer) => {
            log.debug('CLI stdout chunk', { bytesReceived: chunk.length });

            const data = chunk.toString();
            const lines = data.split('\n');

            for (const line of lines) {
              const trimmed = line.trim();

              // Skip empty lines
              if (!trimmed) continue;

              // Detect telemetry blocks by looking for telemetry-specific keywords
              const isTelemetryLine = trimmed.includes('descriptor:') ||
                                      trimmed.includes('dataPointType:') ||
                                      trimmed.includes('dataPoints:') ||
                                      trimmed.includes('attributes:') ||
                                      trimmed.includes('startTime:') ||
                                      trimmed.includes('endTime:') ||
                                      trimmed.includes('valueType:') ||
                                      trimmed.includes('advice:');

              if (isTelemetryLine) {
                inTelemetryBlock = true;
              }

              // If we're in a telemetry block, capture everything
              if (inTelemetryBlock) {
                telemetryBuffer += line + '\n';

                // Count braces to track nesting
                for (const char of trimmed) {
                  if (char === '{') bracketDepth++;
                  if (char === '}') bracketDepth--;
                }

                // End of top-level telemetry object
                if (bracketDepth === 0 && trimmed === '}') {
                  inTelemetryBlock = false;
                }
                continue;
              }

              // Try to parse as valid JSON message
              try {
                const parsed = JSON.parse(trimmed);
                // Only send if it's a valid Claude CLI message with a type field
                if (parsed.type) {
                  // Track if we received a successful result
                  if (parsed.type === 'result' && parsed.subtype === 'success') {
                    receivedSuccessResult = true;
                  }
                  controller.enqueue(encoder.encode(`data: ${trimmed}\n\n`));
                }
              } catch (e) {
                // If it's a standalone brace and not in telemetry, it might be the start of one
                if (trimmed === '{') {
                  // Start buffering - next line might be telemetry
                  telemetryBuffer += line + '\n';
                  bracketDepth = 1;
                  // Don't set inTelemetryBlock yet - wait for confirmation
                }
                // Skip other invalid JSON lines
              }
            }
          });

          // Capture stderr for error reporting
          claude.stderr.on('data', (chunk: Buffer) => {
            stderrBuffer += chunk.toString();
          });

          // Handle process completion
          claude.on('close', async (code) => {
            log.debug('CLI process closed', {
              exitCode: code,
              hadSuccess: receivedSuccessResult
            });

            // Parse and log telemetry if we captured any
            if (telemetryBuffer) {
              try {
                // Ensure log directory exists
                await mkdir('/workspace/logs', { recursive: true });

                const entries = parseTelemetry(telemetryBuffer);
                for (const entry of entries) {
                  const logEntry = {
                    timestamp: new Date().toISOString(),
                    ...entry
                  };
                  await appendFile(TELEMETRY_LOG, JSON.stringify(logEntry) + '\n');
                }
              } catch (e) {
                // Silently fail telemetry logging to not disrupt the response
                log.error('Failed to log telemetry', { error: e });
              }
            }

            // Only report errors if we didn't receive a success result and exit code is non-zero
            if (code !== 0 && !receivedSuccessResult && stderrBuffer) {
              // Check for session lock error
              if (stderrBuffer.includes('already in use')) {
                const errorMessage = {
                  type: 'session_locked',
                  error: 'Session ID conflict - regenerating',
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`)
                );
              } else {
                const errorMessage = {
                  type: 'error',
                  error: `Claude CLI exited with code ${code}: ${stderrBuffer}`,
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`)
                );
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          });

          // Handle process errors
          claude.on('error', (error) => {
            const errorMessage = {
              type: 'error',
              error: `Failed to spawn Claude CLI: ${error.message}`,
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`)
            );
            controller.close();
          });

          // Write prompt to stdin and close
          claude.stdin.write(prompt + '\n');
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
