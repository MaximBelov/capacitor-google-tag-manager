import { describe, expect, it } from 'vitest';

import { GoogleTagManagerWeb } from '../../src/web';

// The web implementation where there is no document to add gtm.js to, as in server-side rendering (this file runs in
// vitest's node environment).
describe('on the web without a document', () => {
  it('answers false and rejects start with UNAVAILABLE instead of throwing on a missing global', async () => {
    const plugin = new GoogleTagManagerWeb();
    await expect(plugin.isAvailable()).resolves.toEqual({ available: false });
    await expect(plugin.start({ containerId: 'GTM-TEST' })).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    await expect(plugin.push({ event: 'held' })).resolves.toBeUndefined();
  });
});
