/** The row a key moves roving focus to, or null when the key does not move it. */
export function rovingTarget(
  order: readonly string[],
  current: string,
  key: string,
): string | null {
  const index = order.indexOf(current);
  if (index === -1) return null;
  switch (key) {
    case "ArrowDown":
    case "j":
      return order[index + 1] ?? null;
    case "ArrowUp":
    case "k":
      return order[index - 1] ?? null;
    case "Home":
      return order[0] ?? null;
    case "End":
      return order.at(-1) ?? null;
    default:
      return null;
  }
}
