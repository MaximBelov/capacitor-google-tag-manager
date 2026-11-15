// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GoogleTagManager } from '../../src';
import { GoogleTagManagerWeb, SCRIPT_ID } from '../../src/web';

// No native bridge on globalThis, so Capacitor reports the platform as 'web' and loads src/web.ts. jsdom gives it a
// document; it does not fetch the scripts added to it.
const page = window as Window & { dataLayer?: unknown[] };
const NOW = new Date('2026-01-15T00:00:00Z').getTime();
const START = { 'gtm.start': NOW, event: 'gtm.js' };

const scripts = () => [...document.querySelectorAll<HTMLScriptElement>('script')];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  document.head.innerHTML = '';
  delete page.dataLayer;
  vi.useRealTimers();
});

describe('on the web', () => {
  it('answers through the registered plugin, false before start and true after', async () => {
    await expect(GoogleTagManager.isAvailable()).resolves.toEqual({ available: false });
    await GoogleTagManager.start({ containerId: 'GTM-TEST' });
    await expect(GoogleTagManager.isAvailable()).resolves.toEqual({ available: true });
    await GoogleTagManager.push({ event: 'through_the_plugin' });
    expect(page.dataLayer).toEqual([START, { event: 'through_the_plugin' }]);
  });

  it('answers false from a fresh implementation on a page without Tag Manager', async () => {
    await expect(new GoogleTagManagerWeb().isAvailable()).resolves.toEqual({ available: false });
  });
});

describe('start', () => {
  it('adds one async gtm.js tag for the container at the top of <head>', async () => {
    const existing = document.createElement('meta');
    document.head.appendChild(existing);

    await new GoogleTagManagerWeb().start({ containerId: 'GTM-TEST' });

    const [script] = scripts();
    expect(scripts()).toHaveLength(1);
    expect(document.head.firstChild).toBe(script);
    expect(script.id).toBe(SCRIPT_ID);
    expect(script.async).toBe(true);
    expect(script.src).toBe('https://www.googletagmanager.com/gtm.js?id=GTM-TEST');
    expect(script.hasAttribute('nonce')).toBe(false);
  });

  it('starts the data layer before the script tag is on the page', async () => {
    const seen: unknown[][] = [];
    const observer = new MutationObserver(() => seen.push([...(page.dataLayer ?? [])]));
    observer.observe(document.head, { childList: true });
    const insert = vi.spyOn(document.head, 'insertBefore');

    await new GoogleTagManagerWeb().start({ containerId: 'GTM-TEST' });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(page.dataLayer).toEqual([START]);
    await Promise.resolve();
    observer.disconnect();
    expect(seen).toEqual([[START]]);
  });

  it('keeps what the page already put on the data layer, and appends the start event after it', async () => {
    const dataLayer = [{ event: 'earlier' }];
    page.dataLayer = dataLayer;

    await new GoogleTagManagerWeb().start({ containerId: 'GTM-TEST' });

    expect(page.dataLayer).toBe(dataLayer);
    expect(page.dataLayer).toEqual([{ event: 'earlier' }, START]);
  });

  it('adds the environment parameters, encoded, as an environment snippet does', async () => {
    await new GoogleTagManagerWeb().start({ containerId: 'GTM-TEST', gtmAuth: 'a&b=c', gtmPreview: 'env-5' });

    const url = new URL(scripts()[0].src);
    expect(url.origin + url.pathname).toBe('https://www.googletagmanager.com/gtm.js');
    expect([...url.searchParams]).toEqual([
      ['id', 'GTM-TEST'],
      ['gtm_auth', 'a&b=c'],
      ['gtm_preview', 'env-5'],
      ['gtm_cookies_win', 'x'],
    ]);
  });

  it('leaves out environment parameters that are empty', async () => {
    await new GoogleTagManagerWeb().start({ containerId: 'GTM-TEST', gtmAuth: '', gtmPreview: '' });

    expect(scripts()[0].src).toBe('https://www.googletagmanager.com/gtm.js?id=GTM-TEST');
  });

  it('sets the CSP nonce on the script tag', async () => {
    await new GoogleTagManagerWeb().start({ containerId: 'GTM-TEST', nonce: 'r4nd0m' });

    expect(scripts()[0].getAttribute('nonce')).toBe('r4nd0m');
  });

  it('loads from another script URL, keeping the query it has, and resolves a relative one against the page', async () => {
    await new GoogleTagManagerWeb().start({
      containerId: 'GTM-TEST',
      scriptUrl: 'https://tags.example.com/gtm.js?x=1',
    });
    expect(scripts()[0].src).toBe('https://tags.example.com/gtm.js?x=1&id=GTM-TEST');

    document.head.innerHTML = '';
    await new GoogleTagManagerWeb().start({ containerId: 'GTM-TEST', scriptUrl: '/tags/gtm.js' });
    expect(scripts()[0].src).toBe(new URL('/tags/gtm.js?id=GTM-TEST', document.baseURI).toString());
  });

  it('adds the script tag once per page, from one instance or several', async () => {
    const plugin = new GoogleTagManagerWeb();
    await plugin.start({ containerId: 'GTM-TEST' });
    await plugin.start({ containerId: 'GTM-TEST' });
    await new GoogleTagManagerWeb().start({ containerId: ' GTM-TEST ' });

    expect(scripts()).toHaveLength(1);
    expect(page.dataLayer).toEqual([START]);
    await expect(new GoogleTagManagerWeb().isAvailable()).resolves.toEqual({ available: true });
  });

  it('rejects another container on a page that already loads one, and leaves the page alone', async () => {
    await new GoogleTagManagerWeb().start({ containerId: 'GTM-TEST' });

    await expect(new GoogleTagManagerWeb().start({ containerId: 'GTM-OTHER' })).rejects.toMatchObject({
      code: 'ALREADY_STARTED',
    });
    expect(scripts()).toHaveLength(1);
    expect(scripts()[0].src).toContain('id=GTM-TEST');
    expect(page.dataLayer).toEqual([START]);
  });

  it('rejects an empty or missing container id and changes nothing', async () => {
    const plugin = new GoogleTagManagerWeb();
    for (const options of [{ containerId: '' }, { containerId: '   ' }, {}, undefined]) {
      await expect(plugin.start(options as never)).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    }
    expect(scripts()).toHaveLength(0);
    expect(page.dataLayer).toBeUndefined();
    await expect(plugin.isAvailable()).resolves.toEqual({ available: false });
  });
});

