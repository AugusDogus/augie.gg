/** Keys on the page that belong to the open project, wherever it is shown. */
export const PeekKeys = {
  /**
   * Whether a key is the open project's to handle: not already handled, not
   * typed into a field, without modifiers (Tab aside), and not meant for
   * another dialog, such as the command menu.
   */
  claims(event: KeyboardEvent, surface: HTMLElement | null): boolean {
    const target = event.target;
    if (event.defaultPrevented || !(target instanceof Element)) return false;
    if (
      (target instanceof HTMLElement && target.isContentEditable) ||
      target.closest("input, textarea, select") !== null
    )
      return false;
    if (event.metaKey || event.ctrlKey || event.altKey) return false;
    return (
      target.closest('[role="dialog"]') === null ||
      surface?.contains(target) === true
    );
  },
  /** Which way a key steps through the list: ← or k back, → or j on. */
  step(event: KeyboardEvent): -1 | 1 | null {
    switch (event.key) {
      case "ArrowLeft":
      case "k":
        return -1;
      case "ArrowRight":
      case "j":
        return 1;
      default:
        return null;
    }
  },
} as const;
