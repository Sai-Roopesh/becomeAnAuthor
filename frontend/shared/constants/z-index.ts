/**
 * Semantic z-index scale matching globals.css.
 * Use these in inline styles or JS calculations.
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  toast: 1070,
  tooltip: 1080,
} as const;

export type ZIndexLevel = keyof typeof Z_INDEX;
