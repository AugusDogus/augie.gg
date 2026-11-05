/** Drag-to-dismiss physics for the bottom sheet. */
export const Drag = {
  /** How far an upward drag can lift the sheet, in px. */
  UPWARD_LIMIT: 64,
  /** Sheet offset for a pointer travel of `dy` px; upward travel is rubber-banded. */
  offset(dy: number): number {
    if (dy >= 0) return dy;
    const travel = -dy;
    return (
      -(travel * Drag.UPWARD_LIMIT * 0.55) / (Drag.UPWARD_LIMIT + 0.55 * travel)
    );
  },
  /** A flick faster than 0.11 px/ms, or a drag past a quarter of the sheet, dismisses it. */
  shouldDismiss({
    distance,
    elapsed,
    height,
  }: {
    distance: number;
    elapsed: number;
    height: number;
  }): boolean {
    if (distance <= 0) return false;
    return distance / Math.max(elapsed, 1) > 0.11 || distance > height / 4;
  },
} as const;
