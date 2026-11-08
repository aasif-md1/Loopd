package com.opentune.desktop

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.opentune.data.innertube.Innertube
import com.opentune.data.model.ShelfItem
import com.opentune.data.model.Song
import com.opentune.data.settings.AppSettings
import com.opentune.data.settings.WelcomeState
import com.opentune.desktop.player.Player
import com.opentune.desktop.ui.components.FloatingChrome
import com.opentune.desktop.ui.components.TopHeader
import com.opentune.desktop.ui.screens.ExploreScreen
import com.opentune.desktop.ui.screens.HomeScreen
import com.opentune.desktop.ui.screens.LibraryScreen
import com.opentune.desktop.ui.screens.NowPlayingScreen
import com.opentune.desktop.ui.screens.SearchScreen
import com.opentune.desktop.ui.screens.SettingsScreen
import com.opentune.desktop.ui.screens.WelcomeManager
import com.opentune.desktop.ui.screens.WelcomeScreen
import com.opentune.ui.components.LocalHazeState
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.haze
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

enum class DesktopTab {
    HOME,
    EXPLORE,
    LIBRARY,
    SEARCH,
    SETTINGS,
}

@Composable
fun DesktopApp() {
    val hazeState = remember { HazeState() }
    val ui by AppSettings.ui.collectAsState()
    val scope = rememberCoroutineScope()

    CompositionLocalProvider(LocalHazeState provides hazeState) {
        val showWelcome = ui.welcome == WelcomeState.DUE

        if (showWelcome) {
            WelcomeScreen(
                onDone = {
                    WelcomeManager.finish()
                },
            )
        } else {
            var currentTab by remember { mutableStateOf(DesktopTab.HOME) }
            var previousTab by remember { mutableStateOf(DesktopTab.HOME) }
            var showNowPlaying by remember { mutableStateOf(false) }

            fun switchTab(tab: DesktopTab) {
                if (currentTab != tab) {
                    previousTab = currentTab
                    currentTab = tab
                }
            }

            fun openShelfItem(item: ShelfItem) {
                if (!item.videoId.isNullOrBlank()) {
                    val s = Song(
                        videoId = item.videoId!!,
                        title = item.title,
                        artist = item.subtitle,
                        thumbnailUrl = item.thumbnailUrl,
                    )
                    Player.play(s, listOf(s))
                } else if (!item.browseId.isNullOrBlank()) {
                    scope.launch {
                        try {
                            val songs = withContext(Dispatchers.IO) {
                                val resp = Innertube.browse(item.browseId!!)
                                com.opentune.data.innertube.InnertubeParser.collectSongsDeep(resp)
                            }
                            if (songs.isNotEmpty()) {
                                Player.play(songs.first(), songs)
                            }
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                }
            }

            Box(
                Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .haze(hazeState),
            ) {
                // Main responsive column (constrained to optimal reading width on wide screens)
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.TopCenter,
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .widthIn(max = 1240.dp),
                    ) {
                        val chromePadding = PaddingValues(
                            top = 76.dp, // room for TopHeader
                            bottom = 120.dp, // room for FloatingChrome dock + miniplayer
                        )

                        AnimatedContent(
                            targetState = currentTab,
                            transitionSpec = {
                                fadeIn(animationSpec = tween(220)) togetherWith fadeOut(animationSpec = tween(180))
                            },
                            modifier = Modifier.fillMaxSize(),
                        ) { tab ->
                            when (tab) {
                                DesktopTab.HOME -> {
                                    HomeScreen(
                                        contentPadding = chromePadding,
                                        onOpenShelfItem = { openShelfItem(it) },
                                        modifier = Modifier.fillMaxSize(),
                                    )
                                }
                                DesktopTab.EXPLORE -> {
                                    ExploreScreen(
                                        contentPadding = chromePadding,
                                        onOpenShelfItem = { openShelfItem(it) },
                                        modifier = Modifier.fillMaxSize(),
                                    )
                                }
                                DesktopTab.LIBRARY -> {
                                    LibraryScreen(
                                        contentPadding = chromePadding,
                                        modifier = Modifier.fillMaxSize(),
                                    )
                                }
                                DesktopTab.SEARCH -> {
                                    SearchScreen(
                                        contentPadding = chromePadding,
                                        onOpenShelfItem = { openShelfItem(it) },
                                        modifier = Modifier.fillMaxSize(),
                                    )
                                }
                                DesktopTab.SETTINGS -> {
                                    SettingsScreen(
                                        contentPadding = chromePadding,
                                        onBackToApp = { currentTab = previousTab },
                                        onReopenWelcome = { WelcomeManager.showAgain() },
                                        modifier = Modifier.fillMaxSize(),
                                    )
                                }
                            }
                        }

                        // Top Header (shows greeting on Home/Explore/Library, or back navigation)
                        TopHeader(
                            title = when (currentTab) {
                                DesktopTab.HOME -> null
                                DesktopTab.EXPLORE -> "Explore"
                                DesktopTab.LIBRARY -> "Library"
                                DesktopTab.SEARCH -> "Search"
                                DesktopTab.SETTINGS -> "Settings"
                            },
                            onBack = if (currentTab == DesktopTab.SEARCH || currentTab == DesktopTab.SETTINGS) {
                                { currentTab = previousTab }
                            } else null,
                            onSearch = { switchTab(DesktopTab.SEARCH) },
                            onSettings = { switchTab(DesktopTab.SETTINGS) },
                            modifier = Modifier.align(Alignment.TopCenter),
                        )
                    }
                }

                // Android Floating Bottom Chrome (Capsule Dock + Floating MiniPlayer Pill)
                FloatingChrome(
                    selectedTab = when (currentTab) {
                        DesktopTab.HOME -> 0
                        DesktopTab.EXPLORE -> 1
                        DesktopTab.LIBRARY -> 2
                        else -> null
                    },
                    onSelectTab = { idx ->
                        when (idx) {
                            0 -> switchTab(DesktopTab.HOME)
                            1 -> switchTab(DesktopTab.EXPLORE)
                            2 -> switchTab(DesktopTab.LIBRARY)
                        }
                    },
                    searchSelected = currentTab == DesktopTab.SEARCH,
                    onSearch = { switchTab(DesktopTab.SEARCH) },
                    onExpandPlayer = { showNowPlaying = true },
                    modifier = Modifier.align(Alignment.BottomCenter),
                )

                // Full Screen Now Playing Sheet with Ambient Glow & HD Album Art
                AnimatedVisibility(
                    visible = showNowPlaying,
                    enter = slideInVertically(
                        initialOffsetY = { it },
                        animationSpec = tween(320),
                    ) + fadeIn(tween(260)),
                    exit = slideOutVertically(
                        targetOffsetY = { it },
                        animationSpec = tween(280),
                    ) + fadeOut(tween(220)),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    NowPlayingScreen(
                        onClose = { showNowPlaying = false },
                        modifier = Modifier.fillMaxSize(),
                    )
                }
            }
        }
    }
}

