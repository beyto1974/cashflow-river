import type { Theme } from '../persistence/preferences';

/** The part of an element painting a theme needs — a root, in practice. */
export interface ThemeRoot {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

/**
 * Paints the page in a theme by stamping the root element. The stylesheet holds
 * the light palette on bare `:root`, the dark one behind the system setting, and
 * both `data-theme` values override it — so 'auto' is the absence of the mark,
 * not a third palette.
 */
export function applyTheme(theme: Theme, root: ThemeRoot = document.documentElement): void {
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}
