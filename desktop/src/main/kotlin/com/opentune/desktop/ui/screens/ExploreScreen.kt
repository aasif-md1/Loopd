package com.opentune.desktop.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.opentune.data.innertube.Innertube
import com.opentune.data.innertube.InnertubeParser
import com.opentune.data.model.HomeShelf
import com.opentune.data.model.ShelfItem
import com.opentune.data.model.Song
import com.opentune.desktop.player.Player
import com.opentune.desktop.ui.components.Artwork
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun ExploreScreen(
    contentPadding: PaddingValues,
    onOpenShelfItem: (ShelfItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    var exploreShelves by remember { mutableStateOf<List<HomeShelf>>(emptyList()) }

    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            val shelves = runCatching {
                val newReleases = InnertubeParser.parseHome(Innertube.browse("FEmusic_new_releases"))
                val charts = InnertubeParser.parseHome(Innertube.browse("FEmusic_charts"))
                (newReleases + charts).filter { it.items.isNotEmpty() }
            }.getOrDefault(emptyList())
            exploreShelves = shelves
        }
    }

    LazyColumn(
        contentPadding = contentPadding,
        verticalArrangement = Arrangement.spacedBy(24.dp),
        modifier = modifier.fillMaxSize(),
    ) {
        item {
            Column(Modifier.padding(horizontal = 24.dp, vertical = 8.dp)) {
                Text("Explore", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
                Text("New releases and top charts worldwide", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        items(exploreShelves, key = { it.title }) { shelf ->
            Column(Modifier.padding(horizontal = 24.dp)) {
                Text(shelf.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            }
            LazyRow(
                contentPadding = PaddingValues(horizontal = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier.padding(top = 8.dp),
            ) {
                items(shelf.items, key = { it.videoId ?: it.browseId ?: it.title }) { item ->
                    val isArtist = item.videoId == null && item.browseId?.startsWith("UC") == true
                    Column(
                        Modifier
                            .width(160.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .clickable {
                                if (item.videoId != null) {
                                    Player.play(Song(item.videoId!!, item.title, item.subtitle, item.thumbnailUrl, null))
                                } else {
                                    onOpenShelfItem(item)
                                }
                            }
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
            }
        }

        item { Spacer(Modifier.height(80.dp)) }
    }
}

