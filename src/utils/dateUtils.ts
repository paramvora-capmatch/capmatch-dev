/**
 * Formats a date string to a readable format
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "Nov 7, 2025, 11:15 AM")
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Checks if an invite has expired
 * @param expiresAt - ISO date string for expiration
 * @returns true if the invite has expired
 */
export const isInviteExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date();
};

