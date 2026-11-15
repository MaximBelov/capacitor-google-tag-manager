import Foundation
import Capacitor
#if canImport(GoogleTagManagerLinkage)
import GoogleTagManagerLinkage
#endif

/// Whether the Tag Manager SDK's classes are in the running app.
enum TagManagerSdk {
    /// The classes the plugin links in. Calling this is also what keeps the linkage in the binary.
    static var linkedClassNames: [String] {
        GoogleTagManagerLinkedClassNames()
    }

    /// Asks the Objective-C runtime, by name, for every class the plugin links in, so the answer reflects the binary
    /// that is running rather than what the plugin was compiled against.
    static func isLinked(classNames: [String] = linkedClassNames) -> Bool {
        !classNames.isEmpty && classNames.allSatisfy { NSClassFromString($0) != nil }
    }
}

/// Google Tag Manager on iOS. The plugin exists to link the SDK into the app: the SDK finds the container in the app's
/// `container` folder and the Firebase Analytics events on its own, and handles the `tagmanager.c.<bundle id>` preview
/// links the app's Info.plist registers. What is left for the web view is the one question of whether the SDK is there.
@objc(GoogleTagManagerPlugin)
public class GoogleTagManagerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GoogleTagManagerPlugin"
    public let jsName = "GoogleTagManager"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise)
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": TagManagerSdk.isLinked()])
    }
}
