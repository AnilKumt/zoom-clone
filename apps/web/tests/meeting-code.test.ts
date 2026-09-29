import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseMeetingCode, isValidMeetingInput } from '../lib/meeting-code';
import { formatMeetingId } from '../lib/utils';

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

  it('parses full invite links', () => {
    const res = parseMeetingCode('https://zoom.us/j/8338347512?pwd=secret');
    assert.deepStrictEqual(res, { type: 'numeric', code: '8338347512' });
  });

  it('parses personal link names', () => {
    const res = parseMeetingCode('anil-standup');
    assert.deepStrictEqual(res, { type: 'personal_link', name: 'anil-standup' });
  });

  it('rejects invalid inputs', () => {
    assert.strictEqual(parseMeetingCode(''), null);
    assert.strictEqual(parseMeetingCode('123'), null);
    assert.strictEqual(parseMeetingCode('123456789012'), null);
  });

  it('validates input correctly', () => {
    assert.strictEqual(isValidMeetingInput('833 834 7512'), true);
    assert.strictEqual(isValidMeetingInput('not valid!'), false);
  });
});

describe('formatMeetingId', () => {
  it('formats 10 digits as XXX XXX XXXX', () => {
    assert.strictEqual(formatMeetingId('8338347512'), '833 834 7512');
  });
});
