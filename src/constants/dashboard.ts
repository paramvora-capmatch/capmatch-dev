/**
 * Dashboard-related constants
 */

// Project grid layout threshold - use grid when this many or more projects
export const GRID_LAYOUT_THRESHOLD = 5;

// Progress thresholds for UI indicators
export const PROGRESS_THRESHOLDS = {
  COMPLETE: 100,
  HIGH: 90,
  MEDIUM: 50,
} as const;

// Progress color mappings
export const PROGRESS_COLORS = {
  COMPLETE: {
    bg: "bg-green-500",
    bgLight: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
  },
  HIGH: {
    bg: "bg-green-500",
    bgLight: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
  },
  MEDIUM: {
    bg: "bg-blue-500",
    bgLight: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
  },
  LOW: {
    bg: "bg-red-500",
    bgLight: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
  },
} as const;

