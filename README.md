# capacitor-google-tag-manager

Brings the [Google Tag Manager](https://developers.google.com/tag-platform/tag-manager) SDK into a Capacitor 8 app, on
Android and iOS, so that a Tag Manager container the app ships is loaded and acts on the app's Firebase Analytics events.

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

| Platform | What the plugin adds                                                                                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Android  | `com.google.android.gms:play-services-tagmanager`, 18.3.0 by default. The SDK's own manifest declares `TagManagerPreviewActivity` with the `tagmanager.c.<application id>` scheme. |
| iOS      | Google's `google-tag-manager-ios-sdk` Swift package, any 9.x from 9.1.0, or the `GoogleTagManager` pod `~> 9.1` with CocoaPods; Firebase Analytics comes with either.              |
| Web      | Nothing. A web build that wants Tag Manager loads gtm.js itself; `isAvailable` answers `false`.                                                                                     |

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

## Use

```typescript
import { GoogleTagManager } from 'capacitor-google-tag-manager';

const { available } = await GoogleTagManager.isAvailable();
```

## Development

- `npm test` runs the TypeScript unit tests, `npm run test:parity` checks that both platforms implement exactly the API.
- `npm run test:android` runs the JVM tests, which also find the SDK on the plugin's class path.
- `npm run test:ios` runs the XCTest target on an iOS simulator, which also finds the SDK in the test binary.
- `npm run example:android:build` and `npm run example:ios:build` build `example-app/`, a page that calls `isAvailable`, the
  way an app installs the plugin.

## API

<docgen-index>

* [`isAvailable()`](#isavailable)
* [Interfaces](#interfaces)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

The plugin's job is to bring the Google Tag Manager SDK into the app's native build. The SDK then loads the container the
app ships and acts on Firebase Analytics events by itself; it has no JavaScript API, and neither does this plugin beyond
the one check below.

### isAvailable()

```typescript
isAvailable() => Promise<AvailabilityResult>
```

Whether the Tag Manager SDK made it into the running app.

A build that lost the SDK still runs, ships its container and logs nothing: the container is simply never loaded. This
is the check that tells such a build apart from a healthy one, from the web view.

**Returns:** <code>Promise&lt;<a href="#availabilityresult">AvailabilityResult</a>&gt;</code>

**Since:** 0.1.0

--------------------


### Interfaces


#### AvailabilityResult

What `isAvailable` answers.

| Prop            | Type                 | Description                                                                                                                                                                                                         |
| --------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`available`** | <code>boolean</code> | `true` when the Google Tag Manager SDK's classes are in the running app: `TAGManager` on iOS, `com.google.android.gms.tagmanager.TagManagerService` on Android. Always `false` on the web, which has no native SDK. |

</docgen-api>
