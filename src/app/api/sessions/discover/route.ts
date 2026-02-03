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
        // Index doesn't exist or is invalid - skip this project
        console.warn(`No session index for project ${projectId}:`, error);
      }
    }

    // Sort projects by last activity
    projects.sort((a, b) => b.lastActivity - a.lastActivity);

    // Sort sessions by modified time
    sessions.sort((a, b) => b.modifiedAt - a.modifiedAt);

    return {
      projects,
      sessions,
      totalSessions: sessions.length,
      scanDurationMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Error discovering sessions:', error);
    return {
      projects: [],
      sessions: [],
      totalSessions: 0,
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
