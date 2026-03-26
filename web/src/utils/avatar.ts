/**
 * Avatar utility functions for generating initials and colors from user data
 */

interface User {
  id?: number;
  firstName: string | null;
  lastName?: string | null;
  username: string | null;
}

/**
 * Generates initials from a user's name
 * @param user - User object with firstName, lastName, and username
 * @returns Two-character initials or "?" if no suitable name is available
 */
export function getInitials(user: User): string {
  // Try firstName + lastName (both must be non-empty)
  if (user.firstName && user.lastName) {
    return (user.firstName[0] + user.lastName[0]).toUpperCase();
  }

  // Try firstName only (if lastName is missing, repeat first letter)
  if (user.firstName) {
    return (user.firstName[0] + user.firstName[0]).toUpperCase();
  }

  // Fallback to username
  if (user.username) {
    // Try to extract two initials from username by taking first letters of "words"
    // Words can be separated by spaces, underscores, hyphens, or camelCase boundaries
    const words = user.username
      .split(/[\s._-]+|(?=[A-Z])/) // Split by separators or before uppercase letters
      .filter((part) => part.length > 0);

    if (words.length >= 2) {
      // Take first letter of first two words
      return (words[0][0] + words[1][0]).toUpperCase();
    }

    // If only one word or part, use first two characters
    if (user.username.length >= 2) {
      return user.username.substring(0, 2).toUpperCase();
    }
  }

  // Fallback to "?"
  return "?";
}

/**
 * Predefined color palette for avatars
 */
const AVATAR_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#FFA07A", // Light Salmon
  "#98D8C8", // Mint
  "#F7DC6F", // Gold
  "#BB8FCE", // Purple
  "#85C1E2", // Light Blue
];

/**
 * Generates a consistent color from a name using a simple hash function
 * @param name - The name to hash
 * @returns A hex color code from the predefined palette
 */
export function generateColorFromName(name: string): string {
  // Convert name to lowercase for consistent hashing
  const normalizedName = name.toLowerCase();

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < normalizedName.length; i++) {
    const char = normalizedName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
