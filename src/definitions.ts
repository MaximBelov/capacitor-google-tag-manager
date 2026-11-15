/**
 * What `isAvailable` answers.
 */
export interface AvailabilityResult {
  /**
   * `true` when the Google Tag Manager SDK's classes are in the running app: `TAGManager` on iOS,
   * `com.google.android.gms.tagmanager.TagManagerService` on Android. Always `false` on the web, which has no native SDK.
   */
  available: boolean;
}

/**
 * The plugin's job is to bring the Google Tag Manager SDK into the app's native build. The SDK then loads the container the
 * app ships and acts on Firebase Analytics events by itself; it has no JavaScript API, and neither does this plugin beyond
 * the one check below.
 */
export interface GoogleTagManagerPlugin {
  /**
   * Whether the Tag Manager SDK made it into the running app.
   *
   * A build that lost the SDK still runs, ships its container and logs nothing: the container is simply never loaded. This
   * is the check that tells such a build apart from a healthy one, from the web view.
   *
   * @since 0.1.0
   */
  isAvailable(): Promise<AvailabilityResult>;
}
