export function getOmNestedValue<T>(
  content: Record<string, any> | null | undefined,
  path: string[],
  fallback: T
): T {
  if (!content) return fallback;
  let current: any = content;

  for (const segment of path) {
    if (current == null || typeof current !== 'object' || !(segment in current)) {
      return fallback;
    }
    current = current[segment];
  }

  return (current as T) ?? fallback;
}

