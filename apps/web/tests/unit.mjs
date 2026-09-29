import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseMeetingCode, isValidMeetingInput } from '../lib/meeting-code.js';
import { formatMeetingId } from '../lib/utils.js';
import { computeGrid } from '../features/room/lib/computeGrid.js';

describe('meeting-code parser', () => {
  it('parses pure 10-digit codes', () => {
    const res = parseMeetingCode('8338347512');
    assert.deepStrictEqual(res, { type: 'numeric', code: '8338347512' });
  });

  it('parses space-separated 10-digit codes', () => {
    const res = parseMeetingCode('833 834 7512');
    assert.deepStrictEqual(res, { type: 'numeric', code: '8338347512' });
  });

  it('parses dashed 10-digit codes', () => {
    const res = parseMeetingCode('833-834-7512');
    assert.deepStrictEqual(res, { type: 'numeric', code: '8338347512' });
  });

  it('parses personal link names', () => {
    const res = parseMeetingCode('anil-standup');
    assert.deepStrictEqual(res, { type: 'personal_link', name: 'anil-standup' });
  });

  it('validates input correctly', () => {
    assert.strictEqual(isValidMeetingInput('833 834 7512'), true);
    assert.strictEqual(isValidMeetingInput('invalid!'), false);
  });
});

describe('formatMeetingId', () => {
  it('formats 10 digits as XXX XXX XXXX', () => {
    assert.strictEqual(formatMeetingId('8338347512'), '833 834 7512');
  });
});

describe('computeGrid layout algorithm', () => {
  it('returns single full-size tile for 1 participant', () => {
    const layout = computeGrid(1, 1920, 1080);
    assert.strictEqual(layout.cols, 1);
    assert.strictEqual(layout.rows, 1);
    assert.strictEqual(layout.tileWidth, 1920);
    assert.strictEqual(layout.tileHeight, 1080);
  });

  it('computes 2 columns for 2 participants on widescreen', () => {
    const layout = computeGrid(2, 1920, 1080);
    assert.strictEqual(layout.cols, 2);
    assert.strictEqual(layout.rows, 1);
  });

  it('computes 2x2 grid for 4 participants', () => {
    const layout = computeGrid(4, 1920, 1080);
    assert.strictEqual(layout.cols, 2);
    assert.strictEqual(layout.rows, 2);
  });

  it('computes 3x3 grid for 9 participants', () => {
    const layout = computeGrid(9, 1920, 1080);
    assert.strictEqual(layout.cols, 3);
    assert.strictEqual(layout.rows, 3);
  });
});
