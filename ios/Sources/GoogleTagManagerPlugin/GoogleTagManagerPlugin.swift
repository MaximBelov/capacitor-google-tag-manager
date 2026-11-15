import Foundation
import Capacitor

/// Whether the Tag Manager SDK's classes are in the running app.
enum TagManagerSdk {
    /// The SDK's entry point. Its header is not public, so it is looked up by name; the name is what the SDK's own
    /// binary exports (`_OBJC_CLASS_$_TAGManager`).
    static let managerClassName = "TAGManager"

    static func isLinked(className: String = managerClassName) -> Bool {
        NSClassFromString(className) != nil
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
