export type SceneFit = 'width' | 'contain';

export type FitInput = {
  /** Space the slot gives the scene, in px. */
  availableWidth: number;
  /** Needed for fit = 'contain'. */
  availableHeight?: number;
  /** scene.aspectRatio (width / height) */
  aspectRatio: number;
  maxWidth?: number;
  maxHeight?: number;
  /**
   * 'width'   (default) — fill the available width, height follows the aspect ratio.
   * 'contain' — fit entirely inside availableWidth × availableHeight.
   */
  fit?: SceneFit;
};

const positive = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/**
 * Width (px) the scene should render at so it never exceeds the given bounds and never distorts.
 * Height is always width / aspectRatio. Returns 0 while the available size is unknown.
 */
export function fitSceneWidth({ availableWidth, availableHeight, aspectRatio, maxWidth, maxHeight, fit }: FitInput): number {
  if (!positive(availableWidth) || !positive(aspectRatio)) return 0;

  let width = availableWidth;
  if (positive(maxWidth)) width = Math.min(width, maxWidth);
  if (positive(maxHeight)) width = Math.min(width, maxHeight * aspectRatio);
  if (fit === 'contain') {
    if (!positive(availableHeight)) return 0;
    width = Math.min(width, availableHeight * aspectRatio);
  }
  return Math.max(0, width);
}
