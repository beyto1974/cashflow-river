import { describe, expect, it } from 'vitest';
import { applyTheme, type ThemeRoot } from '../src/ui/theme';

/** Stands in for the root element: the suite runs without a DOM. */
function root(): ThemeRoot & { theme: string | undefined } {
  return {
    theme: undefined,
    setAttribute(name, value) {
      if (name === 'data-theme') this.theme = value;
    },
    removeAttribute(name) {
      if (name === 'data-theme') this.theme = undefined;
    }
  };
}

describe('applyTheme', () => {
  it('marks the root with a chosen theme', () => {
    const html = root();
    applyTheme('dark', html);
    expect(html.theme).toBe('dark');
    applyTheme('light', html);
    expect(html.theme).toBe('light');
  });

  it('leaves no mark on auto, so the reader’s system decides', () => {
    const html = root();
    applyTheme('dark', html);
    applyTheme('auto', html);
    expect(html.theme).toBeUndefined();
  });
});
