package com.opentune.desktop.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Shuffle
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.opentune.data.innertube.Innertube
import com.opentune.data.innertube.InnertubeParser
import com.opentune.data.model.HomeShelf
import com.opentune.data.model.MoodGenre
import com.opentune.data.model.ShelfItem
import com.opentune.data.model.Song
import com.opentune.desktop.data.Library
import com.opentune.desktop.player.Player
import com.opentune.desktop.ui.components.Artwork
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun HomeScreen(
    contentPadding: PaddingValues,
    onOpenShelfItem: (ShelfItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    val recentSongs by Library.recent.collectAsState()
    val scope = rememberCoroutineScope()
    var homeShelves by remember { mutableStateOf<List<HomeShelf>>(emptyList()) }
    var moods by remember { mutableStateOf<List<MoodGenre>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            val shelves = runCatching {
                val resp = Innertube.browse("FEmusic_home")
                InnertubeParser.parseHome(resp).filter { it.items.isNotEmpty() }
            }.getOrDefault(emptyList())

            val moodList = runCatching {
                val resp = Innertube.browse("FEmusic_moods_and_genres")
                InnertubeParser.parseMoodAndGenres(resp).flatMap { it.items }.distinctBy { it.title }.take(16)
            }.getOrDefault(emptyList())

            homeShelves = shelves
            moods = moodList
            loading = false
        }
    }

    LazyColumn(
        contentPadding = contentPadding,
        verticalArrangement = Arrangement.spacedBy(24.dp),
        modifier = modifier.fillMaxSize(),
    ) {
        // 1. Jump Back In Hero Banner (When recent songs exist)
        if (recentSongs.isNotEmpty()) {
            item(key = "hero_banner") {
                val lastSong = recentSongs.first()
                JumpBackInBanner(
                    song = lastSong,
                    allRecent = recentSongs,
                    onPlay = { Player.playAll(recentSongs, 0) },
                    onShuffle = { Player.playAll(recentSongs.shuffled(), 0) },
                )
            }
        }

        // 2. Recents Carousel (When user has listened to songs)
        if (recentSongs.isNotEmpty()) {
            item(key = "recents_row") {
                SectionHeader("Recents", "Songs you played recently")
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 24.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier.padding(top = 10.dp),
                ) {
                    items(recentSongs.take(20), key = { it.videoId }) { song ->
                        SongCard(song) { Player.play(song) }
                    }
                }
            }
        }

        // 3. Find Your Mood (Moods & Genres Colored Tiles)
        if (moods.isNotEmpty()) {
            item(key = "moods_row") {
                SectionHeader("Find your mood", "Pick a playlist for your mood or vibe")
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 24.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.padding(top = 10.dp),
                ) {
                    items(moods, key = { it.title }) { mood ->
                        MoodTile(mood)
                    }
                }
            }
        }

        // 4. YouTube Music Home Shelves (Quick picks, Trending, New Releases)
        items(homeShelves, key = { it.title }) { shelf ->
            SectionHeader(shelf.title)
            LazyRow(
                contentPadding = PaddingValues(horizontal = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier.padding(top = 10.dp),
            ) {
                items(shelf.items, key = { it.videoId ?: it.browseId ?: it.title }) { item ->
                    ShelfCard(item) {
                        if (item.videoId != null) {
                            Player.play(Song(item.videoId!!, item.title, item.subtitle, item.thumbnailUrl, null))
                        } else {
                            onOpenShelfItem(item)
                        }
                    }
                }
            }
        }

        item { Spacer(Modifier.height(80.dp)) }
    }
}

@Composable
private fun SectionHeader(title: String, subtitle: String? = null) {
    Column(Modifier.padding(horizontal = 24.dp)) {
        Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        if (subtitle != null) {
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun JumpBackInBanner(
    song: Song,
    allRecent: List<Song>,
    onPlay: () -> Unit,
    onShuffle: () -> Unit,
) {
    val cardShape = RoundedCornerShape(24.dp)
    Surface(
        color = MaterialTheme.colorScheme.surfaceContainer,
        shape = cardShape,
        shadowElevation = 6.dp,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .height(200.dp)
            .clip(cardShape),
    ) {
        Box(Modifier.fillMaxSize()) {
            // Background subtle gradient
            Box(
                Modifier.fillMaxSize().background(
                    Brush.horizontalGradient(
                        listOf(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f), Color.Transparent)
                    )
                )
            )

            Row(
                Modifier.fillMaxSize().padding(24.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Artwork(
                    url = song.thumbnailUrl,
                    size = 152.dp,
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.shadow(16.dp, RoundedCornerShape(18.dp)),
                )

                Spacer(Modifier.width(24.dp))

                Column(
                    Modifier.weight(1f),
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(
                        "JUMP BACK IN",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        letterSpacing = 1.2.sp,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        song.title,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        song.artist,
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )

                    Spacer(Modifier.height(16.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(
                            onClick = onPlay,
                            shape = RoundedCornerShape(20.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        ) {
                            Icon(Icons.Rounded.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Play", fontWeight = FontWeight.Bold)
                        }

                        OutlinedButton(
                            onClick = onShuffle,
                            shape = RoundedCornerShape(20.dp),
                        ) {
                            Icon(Icons.Rounded.Shuffle, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Shuffle")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SongCard(song: Song, onClick: () -> Unit) {
    Column(
        Modifier
            .width(150.dp)
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(4.dp),
    ) {
        Artwork(
            url = song.thumbnailUrl,
            size = 142.dp,
            shape = RoundedCornerShape(14.dp),
        )
        Spacer(Modifier.height(8.dp))
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
}

@Composable
private fun ShelfCard(item: ShelfItem, onClick: () -> Unit) {
    val isArtist = item.videoId == null && item.browseId?.startsWith("UC") == true
    Column(
        Modifier
            .width(160.dp)
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(4.dp),
    ) {
        Artwork(
            url = item.thumbnailUrl,
            size = 152.dp,
            shape = if (isArtist) CircleShape else RoundedCornerShape(14.dp),
        )
        Spacer(Modifier.height(8.dp))
        Text(
            item.title,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            item.subtitle,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun MoodTile(mood: MoodGenre) {
    val palette = listOf(0xFF2E7D32, 0xFF1565C0, 0xFF6A1B9A, 0xFFC62828, 0xFFEF6C00, 0xFF00838F, 0xFFAD1457, 0xFF283593)
    val color = remember(mood.title) {
        Color(palette[(mood.title.hashCode() and 0x7fffffff) % palette.size])
    }

    Surface(
        color = color.copy(alpha = 0.85f),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier
            .width(170.dp)
            .height(72.dp)
            .clip(RoundedCornerShape(14.dp)),
    ) {
        Box(Modifier.fillMaxSize().padding(14.dp), contentAlignment = Alignment.BottomStart) {
            Text(
                mood.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )
        }
    }
}

