import { WebPlugin } from '@capacitor/core';

import type { AvailabilityResult, DataLayerEntry, GoogleTagManagerPlugin, StartOptions } from './definitions';

/** The id of the one gtm.js script tag the plugin adds to a page, which is also how a page that already has it is told apart. */
export const SCRIPT_ID = 'capacitor-google-tag-manager';

const DEFAULT_SCRIPT_URL = 'https://www.googletagmanager.com/gtm.js';

interface DataLayerWindow {
  dataLayer?: unknown[];
}

/** A rejection with a `code`, the shape a native plugin's rejection has in JavaScript. */
function failure(code: 'INVALID_ARGUMENT' | 'ALREADY_STARTED', message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function isEntry(value: unknown): value is DataLayerEntry {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Tag Manager on the web is gtm.js and `window.dataLayer`. `start` initialises the data layer and adds the script tag once
 * per page; `push` writes to the data layer, and holds what it is given until `start` has run.
 */
export class GoogleTagManagerWeb extends WebPlugin implements GoogleTagManagerPlugin {
  private readonly held: DataLayerEntry[] = [];

  async isAvailable(): Promise<AvailabilityResult> {
    return { available: this.script() !== null };
  }

  async start(options: StartOptions): Promise<void> {
    const containerId = typeof options?.containerId === 'string' ? options.containerId.trim() : '';
    if (!containerId) {
      throw failure('INVALID_ARGUMENT', 'start() needs a containerId, such as GTM-XXXXXXX');
    }
    if (typeof document === 'undefined') {
      throw this.unavailable('Tag Manager needs a document to add gtm.js to');
    }

    const existing = this.script();
    if (existing) {
      const started = existing.dataset.containerId;
      if (started !== containerId) {
        throw failure('ALREADY_STARTED', `Tag Manager already loads ${started} on this page, not ${containerId}`);
      }
      this.flush();
      return;
    }

    // The data layer, with the start event and what was held, is there before the script that reads it.
    this.dataLayer().push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    this.flush();

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = scriptUrl(containerId, options);
    script.dataset.containerId = containerId;
    if (options.nonce) {
      script.setAttribute('nonce', options.nonce);
    }
    document.head.insertBefore(script, document.head.firstChild);
  }

  async push(entry: DataLayerEntry): Promise<void> {
    if (!isEntry(entry)) {
      throw failure('INVALID_ARGUMENT', 'push() takes an object, such as { event: "sign_up" }');
    }
    // A copy, so that a later change to the caller's object does not change what Tag Manager was given.
    this.held.push({ ...entry });
    if (this.script()) {
      this.flush();
    }
  }

  private script(): HTMLScriptElement | null {
    if (typeof document === 'undefined') {
      return null;
    }
    return document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  }

  private dataLayer(): unknown[] {
    const page = window as DataLayerWindow;
    page.dataLayer = page.dataLayer || [];
    return page.dataLayer;
  }

  private flush(): void {
    const dataLayer = this.dataLayer();
    for (const entry of this.held.splice(0)) {
      dataLayer.push(entry);
    }
  }
}

function scriptUrl(containerId: string, options: StartOptions): string {
  const url = new URL(options.scriptUrl || DEFAULT_SCRIPT_URL, document.baseURI);
  url.searchParams.set('id', containerId);
  if (options.gtmAuth) {
    url.searchParams.set('gtm_auth', options.gtmAuth);
  }
  if (options.gtmPreview) {
    url.searchParams.set('gtm_preview', options.gtmPreview);
    url.searchParams.set('gtm_cookies_win', 'x');
  }
  return url.toString();
}
