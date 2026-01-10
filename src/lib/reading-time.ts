// Calculate estimated reading time from text content
export function calculateReadingTime(
  text: string,
  wordsPerMinute = 225
): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return Math.max(1, minutes); // Minimum 1 minute for very short posts
}
