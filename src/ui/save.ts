/**
 * Handing the viewer a file, wherever the page happens to be running.
 *
 * A page served inside the claude.ai artifact viewer is never allowed to start
 * a download itself; it asks the host, which confirms with the viewer. Anywhere
 * else — a dev server, a file on disk, any other host — the ordinary anchor
 * download is the only thing available. The capability is resolved lazily, and
 * absence is the normal case rather than an error.
 */
export type SaveOutcome = 'saved' | 'declined' | 'unavailable';

interface HostSave {
  save(request: { filename: string; data: string }): Promise<{ status: string }>;
}

interface HostClaude {
  use(name: string): Promise<unknown>;
}

async function hostDownloads(): Promise<HostSave | null> {
  const host = (globalThis as { claude?: HostClaude }).claude;
  if (!host || typeof host.use !== 'function') return null;
  try {
    const namespace = (await host.use('downloads')) as HostSave | null;
    return namespace && typeof namespace.save === 'function' ? namespace : null;
  } catch {
    return null;
  }
}

export async function saveFile(filename: string, text: string): Promise<SaveOutcome> {
  const host = await hostDownloads();

  if (host) {
    try {
      await host.save({ filename, data: text });
      return 'saved';
    } catch (problem) {
      const code = (problem as { code?: string }).code;
      /* The viewer said no, or was asked too often: not a failure to report as
         one, and never worth retrying on their behalf. */
      return code === 'declined' || code === 'rate_limited' ? 'declined' : 'unavailable';
    }
  }

  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return 'unavailable';

  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return 'saved';
}

/** True when the page can offer a file at all, for hiding the affordance. */
export async function canSaveFiles(): Promise<boolean> {
  if (await hostDownloads()) return true;
  return typeof document !== 'undefined' && typeof URL.createObjectURL === 'function';
}
