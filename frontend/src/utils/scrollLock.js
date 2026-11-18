/**
 * Global Scroll Lock Manager
 * Prevents body scrolling when one or more modals or drawers are open.
 * Preserves scrollbar width to prevent layout shifts.
 * Supports multiple nested or simultaneous overlays via a reference counter.
 */

let openOverlaysCount = 0;
let originalBodyOverflow = '';
let originalBodyPaddingRight = '';

export const lockScroll = () => {
  if (typeof document === 'undefined') return;

  if (openOverlaysCount === 0) {
    // Calculate scrollbar width before locking
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    originalBodyOverflow = document.body.style.overflow;
    originalBodyPaddingRight = document.body.style.paddingRight;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
  }

  openOverlaysCount += 1;
};

export const unlockScroll = () => {
  if (typeof document === 'undefined') return;

  openOverlaysCount = Math.max(0, openOverlaysCount - 1);

  if (openOverlaysCount === 0) {
    document.body.style.overflow = originalBodyOverflow || '';
    document.body.style.paddingRight = originalBodyPaddingRight || '';
  }
};
