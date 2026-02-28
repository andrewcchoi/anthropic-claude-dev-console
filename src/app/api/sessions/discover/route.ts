import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { CLISession, Project, DiscoverResponse, SessionIndex } from '@/types/sessions';

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');

/**
 * Decode project directory name to original path
 * Example: "-workspace" -> "/workspace"
 */
function decodeProjectPath(encoded: string): string {
  // Handle special cases
  if (encoded.startsWith('-')) {
    return '/' + encoded.slice(1);
  }
  // Handle home directory encoding
  if (encoded.startsWith('home-')) {
    return join(homedir(), encoded.slice(5).replace(/-/g, '/'));
  }
  // Default: replace dashes with slashes
  return '/' + encoded.replace(/-/g, '/');
}

/**
 * Scan .jsonl files directly as fallback when sessions-index.json is missing
 */
async function scanSessionFiles(projectPath: string, projectId: string): Promise<CLISession[]> {
  const sessions: CLISession[] = [];

  try {
    const files = await fs.readdir(projectPath);

    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;

      const filePath = join(projectPath, file);
      const stats = await fs.stat(filePath);
      const sessionId = file.replace('.jsonl', '');

      // Read session file to extract metadata
      let name = 'Untitled Session';
      let firstPrompt = '';
      let messageCount = 0;
      let gitBranch: string | undefined = undefined;

      try {
        // Read more of the file to get metadata (8KB should cover initial messages)
        const handle = await fs.open(filePath, 'r');
        const buffer = Buffer.alloc(8192);
        const { bytesRead } = await handle.read(buffer, 0, 8192, 0);
        await handle.close();

        const content = buffer.toString('utf-8', 0, bytesRead);
        const lines = content.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);

            // Extract git branch from any message that has it
            if (!gitBranch && parsed.gitBranch) {
              gitBranch = parsed.gitBranch;
            }

            // Extract name from first user message
            if (!firstPrompt && parsed.type === 'user' && parsed.message?.content) {
              const content = parsed.message.content;
              // Handle both string and array content
              if (typeof content === 'string') {
                // Skip meta messages and commands
                if (!parsed.isMeta && !content.includes('<command-name>') && !content.includes('<local-command-')) {
                  firstPrompt = content;
                  name = firstPrompt.slice(0, 100);
                }
              } else if (Array.isArray(content) && content[0]?.text) {
                firstPrompt = content[0].text;
                name = firstPrompt.slice(0, 100);
              }
            }

            // Count user/assistant messages (exclude tool results and meta)
            if ((parsed.type === 'user' || parsed.type === 'assistant') &&
                !parsed.toolUseResult &&
                !parsed.isMeta) {
              // Additional filter: skip command messages
              const content = parsed.message?.content;
              const isCommand = typeof content === 'string' &&
                (content.includes('<command-name>') || content.includes('<local-command-'));
              if (!isCommand) {
                messageCount++;
              }
            }
          } catch { /* Skip malformed lines */ }
        }
      } catch { /* Use defaults */ }

      // Detect system sessions
      const isSystem = firstPrompt.startsWith('Context: This summary will be shown');

      sessions.push({
        id: sessionId,
        projectId,
        source: 'cli',
        filePath,
        fileSize: stats.size,
        name,
        messageCount: messageCount > 0 ? messageCount : undefined,
        gitBranch,
        modifiedAt: stats.mtimeMs,
        createdAt: stats.birthtimeMs || stats.mtimeMs,
        isSystem,
      });
    }
  } catch (error) {
    console.warn(`Failed to scan session files for ${projectId}:`, error);
  }

  return sessions;
}


/**
 * Discover all CLI sessions across all projects
 */
async function discoverSessions(quick: boolean = true): Promise<DiscoverResponse> {
  const startTime = Date.now();
  const projects: Project[] = [];
  const sessions: CLISession[] = [];

  try {
    // Check if projects directory exists
    try {
      await fs.access(CLAUDE_PROJECTS_DIR);
    } catch {
      // Directory doesn't exist - no CLI sessions
      return {
        projects: [],
        sessions: [],
        totalSessions: 0,
        systemSessionCount: 0,
        scanDurationMs: Date.now() - startTime,
      };
    }

    // Read all project directories
    const projectDirs = await fs.readdir(CLAUDE_PROJECTS_DIR, { withFileTypes: true });

    for (const dir of projectDirs) {
      if (!dir.isDirectory()) continue;

      const projectId = dir.name;
      const projectPath = join(CLAUDE_PROJECTS_DIR, projectId);

      try {
        // Try to read sessions-index.json
        const indexPath = join(projectPath, 'sessions-index.json');
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        const index: SessionIndex = JSON.parse(indexContent);

        if (index.entries.length === 0) continue;

        // Map index entries to CLISession
        let lastActivity = 0;
        for (const entry of index.entries) {
          // Detect system sessions
          const isSystem = entry.firstPrompt?.startsWith('Context: This summary will be shown') || false;

          const session: CLISession = {
            id: entry.sessionId,
            projectId,
            source: 'cli',
            filePath: entry.fullPath,
            fileSize: 0, // Not needed with index
            name: entry.summary || entry.firstPrompt?.slice(0, 100) || 'Untitled Session',
            messageCount: entry.messageCount,
            modifiedAt: new Date(entry.modified).getTime(),
            createdAt: new Date(entry.created).getTime(),
            gitBranch: entry.gitBranch || undefined,
            isSystem,
          };
          sessions.push(session);
          if (session.modifiedAt > lastActivity) {
            lastActivity = session.modifiedAt;
          }
        }

        // Add project
        projects.push({
          id: projectId,
          path: decodeProjectPath(projectId),
          sessionCount: index.entries.length,
          lastActivity,
        });
      } catch (error) {
        // Index doesn't exist or is invalid - fall back to file scanning
        const isEnoent = (error as NodeJS.ErrnoException).code === 'ENOENT';
        if (!isEnoent) {
          console.warn(`Invalid session index for ${projectId}:`, error);
        }

        // Scan .jsonl files directly
        const scannedSessions = await scanSessionFiles(projectPath, projectId);

        if (scannedSessions.length > 0) {
          sessions.push(...scannedSessions);

          let lastActivity = 0;
          for (const s of scannedSessions) {
            if (s.modifiedAt > lastActivity) lastActivity = s.modifiedAt;
          }

          projects.push({
            id: projectId,
            path: decodeProjectPath(projectId),
            sessionCount: scannedSessions.length,
            lastActivity,
          });
        }
      }
    }

    // Sort projects by last activity
    projects.sort((a, b) => b.lastActivity - a.lastActivity);

    // Sort sessions by modified time
    sessions.sort((a, b) => b.modifiedAt - a.modifiedAt);

    // Count system sessions
    const systemSessionCount = sessions.filter(s => s.isSystem).length;

    return {
      projects,
      sessions,
      totalSessions: sessions.length,
      systemSessionCount,
      scanDurationMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Error discovering sessions:', error);
    return {
      projects: [],
      sessions: [],
      totalSessions: 0,
      systemSessionCount: 0,
      scanDurationMs: Date.now() - startTime,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const quick = searchParams.get('quick') !== 'false';

    const result = await discoverSessions(quick);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error in discover endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to discover sessions', details: String(error) },
      { status: 500 }
    );
  }
}
