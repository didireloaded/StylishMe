export const STORY_DURATION = 5_000;

export function getStoryIndex(index: number, storyCount: number) {
  if (storyCount <= 0) return 0;
  return ((index % storyCount) + storyCount) % storyCount;
}

export function canAutoAdvance(documentHidden: boolean, prefersReducedMotion: boolean) {
  return !documentHidden && !prefersReducedMotion;
}

export function getFocusWrapIndex(
  activeIndex: number,
  focusableCount: number,
  reverse: boolean,
) {
  if (focusableCount <= 0) return null;
  if (activeIndex < 0) return reverse ? focusableCount - 1 : 0;
  if (reverse && activeIndex === 0) return focusableCount - 1;
  if (!reverse && activeIndex === focusableCount - 1) return 0;
  return null;
}
