# capacitor-google-tag-manager

Brings the [Google Tag Manager](https://developers.google.com/tag-platform/tag-manager) SDK into a Capacitor 8 app, on
Android and iOS, so that a Tag Manager container the app ships is loaded and acts on the app's Firebase Analytics events.
On the web it loads gtm.js for a web container and feeds its data layer, so the same plugin covers all three platforms.

Tag Manager for Firebase has no API to call: once the SDK is linked into the app it finds the container and the Analytics
events by itself. What it needs from a Capacitor app is to be in the native build, and that is all this plugin does. The
one method it adds, `isAvailable`, tells from the web view whether the SDK made it into the build, because a build without
it runs, ships its container and says nothing.

## Install

```bash
npm install capacitor-google-tag-manager
npx cap sync
```

Requires Capacitor 8, Android 8.0 (API 26) or newer and iOS 15 or newer. The SDK depends on Firebase Analytics, so the app
needs Firebase set up as usual (for example with `@capacitor-firebase/analytics`); this plugin does not configure it.

| Platform | What the plugin adds                                                                                                                                                               |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Android  | `com.google.android.gms:play-services-tagmanager`, 18.3.0 by default. The SDK's own manifest declares `TagManagerPreviewActivity` with the `tagmanager.c.<application id>` scheme. |
| iOS      | Google's `google-tag-manager-ios-sdk` Swift package, any 9.x from 9.1.0, or the `GoogleTagManager` pod `~> 9.1` with CocoaPods; Firebase Analytics comes with either.              |
| Web      | gtm.js for a web container, loaded by `start` with one script tag per page, and `window.dataLayer`, fed by `push`. `isAvailable` answers `true` once `start` has run.              |

### What stays in the app

The plugin brings the SDK and nothing that belongs to one app:

- **The container.** Export it from Tag Manager and put it where the SDK looks:
  - Android: `android/app/src/main/assets/containers/GTM-XXXXXXX.json`.
  - iOS: a folder reference named `container` in the app target's resources, holding `GTM-XXXXXXX.json`.
- **The iOS preview scheme.** Tag Manager's preview opens the app through `tagmanager.c.<bundle id>`, which iOS learns
  only from the app's `Info.plist`:

  ```xml
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key>
      <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>tagmanager.c.$(PRODUCT_BUNDLE_IDENTIFIER)</string>
      </array>
    </dict>
  </array>
  ```

  On Android nothing is needed: the manifest merge puts the application id into the SDK's own preview activity.

### Choosing the SDK version

- **Android:** set `playServicesTagManagerVersion` in the app's `android/variables.gradle`:

  ```groovy
  ext {
      playServicesTagManagerVersion = '18.3.0'
  }
  ```

- **iOS, Swift Package Manager:** the plugin accepts any 9.x from 9.1.0, and the version the app builds with is the one in
  its `Package.resolved` (`ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`). Commit that
  file, and move the version with Xcode's File > Packages > Update to Latest Package Versions, or by editing the pin and
  resolving again (`xcodebuild -resolvePackageDependencies`). `npx cap sync` regenerates the app's `CapApp-SPM` package but
  leaves `Package.resolved` alone, so the pin survives a sync.
- **iOS, CocoaPods:** pin it in the `Podfile`: `pod 'GoogleTagManager', '9.1.0'`.

The app should not declare the SDK itself as well: the plugin's declaration is the only one needed.

### Why declaring the iOS SDK is not enough

Google ships the iOS SDK as a static archive, and an app never calls it: `TAGManager` starts itself from `+load`. A linker
takes a member of a static archive only when something references a symbol it defines, and Swift Package Manager links
without `-ObjC`, so an app that merely depends on the package gets the SDK's (empty) framework folder in its bundle and
none of its code. The plugin's `GoogleTagManagerLinkage` target references every class the SDK exports, which makes the
linker take them, and links with `-ObjC`, which takes the SDK's categories as well: they add class methods from object
files no class reference pulls in, and without them the first container load aborts the app with
`+[... runtimeScript]: unrecognized selector`. `isAvailable` then looks each class up in the running app. CocoaPods links
with `-ObjC` for most apps, and the podspec asks for it too.

### What each method does on each platform

| Method        | Android and iOS                                                     | Web                                                                    |
| ------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `isAvailable` | Whether the SDK is linked into the app.                             | Whether `start` has put gtm.js on the page.                            |
| `start`       | Rejects with `UNIMPLEMENTED`: the SDK starts itself.                | Initialises `window.dataLayer` and adds the gtm.js script tag, once.   |
| `push`        | Rejects with `UNIMPLEMENTED`: log a Firebase Analytics event there. | Pushes onto `window.dataLayer`; before `start`, held and pushed by it. |

## Use

```typescript
import { GoogleTagManager } from 'capacitor-google-tag-manager';

const { available } = await GoogleTagManager.isAvailable();
```

### On the web

```typescript
import { Capacitor } from '@capacitor/core';
import { GoogleTagManager } from 'capacitor-google-tag-manager';

if (Capacitor.getPlatform() === 'web') {
  await GoogleTagManager.start({
    containerId: 'GTM-XXXXXXX',
    // Only for a Tag Manager environment, from its snippet:
    // gtmAuth: '...', gtmPreview: 'env-N',
    // Only under a Content Security Policy that asks for one:
    // nonce: '...',
  });
  await GoogleTagManager.push({ event: 'sign_up', method: 'email' });
}
```

This replaces the gtm.js snippet in `index.html` and direct calls to `window.dataLayer.push`:

- `start` creates `window.dataLayer` if the page has none (and keeps what an existing one holds), pushes the `gtm.js` start
  event, and only then adds `<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX">` to the top of
  `<head>`. It resolves once the tag is there, without waiting for the script, which a browser or an extension may block.
- One script tag per page: calling `start` again for the same container changes nothing; for another container it rejects
  with `ALREADY_STARTED`. An empty `containerId` rejects with `INVALID_ARGUMENT`.
- `push` before `start` is held by the plugin, not written to the page, and `start` pushes what was held in order, right
  after the start event. A page that never calls `start` gets no data layer and no script.
- `scriptUrl` loads gtm.js from another place, such as a first-party or server-side tagging domain; the container and
  environment parameters are added to its query. `nonce` becomes the script tag's `nonce` attribute; the policy must also
  allow the domain gtm.js and the container's tags load from.
- Without a document (server-side rendering) `isAvailable` answers `false` and `start` rejects with `UNAVAILABLE`.

A web container is not the container the app ships for Android and iOS: those are mobile containers, driven by Firebase
Analytics events. On Android and iOS `start` and `push` reject with `UNIMPLEMENTED`, so call them on the web only.

## Development

- `npm test` runs the TypeScript unit tests, the web ones in a jsdom document, and `npm run test:parity` checks that both
  platforms implement exactly the native methods of the API and the web all of them.
- `npm run test:android` runs the JVM tests, which also find the SDK on the plugin's class path.
- `npm run test:ios` runs the XCTest target on an iOS simulator, which also finds the SDK in the test binary.
- `npm run example:android:build` and `npm run example:ios:build` build `example-app/`, a page that calls `isAvailable`, the
  way an app installs the plugin.

## API

<docgen-index>

* [`isAvailable()`](#isavailable)
* [`start(...)`](#start)
* [`push(...)`](#push)
* [Interfaces](#interfaces)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

The plugin's job is to bring the Google Tag Manager SDK into the app's native build. The SDK then loads the container the
app ships and acts on Firebase Analytics events by itself; it has no JavaScript API, and on Android and iOS neither does
this plugin beyond `isAvailable`.

On the web the plugin loads gtm.js for a web container instead (`start`) and feeds its data layer (`push`). These two
methods are web only: on Android and iOS they reject with `UNIMPLEMENTED`, because events reach a native container
through Firebase Analytics, not through this plugin.

### isAvailable()

```typescript
isAvailable() => Promise<AvailabilityResult>
```

Whether the Tag Manager SDK made it into the running app.

A build that lost the SDK still runs, ships its container and logs nothing: the container is simply never loaded. This
is the check that tells such a build apart from a healthy one, from the web view.

On the web, whether `start` has put gtm.js on the page. It does not wait for the script to load: a script blocked by
the browser or an extension still counts.

**Returns:** <code>Promise&lt;<a href="#availabilityresult">AvailabilityResult</a>&gt;</code>

**Since:** 0.1.0

--------------------


### start(...)

```typescript
start(options: StartOptions) => Promise<void>
```

Web only. Loads Tag Manager for a web container: creates `window.dataLayer` if the page has none (keeping what an
existing one holds), pushes the `gtm.js` start event, then whatever `push` held back, and only then adds the gtm.js
script tag to the top of the document's head. It resolves once the tag is on the page, without waiting for the
script to load.

There is one script tag per page: calling it again with the same container resolves and changes nothing, also from
another instance of the plugin. It rejects with the code `INVALID_ARGUMENT` when `containerId` is empty, and with
`ALREADY_STARTED` when the page already loads another container.

On Android and iOS it rejects with `UNIMPLEMENTED`.

| Param         | Type                                                  |
| ------------- | ----------------------------------------------------- |
| **`options`** | <code><a href="#startoptions">StartOptions</a></code> |

**Since:** 0.3.0

--------------------


### push(...)

```typescript
push(entry: DataLayerEntry) => Promise<void>
```

Web only. Pushes one entry onto `window.dataLayer`, as `window.dataLayer.push(entry)` does, in the order of the calls.

Before `start`, entries are held by the plugin, not written to the page, and `start` pushes them in order right after
the `gtm.js` start event; a page that never starts Tag Manager never gets a data layer. It rejects with the code
`INVALID_ARGUMENT` when the entry is not an object.

On Android and iOS it rejects with `UNIMPLEMENTED`: log a Firebase Analytics event there instead, which is what a
native container acts on.

| Param       | Type                                                      |
| ----------- | --------------------------------------------------------- |
| **`entry`** | <code><a href="#datalayerentry">DataLayerEntry</a></code> |

**Since:** 0.3.0

--------------------


### Interfaces


#### AvailabilityResult

What `isAvailable` answers.

| Prop            | Type                 | Description                                                                                                                                                                                                                                     |
| --------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`available`** | <code>boolean</code> | `true` when the Google Tag Manager SDK's classes are in the running app: `TAGManager` on iOS, `com.google.android.gms.tagmanager.TagManagerService` on Android. On the web, `true` once `start` has put gtm.js on the page, and `false` before. |


#### StartOptions

How `start` loads Tag Manager on the web.

| Prop              | Type                | Description                                                                                                                                                                                                          | Default                                                | Since |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----- |
| **`containerId`** | <code>string</code> | The web container to load, `GTM-XXXXXXX`. It becomes the `id` parameter of the script URL.                                                                                                                           |                                                        | 0.3.0 |
| **`gtmAuth`**     | <code>string</code> | The `gtm_auth` parameter of a Tag Manager environment, from the environment's snippet. Leave it out for the live container.                                                                                          |                                                        | 0.3.0 |
| **`gtmPreview`**  | <code>string</code> | The `gtm_preview` parameter of a Tag Manager environment (`env-N`), from the environment's snippet. Given together with `gtmAuth`; the URL then also carries `gtm_cookies_win=x`, as the environment's snippet does. |                                                        | 0.3.0 |
| **`nonce`**       | <code>string</code> | A Content Security Policy nonce, set as the `nonce` attribute of the script tag. Custom HTML tags of the container need it too; Tag Manager's CSP guide has them read it from this tag.                              |                                                        | 0.3.0 |
| **`scriptUrl`**   | <code>string</code> | Where gtm.js is loaded from, for a first-party or server-side tagging domain. The container and environment parameters are added to its query, and parameters it already has are kept.                               | <code>'https://www.googletagmanager.com/gtm.js'</code> | 0.3.0 |


#### DataLayerEntry

One entry of the data layer, as `window.dataLayer.push` takes it: usually an `event` name and the variables that go with
it.

| Prop        | Type                | Description                                                                                             |
| ----------- | ------------------- | ------------------------------------------------------------------------------------------------------- |
| **`event`** | <code>string</code> | The name a custom event trigger of the container listens for. An entry without one only sets variables. |

</docgen-api>
