/**
 * Centralized color palettes for charts, markers, and tags.
 * Uses CSS variables from globals.css for theme compatibility.
 */

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

// Fallback hex colors for contexts where CSS vars don't work (e.g., canvas, SVG fill)
export const CHART_COLORS_HEX = {
  light: ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"],
  dark: ["#818cf8", "#4ade80", "#fbbf24", "#f87171", "#a78bfa"],
} as const;

export const MARKER_COLORS = [
  { value: "var(--destructive)", label: "Red", hex: "#ef4444" },
  { value: "var(--chart-4)", label: "Amber", hex: "#f59e0b" },
  { value: "var(--chart-2)", label: "Green", hex: "#22c55e" },
  { value: "var(--chart-1)", label: "Blue", hex: "#3b82f6" },
  { value: "var(--chart-5)", label: "Purple", hex: "#8b5cf6" },
  { value: "#ec4899", label: "Pink", hex: "#ec4899" },
  { value: "var(--muted-foreground)", label: "Gray", hex: "#6b7280" },
] as const;

// Default marker color (blue)
export const DEFAULT_MARKER_COLOR = MARKER_COLORS[3]!.hex;

export const TAG_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
] as const;

export function getRandomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)] ?? "#3b82f6";
}
