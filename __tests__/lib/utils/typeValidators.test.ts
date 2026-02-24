/**
 * Unit tests for type validators
 *
 * These tests verify that the type validation functions correctly identify:
 * - UUIDs (workspace IDs, session IDs)
 * - Project IDs (encoded paths)
 * - Invalid/empty values
 */

import { describe, it, expect } from 'vitest';
import {
  isUUID,
  isProjectId,
  isSessionId,
  isWorkspaceId,
  identifyIdType,
  assertProjectId,
  assertSessionId,
  UUID_REGEX,
  PROJECT_ID_REGEX,
} from '../../../src/lib/utils/typeValidators';

describe('isUUID', () => {
  it('should return true for valid UUID v4', () => {
    expect(isUUID('ca31cb4c-1234-5678-9abc-def012345678')).toBe(true);
    expect(isUUID('00000000-0000-0000-0000-000000000000')).toBe(true);
    expect(isUUID('FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF')).toBe(true);
  });

  it('should return true for mixed case UUIDs', () => {
    expect(isUUID('Ca31Cb4c-1234-5678-9AbC-DeF012345678')).toBe(true);
  });

  it('should return false for project IDs (encoded paths)', () => {
    expect(isUUID('-workspace')).toBe(false);
    expect(isUUID('-workspace-docs')).toBe(false);
    expect(isUUID('-home-user-project')).toBe(false);
  });

  it('should return false for filesystem paths', () => {
    expect(isUUID('/workspace')).toBe(false);
    expect(isUUID('/workspace/docs')).toBe(false);
  });

  it('should return false for empty/null/undefined', () => {
    expect(isUUID('')).toBe(false);
    expect(isUUID(null)).toBe(false);
    expect(isUUID(undefined)).toBe(false);
  });

  it('should return false for partial UUIDs', () => {
    expect(isUUID('ca31cb4c-1234-5678-9abc')).toBe(false);
    expect(isUUID('ca31cb4c')).toBe(false);
  });

  it('should return false for UUIDs without dashes', () => {
    expect(isUUID('ca31cb4c123456789abcdef012345678')).toBe(false);
  });
});

describe('isProjectId', () => {
  it('should return true for valid project IDs (encoded paths)', () => {
    expect(isProjectId('-workspace')).toBe(true);
    expect(isProjectId('-workspace-docs')).toBe(true);
    expect(isProjectId('-home-user-project')).toBe(true);
    expect(isProjectId('-Users-john-code-myapp')).toBe(true);
  });

  it('should return false for UUIDs (common mistake)', () => {
    // This is the bug we want to catch!
    expect(isProjectId('ca31cb4c-1234-5678-9abc-def012345678')).toBe(false);
  });

  it('should return false for filesystem paths (not encoded)', () => {
    expect(isProjectId('/workspace')).toBe(false);
    expect(isProjectId('/workspace/docs')).toBe(false);
  });

  it('should return false for paths without leading dash', () => {
    expect(isProjectId('workspace')).toBe(false);
    expect(isProjectId('workspace-docs')).toBe(false);
  });

  it('should return false for empty/null/undefined', () => {
    expect(isProjectId('')).toBe(false);
    expect(isProjectId(null)).toBe(false);
    expect(isProjectId(undefined)).toBe(false);
  });
});

describe('isSessionId', () => {
  it('should return true for valid session IDs (UUIDs)', () => {
    expect(isSessionId('ca31cb4c-1234-5678-9abc-def012345678')).toBe(true);
  });

  it('should return false for project IDs', () => {
    expect(isSessionId('-workspace-docs')).toBe(false);
  });

  it('should return false for empty/null/undefined', () => {
    expect(isSessionId('')).toBe(false);
    expect(isSessionId(null)).toBe(false);
    expect(isSessionId(undefined)).toBe(false);
  });
});

describe('isWorkspaceId', () => {
  it('should return true for valid workspace IDs (UUIDs)', () => {
    expect(isWorkspaceId('ca31cb4c-1234-5678-9abc-def012345678')).toBe(true);
  });

  it('should return false for project IDs', () => {
    expect(isWorkspaceId('-workspace-docs')).toBe(false);
  });

  it('should return false for empty/null/undefined', () => {
    expect(isWorkspaceId('')).toBe(false);
    expect(isWorkspaceId(null)).toBe(false);
    expect(isWorkspaceId(undefined)).toBe(false);
  });
});

describe('identifyIdType', () => {
  it('should identify UUIDs correctly', () => {
    expect(identifyIdType('ca31cb4c-1234-5678-9abc-def012345678')).toBe('uuid (workspace/session ID)');
  });

  it('should identify project IDs correctly', () => {
    expect(identifyIdType('-workspace-docs')).toBe('project ID (encoded path)');
  });

  it('should identify filesystem paths', () => {
    expect(identifyIdType('/workspace/docs')).toBe('filesystem path (not encoded)');
  });

  it('should identify empty values', () => {
    expect(identifyIdType('')).toBe('empty');
    expect(identifyIdType(null)).toBe('empty');
    expect(identifyIdType(undefined)).toBe('empty');
  });

  it('should identify unknown formats', () => {
    expect(identifyIdType('random-string')).toBe('unknown format');
    expect(identifyIdType('123456')).toBe('unknown format');
  });
});

describe('assertProjectId', () => {
  it('should not throw for valid project IDs', () => {
    expect(() => assertProjectId('-workspace-docs', 'test')).not.toThrow();
    expect(() => assertProjectId('-workspace', 'test')).not.toThrow();
  });

  it('should throw for UUIDs with helpful message', () => {
    expect(() => assertProjectId('ca31cb4c-1234-5678-9abc-def012345678', 'switchSession'))
      .toThrow(/UUID.*getProjectIdFromWorkspace/);
  });

  it('should throw for empty values', () => {
    expect(() => assertProjectId('', 'test')).toThrow(/empty value/);
    expect(() => assertProjectId(null, 'test')).toThrow(/empty value/);
    expect(() => assertProjectId(undefined, 'test')).toThrow(/empty value/);
  });

  it('should throw for filesystem paths', () => {
    expect(() => assertProjectId('/workspace/docs', 'test')).toThrow(/filesystem path/);
  });
});

describe('assertSessionId', () => {
  it('should not throw for valid session IDs (UUIDs)', () => {
    expect(() => assertSessionId('ca31cb4c-1234-5678-9abc-def012345678', 'test')).not.toThrow();
  });

  it('should throw for project IDs', () => {
    expect(() => assertSessionId('-workspace-docs', 'test')).toThrow();
  });

  it('should throw for empty values', () => {
    expect(() => assertSessionId('', 'test')).toThrow(/empty value/);
    expect(() => assertSessionId(null, 'test')).toThrow(/empty value/);
    expect(() => assertSessionId(undefined, 'test')).toThrow(/empty value/);
  });
});

describe('UUID_REGEX', () => {
  it('should match valid UUIDs', () => {
    expect(UUID_REGEX.test('ca31cb4c-1234-5678-9abc-def012345678')).toBe(true);
    expect(UUID_REGEX.test('invalid')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(UUID_REGEX.flags).toContain('i');
  });
});

describe('PROJECT_ID_REGEX', () => {
  it('should match valid project IDs', () => {
    expect(PROJECT_ID_REGEX.test('-workspace')).toBe(true);
    expect(PROJECT_ID_REGEX.test('-workspace-docs')).toBe(true);
    expect(PROJECT_ID_REGEX.test('workspace')).toBe(false);
  });
});
