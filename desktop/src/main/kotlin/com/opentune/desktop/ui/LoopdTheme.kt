package com.opentune.desktop.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import com.materialkolor.DynamicMaterialTheme
import com.materialkolor.rememberDynamicMaterialThemeState
import com.opentune.data.settings.AppSettings
import com.opentune.data.settings.ThemeMode

// Loopd Signature Color Palette
val LoopdIndigo = Color(0xFF6366F1)
val LoopdViolet = Color(0xFF8B5CF6)
val LoopdDarkSurface = Color(0xFF121316)
val LoopdPureBlack = Color(0xFF000000)

@Composable
fun LoopdTheme(
    artworkUrl: String? = null,
    content: @Composable () -> Unit,
) {
    val themeSettings by AppSettings.theme.collectAsState()
    val isSystemDark = isSystemInDarkTheme()
    val isDark = when (themeSettings.mode) {
        ThemeMode.SYSTEM -> isSystemDark
        ThemeMode.DARK -> true
        ThemeMode.LIGHT -> false
    }

    val seedColor = remember(artworkUrl, themeSettings.colorFromArtwork) {
        if (themeSettings.colorFromArtwork && artworkUrl != null) {
            Color(artworkUrl.hashCode() or 0xFF000000.toInt())
        } else {
            LoopdIndigo
        }
    }

    val dynamicState = rememberDynamicMaterialThemeState(
        seedColor = seedColor,
        isDark = isDark,
    )

    DynamicMaterialTheme(
        state = dynamicState,
        animate = true,
    ) {
        val baseScheme = MaterialTheme.colorScheme
        val finalScheme = if (isDark && themeSettings.pureBlack) {
            baseScheme.copy(
                background = LoopdPureBlack,
                surface = LoopdPureBlack,
                surfaceContainer = Color(0xFF141414),
                surfaceContainerLow = Color(0xFF0A0A0A),
                surfaceContainerHigh = Color(0xFF1E1E1E),
            )
        } else {
            baseScheme
        }

        MaterialTheme(
            colorScheme = finalScheme,
            content = content,
        )
    }
}

