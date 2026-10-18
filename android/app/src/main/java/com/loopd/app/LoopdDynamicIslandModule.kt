package com.loopd.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class LoopdDynamicIslandModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        instance = this
    }

    override fun getName(): String = "LoopdDynamicIslandModule"

    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                promise.resolve(Settings.canDrawOverlays(reactContext))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactContext.packageName}")
                ).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.localizedMessage)
        }
    }

    @ReactMethod
    fun show(title: String, artist: String, artworkUrl: String?, isPlaying: Boolean, promise: Promise) {
        try {
            LoopdDynamicIslandService.show(reactContext, title, artist, artworkUrl, isPlaying)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SHOW_ERROR", e.localizedMessage)
        }
    }

    @ReactMethod
    fun update(title: String, artist: String, artworkUrl: String?, isPlaying: Boolean, promise: Promise) {
        try {
            LoopdDynamicIslandService.update(reactContext, title, artist, artworkUrl, isPlaying)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UPDATE_ERROR", e.localizedMessage)
        }
    }

    @ReactMethod
    fun hide(promise: Promise) {
        try {
            LoopdDynamicIslandService.hide(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("HIDE_ERROR", e.localizedMessage)
        }
    }

    companion object {
        private var instance: LoopdDynamicIslandModule? = null

        fun emitRemoteAction(action: String) {
            try {
                instance?.let { module ->
                    val map = Arguments.createMap().apply {
                        putString("action", action)
                    }
                    module.reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onDynamicIslandAction", map)
                }
            } catch (_: Exception) {}
        }
    }
}
