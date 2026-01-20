/**
 * Semantic z-index scale for the application.
 * 
 * IMPORTANT: Tailwind uses z-0/z-10/z-20/etc. which maps to actual values 0/10/20.
 * These constants are for inline styles or when you need values above z-50.
 * 
 * Layering (lowest to highest):
 * 1. z-0 (content)
 * 2. z-10 (sticky elements within content)
 * 3. z-20 (floating toolbars)
 * 4. z-30 (panel controls)
 * 5. z-50 (dialogs, modals, sheets - Radix default)
 * 6. z-[9999] (dropdowns inside tippy/popovers - must be higher than tippy's 9999)
 */
export const Z_INDEX = {
  /** Base layer for content */
  base: 0,
  /** Sticky elements within scrollable content (tables, lists) */
  stickyContent: 10,
  /** Floating toolbars, headers */
  toolbar: 20,
  /** Panel controls, toggles */
  panelControls: 30,
  /** Modal backdrop */
  modalBackdrop: 50,
  /** Modals, dialogs, sheets */
  modal: 50,
  /** Standard popovers (Radix default) */
  popover: 50,
  /** Dropdown menus */
  dropdown: 50,
  /** Tippy.js popover (defaults to 9999 internally) */
  tippy: 9999,
  /** Nested dropdowns inside Tippy (must be >= tippy) */
  nestedDropdown: 9999,
  /** Toast notifications */
  toast: 10000,
  /** Tooltips (highest) */
  tooltip: 10001,
} as const;

export type ZIndexLevel = keyof typeof Z_INDEX;

/**
 * Tailwind class reference:
 * - z-0 = 0
 * - z-10 = 10
 * - z-20 = 20
 * - z-30 = 30
 * - z-40 = 40
 * - z-50 = 50
 * - z-[9999] = 9999 (for nested dropdowns in tippy)
 */

