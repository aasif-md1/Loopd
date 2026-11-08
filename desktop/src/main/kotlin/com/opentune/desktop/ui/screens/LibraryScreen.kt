package com.opentune.desktop.ui.screens

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.opentune.data.model.Song
import com.opentune.desktop.data.Library
import com.opentune.desktop.player.Player
import com.opentune.desktop.ui.components.Artwork

enum class LibraryView {
    MAIN,
    LIKED,
    HISTORY,
}

@Composable
fun LibraryScreen(
    contentPadding: PaddingValues,
    modifier: Modifier = Modifier,
) {
    var view by remember { mutableStateOf(LibraryView.MAIN) }
    val likedSongs by Library.liked.collectAsState()
    val historySongs by Library.recent.collectAsState()

    when (view) {
        LibraryView.MAIN -> {
            LazyColumn(
                contentPadding = contentPadding,
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = modifier.fillMaxSize(),
            ) {
                item {
                    Column(Modifier.padding(horizontal = 24.dp, vertical = 8.dp)) {
                        Text("Library", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
                        Text("Your saved music, liked tracks, and history", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }

                // Liked Songs Card
                item {
                    CollectionCard(
                        title = "Liked songs",
                        subtitle = "${likedSongs.size} tracks",
                        icon = Icons.Rounded.Favorite,
                        gradient = listOf(Color(0xFF6366F1), Color(0xFF8B5CF6)),
                        onClick = { view = LibraryView.LIKED },
                    )
                }

                // History Card
                item {
                    CollectionCard(
                        title = "Recently played",
                        subtitle = "${historySongs.size} tracks",
                        icon = Icons.Rounded.History,
                        gradient = listOf(Color(0xFF0F766E), Color(0xFF14B8A6)),
                        onClick = { view = LibraryView.HISTORY },
                    )
                }

                item { Spacer(Modifier.height(80.dp)) }
            }
        }
        LibraryView.LIKED -> {
            SongListView(
                title = "Liked songs",
                subtitle = "${likedSongs.size} tracks",
                songs = likedSongs,
                onBack = { view = LibraryView.MAIN },
                contentPadding = contentPadding,
            )
        }
        LibraryView.HISTORY -> {
            SongListView(
                title = "Recently played",
                subtitle = "${historySongs.size} tracks",
                songs = historySongs,
                onBack = { view = LibraryView.MAIN },
                contentPadding = contentPadding,
            )
        }
    }
}

@Composable
private fun CollectionCard(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    gradient: List<Color>,
    onClick: () -> Unit,
) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceContainer,
        shape = RoundedCornerShape(20.dp),
        shadowElevation = 4.dp,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .clip(RoundedCornerShape(20.dp))
            .clickable(onClick = onClick),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(60.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Brush.linearGradient(gradient)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(28.dp))
            }

            Spacer(Modifier.width(18.dp))

            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun SongListView(
    title: String,
    subtitle: String,
    songs: List<Song>,
    onBack: () -> Unit,
    contentPadding: PaddingValues,
) {
    LazyColumn(
        contentPadding = contentPadding,
        modifier = Modifier.fillMaxSize(),
    ) {
        item {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
                }
                Spacer(Modifier.width(8.dp))
                Column {
                    Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        if (songs.isEmpty()) {
            item {
                Box(Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
                    Text("No songs here yet.", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        } else {
            items(songs, key = { it.videoId }) { song ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { Player.play(song) }
                        .padding(horizontal = 24.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Artwork(url = song.thumbnailUrl, size = 48.dp, shape = RoundedCornerShape(10.dp))
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(song.title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(song.artist, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    song.durationText?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        item { Spacer(Modifier.height(80.dp)) }
    }
}

