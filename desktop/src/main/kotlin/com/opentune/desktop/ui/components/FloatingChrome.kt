package com.opentune.desktop.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.LibraryMusic
import androidx.compose.material.icons.rounded.Explore
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.LibraryMusic
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.opentune.data.model.Song
import com.opentune.data.settings.AppSettings
import com.opentune.data.settings.DockLens
import com.opentune.data.settings.DockMotion
import com.opentune.desktop.data.Library
import com.opentune.desktop.player.Player
import com.opentune.ui.BottomChrome
import com.opentune.ui.ChromeTab

/**
 * Floating bottom chrome containing the iconic Android dock and floating mini player.
 */
@Composable
fun FloatingChrome(
    selectedTab: Int?,
    onSelectTab: (Int) -> Unit,
    searchSelected: Boolean,
    onSearch: () -> Unit,
    onExpandPlayer: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val currentSong by Player.currentSong.collectAsState()
    val isPlaying by Player.isPlaying.collectAsState()
    val likedList by Library.liked.collectAsState()
    val ui by AppSettings.ui.collectAsState()

    val dockTabs = remember {
        listOf(
            ChromeTab("Home", Icons.Outlined.Home, Icons.Rounded.Home),
            ChromeTab("Explore", Icons.Outlined.Explore, Icons.Rounded.Explore),
            ChromeTab("Library", Icons.Outlined.LibraryMusic, Icons.Rounded.LibraryMusic),
        )
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 18.dp, start = 16.dp, end = 16.dp),
        contentAlignment = Alignment.BottomCenter,
    ) {
        Box(Modifier.widthIn(max = 680.dp).fillMaxWidth()) {
            BottomChrome(
                inline = false,
                tabs = dockTabs,
                selected = if (searchSelected) null else selectedTab,
                onSelect = onSelectTab,
                onExpand = {},
                searchSelected = searchSelected,
                onSearch = onSearch,
                mini = if (currentSong == null) null else { _, m ->
                    FloatingMiniPlayerPill(
                        song = currentSong!!,
                        isPlaying = isPlaying,
                        isLiked = likedList.any { it.videoId == currentSong!!.videoId },
                        onLike = { song, like -> Library.setLiked(song, like) },
                        onTogglePlay = { Player.togglePlayPause() },
                        onClick = onExpandPlayer,
                        modifier = m,
                    )
                },
                motion = DockMotion.MINIMIZE,
                lens = DockLens.STRETCH,
                reduceMotion = ui.reduceAnimation,
            )
        }
    }
}

@Composable
private fun FloatingMiniPlayerPill(
    song: Song,
    isPlaying: Boolean,
    isLiked: Boolean,
    onLike: (Song, Boolean) -> Unit,
    onTogglePlay: () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val pillShape = RoundedCornerShape(22.dp)
    Surface(
        color = MaterialTheme.colorScheme.surfaceContainerHigh.copy(alpha = 0.94f),
        shape = pillShape,
        shadowElevation = 8.dp,
        modifier = modifier
            .fillMaxWidth()
            .height(64.dp)
            .clip(pillShape)
            .clickable(onClick = onClick),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Artwork
            Artwork(
                url = song.thumbnailUrl,
                size = 44.dp,
                shape = RoundedCornerShape(12.dp),
            )

            Spacer(Modifier.width(12.dp))

            // Title & Artist
            Column(Modifier.weight(1f)) {
                Text(
                    song.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    song.artist,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            // Like Heart Button
            IconButton(onClick = { onLike(song, !isLiked) }) {
                Icon(
                    if (isLiked) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,
                    contentDescription = if (isLiked) "Unlike" else "Like",
                    tint = if (isLiked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp),
                )
            }

            // Play / Pause Circle Button
            Box(
                Modifier.size(38.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary)
                    .clickable(onClick = onTogglePlay),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    if (isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                    contentDescription = if (isPlaying) "Pause" else "Play",
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(22.dp),
                )
            }
        }
    }
}

