package io.github.maximbelov.googletagmanager

import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

// The JavaScript reaches the plugin by the name in @CapacitorPlugin and each method by its name; a rename on either side
// fails only at run time on a phone, so both are pinned here.
class GoogleTagManagerPluginTest {
    @Test
    fun isRegisteredUnderTheNameTheJavaScriptUses() {
        val annotation = GoogleTagManagerPlugin::class.java.getAnnotation(CapacitorPlugin::class.java)
        assertNotNull(annotation)
        assertEquals("GoogleTagManager", annotation!!.name)
    }

    @Test
    fun exposesExactlyTheMethodsOfTheApi() {
        val methods = GoogleTagManagerPlugin::class.java.declaredMethods
            .filter { it.isAnnotationPresent(PluginMethod::class.java) }
            .map { it.name }
            .sorted()
        assertEquals(listOf("isAvailable"), methods)
        methods.forEach { GoogleTagManagerPlugin::class.java.getMethod(it, PluginCall::class.java) }
    }

    // The unit tests run against the plugin's own runtime class path, which carries the SDK exactly as an app's does: a
    // dependency that went missing, or a class the SDK renamed, fails here rather than on a phone.
    @Test
    fun findsTheSdkOnTheClassPath() {
        assertTrue(TagManagerSdk.isLinked(javaClass.classLoader))
    }

    @Test
    fun reportsAClassThatIsNotThereAsMissing() {
        assertFalse(TagManagerSdk.isLinked(javaClass.classLoader, "com.google.android.gms.tagmanager.NoSuchClass"))
    }
}
