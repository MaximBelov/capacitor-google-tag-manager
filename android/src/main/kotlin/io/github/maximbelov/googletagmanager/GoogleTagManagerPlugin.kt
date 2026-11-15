package io.github.maximbelov.googletagmanager

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Google Tag Manager on Android. The plugin exists to put play-services-tagmanager into the app: the SDK finds the
 * container in assets/containers and the Firebase Analytics events on its own, and its manifest brings the preview
 * activity. What is left for the web view is the one question of whether the SDK is there.
 */
@CapacitorPlugin(name = "GoogleTagManager")
class GoogleTagManagerPlugin : Plugin() {
    @PluginMethod
    fun isAvailable(call: PluginCall) {
        call.resolve(JSObject().put("available", TagManagerSdk.isLinked(javaClass.classLoader)))
    }
}

/** Whether the Tag Manager SDK's classes are on the app's class path. */
object TagManagerSdk {
    /** A class the SDK has had since it moved to Google Play services, and the one its manifest names as a service. */
    const val SERVICE_CLASS = "com.google.android.gms.tagmanager.TagManagerService"

    fun isLinked(loader: ClassLoader?, className: String = SERVICE_CLASS): Boolean =
        try {
            Class.forName(className, false, loader)
            true
        } catch (_: ClassNotFoundException) {
            false
        }
}