describe('push', () => {
  it('pushes onto the data layer after start, in the order of the calls', async () => {
    const plugin = new GoogleTagManagerWeb();
    await plugin.start({ containerId: 'GTM-TEST' });

    await plugin.push({ event: 'first', value: 1 });
    await plugin.push({ page: '/settings' });
    await plugin.push({ event: 'third', items: [{ id: 'a' }] });

    expect(page.dataLayer).toEqual([
      START,
      { event: 'first', value: 1 },
      { page: '/settings' },
      { event: 'third', items: [{ id: 'a' }] },
    ]);
  });

  it('holds what comes before start off the page, and start pushes it in order right after the start event', async () => {
    const plugin = new GoogleTagManagerWeb();
    await plugin.push({ event: 'early' });
    await plugin.push({ event: 'earlier_than_start' });

    expect(page.dataLayer).toBeUndefined();
    expect(scripts()).toHaveLength(0);

    await plugin.start({ containerId: 'GTM-TEST' });
    await plugin.push({ event: 'late' });

    expect(page.dataLayer).toEqual([START, { event: 'early' }, { event: 'earlier_than_start' }, { event: 'late' }]);
  });

  it('writes straight to the page when another instance started Tag Manager', async () => {
    await new GoogleTagManagerWeb().start({ containerId: 'GTM-TEST' });
    await new GoogleTagManagerWeb().push({ event: 'from_another_instance' });

    expect(page.dataLayer).toEqual([START, { event: 'from_another_instance' }]);
  });

  it('pushes a copy, so a later change to the caller object is not seen', async () => {
    const plugin = new GoogleTagManagerWeb();
    await plugin.start({ containerId: 'GTM-TEST' });
    const entry = { event: 'copied', value: 1 };

    await plugin.push(entry);
    entry.value = 2;

    expect(page.dataLayer?.[1]).toEqual({ event: 'copied', value: 1 });
  });

  it('rejects what is not an object', async () => {
    const plugin = new GoogleTagManagerWeb();
    await plugin.start({ containerId: 'GTM-TEST' });
    for (const entry of [undefined, null, 'event', 1, [{ event: 'in_an_array' }]]) {
      await expect(plugin.push(entry as never)).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    }
    expect(page.dataLayer).toEqual([START]);
  });
});
