// swift-tools-version: 5.9
import PackageDescription

// The plugin's job is the dependency on Google's Tag Manager package: an app that installs the plugin gets the SDK linked
// in, with the Firebase Analytics it depends on. Any 9.x is accepted; the app's Package.resolved records which one it
// builds with, and the app moves it (Xcode's File > Packages > Update to Latest Package Versions, or an edit of
// Package.resolved) without a release of this plugin.
let package = Package(
    name: "CapacitorGoogleTagManager",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapacitorGoogleTagManager",
            targets: ["GoogleTagManagerPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://github.com/googleanalytics/google-tag-manager-ios-sdk.git", "9.1.0"..<"10.0.0")
    ],
    targets: [
        // References the SDK's classes so the linker takes its static archive into the app (see the .m file).
        .target(
            name: "GoogleTagManagerLinkage",
            dependencies: [
                .product(name: "GoogleTagManager", package: "google-tag-manager-ios-sdk")
            ],
            path: "ios/Sources/GoogleTagManagerLinkage"),
        .target(
            name: "GoogleTagManagerPlugin",
            dependencies: [
                "GoogleTagManagerLinkage",
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/GoogleTagManagerPlugin"),
        .testTarget(
            name: "GoogleTagManagerPluginTests",
            dependencies: ["GoogleTagManagerPlugin"],
            path: "ios/Tests/GoogleTagManagerPluginTests")
    ]
)
