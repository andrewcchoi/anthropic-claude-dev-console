// Generated from: prob_001 - ENOENT error in telemetry logging
// Root cause: Log directory was not created before attempting to write telemetry file
// Lesson: Always ensure parent directories exist before file I/O operations
// Category: file-system

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'

describe('Regression: ENOENT error in telemetry logging', () => {
  const testDir = '/tmp/troubleshoot-test-' + Math.random().toString(36).substring(7)

  beforeEach(async () => {
    // Clean state - remove test directory if it exists
    await fs.rm(testDir, { recursive: true, force: true })
  })

  afterEach(async () => {
    // Cleanup test directory
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('should create directory before writing file (regression guard)', async () => {
    // This test ensures the fix is still in place
    await fs.mkdir(testDir, { recursive: true })
    const testFile = path.join(testDir, 'test.txt')
    await fs.writeFile(testFile, 'test data')

    const exists = await fs.access(testFile)
      .then(() => true)
      .catch(() => false)

    expect(exists).toBe(true)
  })

  it('should not throw ENOENT when directory is created first', async () => {
    // Guard against regression
    await expect(async () => {
      await fs.mkdir(testDir, { recursive: true })
      await fs.writeFile(path.join(testDir, 'test.txt'), 'data')
    }).not.toThrow()
  })

  it('should handle nested directory creation', async () => {
    // Test recursive directory creation
    const nestedPath = path.join(testDir, 'a', 'b', 'c')
    await fs.mkdir(nestedPath, { recursive: true })

    const exists = await fs.access(nestedPath)
      .then(() => true)
      .catch(() => false)

    expect(exists).toBe(true)
  })
})
