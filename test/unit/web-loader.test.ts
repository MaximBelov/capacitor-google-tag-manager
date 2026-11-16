import { describe, expect, it, vi } from 'vitest';

describe('the web implementation', () => {
  it('is one instance for calls made together before it has loaded', async () => {
    const web = await import('../../src/web');
    const method = vi.spyOn(web.GoogleTagManagerWeb.prototype, 'isAvailable');
    const { GoogleTagManager } = await import('../../src');

    await Promise.all([GoogleTagManager.isAvailable(), GoogleTagManager.isAvailable(), GoogleTagManager.isAvailable()]);

    expect(method).toHaveBeenCalledTimes(3);
    expect(new Set(method.mock.contexts).size).toBe(1);
    method.mockRestore();
  });
});
