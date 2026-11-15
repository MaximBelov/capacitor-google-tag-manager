import { WebPlugin } from '@capacitor/core';

import type { AvailabilityResult, GoogleTagManagerPlugin } from './definitions';

/**
 * A browser has no native Tag Manager SDK, so the answer is `false` rather than an error: the question has an answer here.
 * A web build that wants Tag Manager loads gtm.js itself.
 */
export class GoogleTagManagerWeb extends WebPlugin implements GoogleTagManagerPlugin {
  async isAvailable(): Promise<AvailabilityResult> {
    return { available: false };
  }
}
