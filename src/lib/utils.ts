import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Invalid assignee patterns to filter out (teams, placeholders, deleted users, etc.)
const INVALID_ASSIGNEE_PATTERNS = [
  /^unassigned$/i,
  /^deleted\s*user$/i,
  /team$/i,                    // Ends with "Team" (e.g., "Orion Team", "Internet Aman Team")
  /^#N\/A$/i,
  /^\s*$/,                     // Empty or whitespace
  /^n\/a$/i,
  /^-$/,
  /^none$/i,
];

/**
 * Check if assignee is a valid person (not a team name, placeholder, or deleted user)
 * @param assignee - The assignee name to validate
 * @returns true if the assignee is a valid person name
 */
export function isValidAssignee(assignee: string): boolean {
  if (!assignee || assignee.trim() === "") return false;
  return !INVALID_ASSIGNEE_PATTERNS.some(pattern => pattern.test(assignee.trim()));
}
