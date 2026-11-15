import { describe, expect, it } from 'vitest';

import { GoogleTagManager } from '../../src';
import { GoogleTagManagerWeb } from '../../src/web';

// No native bridge on globalThis, so Capacitor reports the platform as 'web' and loads src/web.ts.
describe('on the web', () => {
  it('answers that there is no native SDK through the registered plugin', async () => {
    await expect(GoogleTagManager.isAvailable()).resolves.toEqual({ available: false });
  });

  it('answers the same from the web implementation itself', async () => {
    await expect(new GoogleTagManagerWeb().isAvailable()).resolves.toEqual({ available: false });
  });
});
