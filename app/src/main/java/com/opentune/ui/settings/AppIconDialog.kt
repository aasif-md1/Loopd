package com.opentune.ui.settings

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.Icon
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.core.graphics.drawable.toBitmap
import com.opentune.R
import com.opentune.ui.components.FloatingDialog
import com.opentune.ui.components.SheetButton

internal enum class AppIcon(
    val title: String,
    val resource: Int,
    val foregroundRes: Int,
    val statIconRes: Int,
    val isDark: Boolean,
) {
    LooPd("LooPd", R.mipmap.ic_launcher, R.drawable.ic_foreground_loopd, com.opentune.core.R.drawable.ic_stat_loopd, isDark = true),
    PULSE("PULSE", R.mipmap.ic_launcher_pulse, R.drawable.ic_foreground_pulse, com.opentune.core.R.drawable.ic_stat_pulse, isDark = false),
    FLOW("FLOW", R.mipmap.ic_launcher_flow, R.drawable.ic_foreground_flow, com.opentune.core.R.drawable.ic_stat_flow, isDark = false),
    AXIS("AXIS", R.mipmap.ic_launcher_axis, R.drawable.ic_foreground_axis, com.opentune.core.R.drawable.ic_stat_axis, isDark = true),
    TUNE("TUNE", R.mipmap.ic_launcher_tune, R.drawable.ic_foreground_tune, com.opentune.core.R.drawable.ic_stat_tune, isDark = false),
    ORBIT("ORBIT", R.mipmap.ic_launcher_orbit, R.drawable.ic_foreground_orbit, com.opentune.core.R.drawable.ic_stat_orbit, isDark = true);

    fun component(context: Context) = ComponentName(context, "${context.packageName}.icon.$name")
    companion object {
        var current: AppIcon = LooPd

        fun selected(context: Context): AppIcon {
            val savedName = runCatching {
                context.getSharedPreferences("settings", Context.MODE_PRIVATE).getString("selected_app_icon", null)
            }.getOrNull()

            val fromSaved = savedName?.let { name -> entries.firstOrNull { it.name.equals(name, ignoreCase = true) } }
            if (fromSaved != null) {
                current = fromSaved
                return fromSaved
            }

            val found = entries.firstOrNull {
                context.packageManager.getComponentEnabledSetting(it.component(context)) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED
            } ?: LooPd
            current = found
            return found
        }
    }
}

/** Enable the new alias first. MainActivity itself is never disabled or restarted. */
internal fun selectAppIcon(context: Context, choice: AppIcon) {
    val pm = context.packageManager
    pm.setComponentEnabledSetting(choice.component(context), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
    AppIcon.entries.filter { it != choice }.forEach {
        pm.setComponentEnabledSetting(it.component(context), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
    }
    AppIcon.current = choice
    context.getSharedPreferences("settings", Context.MODE_PRIVATE).edit().putString("selected_app_icon", choice.name).apply()
}

@Composable
internal fun AppIconDialog(onDismiss: () -> Unit) {
    val context = LocalContext.current
    val resources = androidx.compose.ui.platform.LocalResources.current
    var selected by remember { mutableStateOf(AppIcon.selected(context)) }
    var error by remember { mutableStateOf<String?>(null) }
    FloatingDialog(onDismissRequest = onDismiss, title = { Text("App icon") }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Your launcher controls the icon shape. Changes may take a moment to appear.", style = MaterialTheme.typography.bodyMedium)
            // Three to a row, each as the launcher would show it, the chosen one ringed and ticked.
            AppIcon.entries.chunked(3).forEach { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { icon ->
                        val chosen = selected == icon
                        val bitmap = remember(icon, resources) { resources.getDrawable(icon.resource, context.theme).toBitmap(216, 216).asImageBitmap() }
                        val ring by animateColorAsState(if (chosen) MaterialTheme.colorScheme.primary else Color.Transparent, label = "iconRing")
                        val scale by animateFloatAsState(if (chosen) 1f else 0.92f, spring(dampingRatio = 0.7f, stiffness = 500f), label = "iconScale")
                        Column(
                            Modifier.weight(1f).clip(RoundedCornerShape(20.dp)).semantics { this.selected = chosen }
                                .clickable(role = Role.RadioButton) {
                                    runCatching { selectAppIcon(context, icon) }.onSuccess { selected = icon; error = null }
                                        .onFailure { error = "Couldn't change the launcher icon. Try again." }
                                }
                                .padding(vertical = 8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Box(Modifier.size(84.dp).border(2.5.dp, ring, RoundedCornerShape(26.dp)).padding(6.dp), contentAlignment = Alignment.Center) {
                                Image(bitmap, icon.title, Modifier.fillMaxSize().graphicsLayer { scaleX = scale; scaleY = scale })
                                if (chosen) Box(
                                    Modifier.align(Alignment.BottomEnd).offset(x = 6.dp, y = 6.dp).size(24.dp).clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.primary),
                                    contentAlignment = Alignment.Center,
                                ) { Icon(Icons.Rounded.Check, null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onPrimary) }
                            }
                            Text(
                                icon.title, Modifier.padding(top = 6.dp), style = MaterialTheme.typography.labelLarge,
                                fontWeight = if (chosen) FontWeight.SemiBold else FontWeight.Normal,
                                color = if (chosen) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                            )
                        }
                    }
                    // A short last row keeps its tiles the same width as the others.
                    repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        }
    }, confirmButton = { SheetButton("Done", onClick = onDismiss, closes = true) })
}
