package com.opentune.desktop

import androidx.compose.ui.Alignment
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.WindowPosition
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import com.opentune.data.settings.AppSettings
import com.opentune.desktop.ui.LoopdTheme
import com.opentune.desktop.ui.screens.WelcomeManager
import java.io.File

fun main() = application {
    val rootDir = File(System.getProperty("user.home"), ".loopd").apply { mkdirs() }
    val appContext = android.content.Context(rootDir)

    AppSettings.init(appContext)
    WelcomeManager.settle()

    val windowState = rememberWindowState(
        width = 1180.dp,
        height = 820.dp,
        position = WindowPosition(Alignment.Center),
    )

    val icon = painterResource("icons/app-icon.png")

    Window(
        onCloseRequest = ::exitApplication,
        state = windowState,
        title = "Loopd",
        icon = icon,
    ) {
        LoopdTheme {
            DesktopApp()
        }
    }
}

