/**
 * What `isAvailable` answers.
 */
export interface AvailabilityResult {
  /**
   * `true` when the Google Tag Manager SDK's classes are in the running app: `TAGManager` on iOS,
   * `com.google.android.gms.tagmanager.TagManagerService` on Android. On the web, `true` once `start` has put gtm.js on
   * the page, and `false` before.
   */
  available: boolean;
}

/**
 * How `start` loads Tag Manager on the web.
 */
export interface StartOptions {
  /**
   * The web container to load, `GTM-XXXXXXX`. It becomes the `id` parameter of the script URL.
   *
   * @since 0.3.0
   */
  containerId: string;

  /**
   * The `gtm_auth` parameter of a Tag Manager environment, from the environment's snippet. Leave it out for the live
   * container.
   *
   * @since 0.3.0
   */
  gtmAuth?: string;

  /**
   * The `gtm_preview` parameter of a Tag Manager environment (`env-N`), from the environment's snippet. Given together
   * with `gtmAuth`; the URL then also carries `gtm_cookies_win=x`, as the environment's snippet does.
   *
   * @since 0.3.0
   */
  gtmPreview?: string;

  /**
   * A Content Security Policy nonce, set as the `nonce` attribute of the script tag. Custom HTML tags of the container
   * need it too; Tag Manager's CSP guide has them read it from this tag.
   *
   * @since 0.3.0
   */
  nonce?: string;

  /**
   * Where gtm.js is loaded from, for a first-party or server-side tagging domain. The container and environment
   * parameters are added to its query, and parameters it already has are kept.
   *
   * @default 'https://www.googletagmanager.com/gtm.js'
   * @since 0.3.0
   */
  scriptUrl?: string;
}

/**
 * One entry of the data layer, as `window.dataLayer.push` takes it: usually an `event` name and the variables that go with
 * it.
 */
export interface DataLayerEntry {
  /**
   * The name a custom event trigger of the container listens for. An entry without one only sets variables.
   */
  event?: string;
  [key: string]: unknown;
}

/**
 * The plugin's job is to bring the Google Tag Manager SDK into the app's native build. The SDK then loads the container the
 * app ships and acts on Firebase Analytics events by itself; it has no JavaScript API, and on Android and iOS neither does
 * this plugin beyond `isAvailable`.
 *
 * On the web the plugin loads gtm.js for a web container instead (`start`) and feeds its data layer (`push`). These two
 * methods are web only: on Android and iOS they reject with `UNIMPLEMENTED`, because events reach a native container
 * through Firebase Analytics, not through this plugin.
 */
export interface GoogleTagManagerPlugin {
  /**
   * Whether the Tag Manager SDK made it into the running app.
   *
   * A build that lost the SDK still runs, ships its container and logs nothing: the container is simply never loaded. This
   * is the check that tells such a build apart from a healthy one, from the web view.
   *
   * On the web, whether `start` has put gtm.js on the page. It does not wait for the script to load: a script blocked by
   * the browser or an extension still counts.
   *
   * @since 0.1.0
   */
  isAvailable(): Promise<AvailabilityResult>;

  /**
   * Web only. Loads Tag Manager for a web container: creates `window.dataLayer` if the page has none (keeping what an
   * existing one holds), pushes the `gtm.js` start event, then whatever `push` held back, and only then adds the gtm.js
   * script tag to the top of the document's head. It resolves once the tag is on the page, without waiting for the
   * script to load.
   *
   * There is one script tag per page: calling it again with the same container resolves and changes nothing, also from
   * another instance of the plugin. It rejects with the code `INVALID_ARGUMENT` when `containerId` is empty, and with
   * `ALREADY_STARTED` when the page already loads another container.
   *
   * On Android and iOS it rejects with `UNIMPLEMENTED`.
   *
   * @since 0.3.0
   */
  start(options: StartOptions): Promise<void>;

  /**
   * Web only. Pushes one entry onto `window.dataLayer`, as `window.dataLayer.push(entry)` does, in the order of the calls.
   *
   * Before `start`, entries are held by the plugin, not written to the page, and `start` pushes them in order right after
   * the `gtm.js` start event; a page that never starts Tag Manager never gets a data layer. It rejects with the code
   * `INVALID_ARGUMENT` when the entry is not an object.
   *
   * On Android and iOS it rejects with `UNIMPLEMENTED`: log a Firebase Analytics event there instead, which is what a
   * native container acts on.
   *
   * @since 0.3.0
   */
  push(entry: DataLayerEntry): Promise<void>;
}
