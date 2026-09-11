/**
 * Handing the viewer a file.
 *
 * An ordinary anchor download, which is all a page needs when it is served as a
 * page. Kept as its own module because the two callers — the export button and
 * the check that hides it — both want the same answer about whether the browser
 * will allow it at all.
 */
export type SaveOutcome = 'saved' | 'unavailable';

export function saveFile(filename: string, text: string): SaveOutcome {
  if (!canSaveFiles()) return 'unavailable';

  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return 'saved';
}

/** False in a context that cannot start a download, so the button can go. */
export function canSaveFiles(): boolean {
  return typeof document !== 'undefined' && typeof URL.createObjectURL === 'function';
}
