package com.opentune.data

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.media3.common.Player

/**
 * What the shared code needs from whichever app it runs in (phone and TV, or
 * watch) without knowing that app's classes: how to open it, and what else
 * shows the playing song.
 */
object AppHooks {
    /** Opens the app at its main screen, as its launcher icon does. */
    fun openApp(context: Context): Intent =
        context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?.setPackage(context.packageName)
            ?.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            ?: Intent(Intent.ACTION_MAIN).setPackage(context.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    /** Called as the player's song or state changes, for widgets showing it. */
    @Volatile var onPlayerChanged: (Context, Player?) -> Unit = { _, _ -> }

    /** Called when the player stops for good. */
    @Volatile var onPlayerStopped: (Context) -> Unit = { }

    /** Returns the small icon resource ID for notifications matching the active app icon. */
    @Volatile var getNotificationSmallIcon: (Context) -> Int = { resolveActiveNotificationIcon(it) }

    /**
     * Resolves the active notification icon drawable resource based on
     * user settings or active launcher alias.
     */
    fun resolveActiveNotificationIcon(context: Context): Int {
        val savedName = runCatching {
            context.getSharedPreferences("settings", Context.MODE_PRIVATE).getString("selected_app_icon", null)
        }.getOrNull()

        val iconName = savedName ?: runCatching {
            val pm = context.packageManager
            listOf("LooPd", "PULSE", "FLOW", "AXIS", "TUNE", "ORBIT").firstOrNull { name ->
                val comp = ComponentName(context, "${context.packageName}.icon.$name")
                pm.getComponentEnabledSetting(comp) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED
            }
        }.getOrNull()

        return when (iconName?.uppercase()) {
            "PULSE" -> com.opentune.core.R.drawable.ic_stat_pulse
            "FLOW" -> com.opentune.core.R.drawable.ic_stat_flow
            "AXIS" -> com.opentune.core.R.drawable.ic_stat_axis
            "TUNE" -> com.opentune.core.R.drawable.ic_stat_tune
            "ORBIT" -> com.opentune.core.R.drawable.ic_stat_orbit
            else -> com.opentune.core.R.drawable.ic_stat_loopd
        }
    }
}
