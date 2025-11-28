/**
 * Extracts the original filename from a storage path.
 * Storage paths can be in two formats:
 * - Old format: v{version}_{filename}
 * - New format: v{version}_user{userId}_{filename}
 * 
 * @param storagePath - The full storage path or just the filename part
 * @returns The original filename without version/user prefixes
 */
export function extractOriginalFilename(storagePath: string): string {
  if (!storagePath) return '';
  
  // Extract just the filename part (after the last slash)
  const filename = storagePath.split('/').pop() || storagePath;
  
  // Match patterns like:
  // - v1_filename.pdf (old format)
  // - v1_user550e8400-e29b-41d4-a716-446655440000_filename.pdf (new format)
  // User ID can be a UUID (with hyphens) or any string without underscores
  const versionPattern = /^v\d+_user[^_]+_(.+)$/; // New format with user ID (UUIDs contain hyphens, so [^_]+ works)
  const oldVersionPattern = /^v\d+_(.+)$/; // Old format without user ID
  
  const newFormatMatch = filename.match(versionPattern);
  if (newFormatMatch) {
    return newFormatMatch[1];
  }
  
  const oldFormatMatch = filename.match(oldVersionPattern);
  if (oldFormatMatch) {
    return oldFormatMatch[1];
  }
  
  // If no pattern matches, return the filename as-is (might already be clean)
  return filename;
}

