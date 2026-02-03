import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MAX_FILE_SIZE, MAX_TOTAL_SIZE, MAX_FILES } from '@/types/upload';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const sessionId = formData.get('sessionId') as string;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Validate file count
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES} files allowed` }, { status: 400 });
    }

    // Validate individual file sizes and calculate total
    let totalSize = 0;
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
          { status: 400 }
        );
      }
      totalSize += file.size;
    }

    // Validate total size
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { error: `Total size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Create upload directory
    const uploadDir = join('/workspace', '.claude-uploads', sessionId);
    await mkdir(uploadDir, { recursive: true });

    // Save files and collect results
    const results = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.substring(file.name.lastIndexOf('.'));
        const uuid = uuidv4();
        const filename = `${uuid}${ext}`;
        const savedPath = join(uploadDir, filename);

        await writeFile(savedPath, buffer);

        return {
          id: uuid,
          originalName: file.name,
          savedPath,
          size: file.size,
          type: file.type,
        };
      })
    );

    return NextResponse.json({ files: results });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}
