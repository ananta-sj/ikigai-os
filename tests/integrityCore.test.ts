import test from 'node:test';
import assert from 'node:assert/strict';
import { describeBackupIssue, inspectBackupTables, isDateKey, isIsoTimestamp } from '../src/lib/integrityCore.ts';

const tables = ['tasks', 'memories', 'memoryAttachments'] as const;

test('accepts a structurally valid backup table set', () => {
  const result = inspectBackupTables({
    tasks: [{ id: 'task-1', title: 'Ship', createdAt: '2026-09-25T12:00:00.000Z' }],
    memories: [{ id: 'memory-1', title: 'Proof' }],
    memoryAttachments: [{
      id: 'attachment-1',
      memoryId: 'memory-1',
      blob: { __ikigaiBlob: true, type: 'text/plain', data: 'aGVsbG8=' }
    }]
  }, tables);

  assert.equal(result.issues.length, 0);
  assert.equal(result.totalRecords, 3);
  assert.equal(result.counts.tasks, 1);
});

test('rejects duplicate primary keys before restore', () => {
  const result = inspectBackupTables({
    tasks: [{ id: 'same' }, { id: 'same' }]
  }, tables);

  assert.equal(result.issues.length, 1);
  assert.match(describeBackupIssue(result.issues[0]), /Duplicate primary key/);
});

test('rejects malformed table containers and records', () => {
  const result = inspectBackupTables({
    tasks: { id: 'not-an-array' },
    memories: [null]
  }, tables);

  assert.equal(result.issues.length, 2);
  assert.match(describeBackupIssue(result.issues[0]), /Expected an array/);
  assert.match(describeBackupIssue(result.issues[1]), /Record is not an object/);
});

test('rejects malformed serialized attachments', () => {
  const result = inspectBackupTables({
    memoryAttachments: [{
      id: 'attachment-1',
      memoryId: 'memory-1',
      blob: { __ikigaiBlob: true, type: 'image/png', data: '%%%' }
    }]
  }, tables);

  assert.equal(result.issues.length, 1);
  assert.match(describeBackupIssue(result.issues[0]), /invalid serialized attachment/);
});

test('date guards reject impossible calendar dates', () => {
  assert.equal(isDateKey('2026-09-25'), true);
  assert.equal(isDateKey('2026-02-30'), false);
  assert.equal(isDateKey('25-09-2026'), false);
  assert.equal(isIsoTimestamp('2026-09-25T12:30:00.000Z'), true);
  assert.equal(isIsoTimestamp('not-a-date'), false);
});

test('resource limits reject pathological backup record counts', async () => {
  const { inspectBackupResourceLimits } = await import('../src/lib/integrityCore.ts');
  const result = inspectBackupResourceLimits({ tasks: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }, ['tasks'], { maxRecords: 2, maxSerializedBlobChars: 100 });
  assert.equal(result.length, 1);
  assert.match(describeBackupIssue(result[0]), /more than 2 records/i);
});

test('resource limits reject oversized serialized attachments before decode', async () => {
  const { inspectBackupResourceLimits } = await import('../src/lib/integrityCore.ts');
  const result = inspectBackupResourceLimits({
    memoryAttachments: [{ id: 'attachment-1', blob: { __ikigaiBlob: true, type: 'application/octet-stream', data: 'a'.repeat(101) } }]
  }, ['memoryAttachments'], { maxRecords: 10, maxSerializedBlobChars: 100 });
  assert.equal(result.length, 1);
  assert.match(describeBackupIssue(result[0]), /too large/i);
});
