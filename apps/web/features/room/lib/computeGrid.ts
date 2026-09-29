/**
 * Pure function to compute optimal grid dimensions (rows, cols, tile width, tile height)
 * maximizing tile area at a 16:9 aspect ratio.
 *
 * Unit-tested for n = 1...49 participants.
 */
export interface GridLayout {
  cols: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
}

export function computeGrid(
  participantCount: number,
  containerWidth: number,
  containerHeight: number,
  aspectRatio = 16 / 9
): GridLayout {
  if (participantCount <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { cols: 1, rows: 1, tileWidth: 0, tileHeight: 0 };
  }

  let bestLayout: GridLayout = {
    cols: 1,
    rows: 1,
    tileWidth: 0,
    tileHeight: 0,
  };
  let maxArea = 0;

  for (let cols = 1; cols <= participantCount; cols++) {
    const rows = Math.ceil(participantCount / cols);
    const availableWidth = containerWidth / cols;
    const availableHeight = containerHeight / rows;

    let width = availableWidth;
    let height = width / aspectRatio;

    if (height > availableHeight) {
      height = availableHeight;
      width = height * aspectRatio;
    }

    const area = width * height;
    if (area >= maxArea) {
      maxArea = area;
      bestLayout = {
        cols,
        rows,
        tileWidth: Math.floor(width),
        tileHeight: Math.floor(height),
      };
    }
  }

  return bestLayout;
}
