import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeGrid } from '../features/room/lib/computeGrid';

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

  it('handles edge case of 0 participants gracefully', () => {
    const layout = computeGrid(0, 800, 600);
    assert.strictEqual(layout.tileWidth, 0);
    assert.strictEqual(layout.tileHeight, 0);
  });
});
