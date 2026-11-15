import XCTest
import Capacitor
@testable import GoogleTagManagerPlugin

/// The JavaScript reaches the plugin by `jsName` and each method by its name: a rename on either side fails only at run
/// time on a phone, so both are pinned here.
final class GoogleTagManagerPluginTests: XCTestCase {
    func testIsRegisteredUnderTheNameTheJavaScriptUses() {
        let plugin = GoogleTagManagerPlugin()
        XCTAssertEqual(plugin.jsName, "GoogleTagManager")
        XCTAssertEqual(plugin.identifier, "GoogleTagManagerPlugin")
    }

    func testRegistersExactlyTheMethodsOfTheApi() {
        let names = GoogleTagManagerPlugin().pluginMethods.map(\.name).sorted()
        XCTAssertEqual(names, ["isAvailable"])
        for name in names {
            XCTAssertTrue(GoogleTagManagerPlugin().responds(to: NSSelectorFromString("\(name):")), "no @objc \(name)(_:)")
        }
    }

    /// The test bundle links the plugin the way an app does, so the SDK has to be found here: a dependency that is
    /// declared but never reaches the binary fails this rather than a phone.
    func testFindsTheSdkInTheBinary() {
        XCTAssertTrue(TagManagerSdk.linkedClassNames.contains("TAGManager"))
        XCTAssertTrue(TagManagerSdk.isLinked())
    }

    func testReportsAClassThatIsNotThereAsMissing() {
        XCTAssertFalse(TagManagerSdk.isLinked(classNames: ["TAGManager", "TAGNoSuchClass"]))
        XCTAssertFalse(TagManagerSdk.isLinked(classNames: []))
    }
}
