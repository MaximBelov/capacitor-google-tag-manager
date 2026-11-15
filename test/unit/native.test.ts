import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { GoogleTagManagerPlugin } from '../../src';

// What the native side of Capacitor injects into the web view: a bridge object that makes the platform 'android', the
// headers of the installed plugins, and nativePromise, which every promise method of a plugin goes through.
const nativePromise = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => undefined);
const g = globalThis as Record<string, unknown>;

let GoogleTagManager: GoogleTagManagerPlugin;

beforeAll(async () => {
  g.androidBridge = {};
  g.Capacitor = {
    PluginHeaders: [{ name: 'GoogleTagManager', methods: [{ name: 'isAvailable', rtype: 'promise' }] }],
    nativePromise,
  };
  ({ GoogleTagManager } = await import('../../src'));
});

afterAll(() => {
  delete g.androidBridge;
  delete g.Capacitor;
});

describe('on a native platform', () => {
  it('asks the native plugin named GoogleTagManager and hands its answer back unchanged', async () => {
    nativePromise.mockResolvedValueOnce({ available: true });
    await expect(GoogleTagManager.isAvailable()).resolves.toEqual({ available: true });
    expect(nativePromise.mock.lastCall?.slice(0, 2)).toEqual(['GoogleTagManager', 'isAvailable']);

    nativePromise.mockResolvedValueOnce({ available: false });
    await expect(GoogleTagManager.isAvailable()).resolves.toEqual({ available: false });
  });

  // ExceptionCode.Unimplemented, spelt out: importing @capacitor/core here would set Capacitor up before the bridge is faked.
  it('rejects the web-only methods with UNIMPLEMENTED, without asking the native plugin or falling back to the web', async () => {
    nativePromise.mockClear();
    await expect(GoogleTagManager.start({ containerId: 'GTM-TEST' })).rejects.toMatchObject({
      code: 'UNIMPLEMENTED',
    });
    await expect(GoogleTagManager.push({ event: 'native' })).rejects.toMatchObject({ code: 'UNIMPLEMENTED' });
    expect(nativePromise).not.toHaveBeenCalled();
  });
});
