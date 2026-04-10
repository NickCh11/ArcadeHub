/**
 * Shared z-index counter for all draggable overlay windows.
 * Call bringToFront() on pointerdown and apply the returned value as the
 * window's z-index so the last-clicked window always sits on top.
 */

let counter = 9900;

/** The z-index every new window starts at. */
export const BASE_WINDOW_Z = 9900;

/** Increment the shared counter and return the new top-most z-index. */
export function bringToFront(): number {
  return ++counter;
}
