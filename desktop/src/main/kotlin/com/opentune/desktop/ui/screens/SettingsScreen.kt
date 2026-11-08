package com.opentune.desktop.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.GraphicEq
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.Lyrics
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PlayCircle
import androidx.compose.material.icons.rounded.Storage
import androidx.compose.material.icons.rounded.WavingHand
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.opentune.core.BuildConfig
import com.opentune.data.settings.AppSettings
import com.opentune.data.settings.ThemeMode

private enum class SettingsCategory(
    val title: String,
    val summary: String,
    val icon: ImageVector,
) {
    LOOK("Appearance", "Theme, color from artwork, glass styling, and UI animations", Icons.Rounded.Palette),
    SOUND("Sound and quality", "Loudness normalization, stream quality, and audio add-ons", Icons.Rounded.GraphicEq),
    PLAYBACK("Playback", "Crossfade, skip silence, and playback behavior", Icons.Rounded.PlayCircle),
    LYRICS("Lyrics", "Synced lyrics, animation, and multi-source lyrics providers", Icons.Rounded.Lyrics),
    ACCOUNTS("Accounts and services", "YouTube Music, Last.fm scrobbling, and media server", Icons.Rounded.Person),
    ABOUT("About Loopd", "Loopd version details, local data, and first-run welcome", Icons.Rounded.Info),
}

@Composable
fun SettingsScreen(
    contentPadding: PaddingValues,
    onBackToApp: () -> Unit,
    onReopenWelcome: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var selectedCategory by remember { mutableStateOf<SettingsCategory?>(null) }
    val ui by AppSettings.ui.collectAsState()
    val themeSettings by AppSettings.theme.collectAsState()
    val playbackSettings by AppSettings.playback.collectAsState()

    LazyColumn(
        contentPadding = contentPadding,
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = modifier.fillMaxSize(),
    ) {
        if (selectedCategory == null) {
            // Top Level Categories Overview
            item {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = onBackToApp) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
                    }
                    Spacer(Modifier.width(8.dp))
                    Text("Settings", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
                }
            }

            items(SettingsCategory.entries) { cat ->
                Surface(
                    color = MaterialTheme.colorScheme.surfaceContainer,
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .clickable { selectedCategory = cat },
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 18.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier.size(44.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceContainerHighest),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(cat.icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(24.dp))
                        }
                        Spacer(Modifier.width(16.dp))
                        Column(Modifier.weight(1f)) {
                            Text(cat.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            Text(cat.summary, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        } else {
            // Category Detail Page
            val cat = selectedCategory!!
            item {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = { selectedCategory = null }) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
                    }
                    Spacer(Modifier.width(8.dp))
                    Text(cat.title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                }
            }

            item {
                Surface(
                    color = MaterialTheme.colorScheme.surfaceContainer,
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
                ) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        when (cat) {
                            SettingsCategory.LOOK -> {
                                SettingToggleRow(
                                    title = "Dark theme",
                                    summary = "Use dark mode palette across all screens",
                                    checked = themeSettings.mode == ThemeMode.DARK || themeSettings.mode == ThemeMode.SYSTEM,
                                    onCheckedChange = { isDark ->
                                        AppSettings.updateTheme { it.copy(mode = if (isDark) ThemeMode.DARK else ThemeMode.LIGHT) }
                                    },
                                )
                                SettingToggleRow(
                                    title = "Pure black (OLED)",
                                    summary = "Deep black backgrounds for contrast and power efficiency",
                                    checked = themeSettings.pureBlack,
                                    onCheckedChange = { enabled -> AppSettings.updateTheme { it.copy(pureBlack = enabled) } },
                                )
                                SettingToggleRow(
                                    title = "Color from song artwork",
                                    summary = "Dynamic colors tinted by currently playing track",
                                    checked = themeSettings.colorFromArtwork,
                                    onCheckedChange = { enabled -> AppSettings.updateTheme { it.copy(colorFromArtwork = enabled) } },
                                )
                                SettingToggleRow(
                                    title = "Liquid glass styling",
                                    summary = "Refracting translucent glass effects on floating elements",
                                    checked = ui.liquidGlass,
                                    onCheckedChange = { enabled -> AppSettings.updateUi { it.copy(liquidGlass = enabled) } },
                                )
                            }
                            SettingsCategory.SOUND -> {
                                SettingToggleRow(
                                    title = "Loudness normalization",
                                    summary = "Keeps song volumes consistent between tracks",
                                    checked = playbackSettings.loudnessNormalization,
                                    onCheckedChange = { enabled -> AppSettings.updatePlayback { it.copy(loudnessNormalization = enabled) } },
                                )
                            }
                            SettingsCategory.PLAYBACK -> {
                                SettingToggleRow(
                                    title = "Autoplay next songs",
                                    summary = "Continuously plays related tracks when the queue ends",
                                    checked = playbackSettings.autoplay,
                                    onCheckedChange = { enabled -> AppSettings.updatePlayback { it.copy(autoplay = enabled) } },
                                )
                                SettingToggleRow(
                                    title = "Skip silence",
                                    summary = "Skips silent intros and outros in songs",
                                    checked = playbackSettings.skipSilence,
                                    onCheckedChange = { enabled -> AppSettings.updatePlayback { it.copy(skipSilence = enabled) } },
                                )
                            }
                            SettingsCategory.LYRICS -> {
                                SettingToggleRow(
                                    title = "Synced lyrics",
                                    summary = "Follow along with synchronized lines in Now Playing",
                                    checked = ui.syncedLyrics,
                                    onCheckedChange = { enabled -> AppSettings.updateUi { it.copy(syncedLyrics = enabled) } },
                                )
                                SettingToggleRow(
                                    title = "Blur unfocused lyrics",
                                    summary = "Subtle blur on past and upcoming lyric lines",
                                    checked = ui.blurLyrics,
                                    onCheckedChange = { enabled -> AppSettings.updateUi { it.copy(blurLyrics = enabled) } },
                                )
                            }
                            SettingsCategory.ACCOUNTS -> {
                                Text("Accounts & Services", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                Text("Connect to your YouTube Music, Last.fm, or Subsonic server.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            SettingsCategory.ABOUT -> {
                                Text("Loopd for Windows", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                                Text("Version: ${BuildConfig.VERSION_NAME}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.height(8.dp))
                                Button(
                                    onClick = onReopenWelcome,
                                    shape = RoundedCornerShape(14.dp),
                                ) {
                                    Icon(Icons.Rounded.WavingHand, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text("Show the welcome again (Onboarding)")
                                }
                            }
                        }
                    }
                }
            }
        }

        item { Spacer(Modifier.height(80.dp)) }
    }
}

@Composable
private fun SettingToggleRow(
    title: String,
    summary: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable { onCheckedChange(!checked) }
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(summary, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

