package com.opentune.desktop.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import coil3.compose.LocalPlatformContext
import coil3.request.ImageRequest
import coil3.request.crossfade
import com.opentune.data.subsonic.Subsonic

fun String.artworkAt(px: Int): String {
    return if (this.contains("googleusercontent.com") || this.contains("ggpht.com")) {
        this.replace(Regex("=w\\d+-h\\d+.*"), "=w$px-h$px-l90-rj")
            .replace(Regex("=s\\d+.*"), "=s$px-c")
    } else {
        this
    }
}

/**
 * Ultra sharp HD Artwork loader (1080p/1200p resolution) for album covers and artist portraits.
 */
@Composable
fun Artwork(
    url: String?,
    modifier: Modifier = Modifier,
    size: Dp? = null,
    shape: Shape = MaterialTheme.shapes.medium,
    contentScale: ContentScale = ContentScale.Crop,
) {
    val context = LocalPlatformContext.current
    val targetPx = when {
        size != null && size >= 180.dp -> 1200
        size != null && size >= 80.dp -> 600
        else -> 300
    }
    val hdUrl = remember(url, targetPx) {
        val resolved = Subsonic.resolveCover(url)
        resolved?.artworkAt(targetPx) ?: resolved
    }

    val mod = modifier
        .then(if (size != null) Modifier.size(size) else Modifier)
        .aspectRatio(1f)
        .clip(shape)
        .background(MaterialTheme.colorScheme.surfaceContainerHigh)

    AsyncImage(
        model = remember(hdUrl) {
            ImageRequest.Builder(context)
                .data(hdUrl)
                .crossfade(260)
                .build()
        },
        contentDescription = null,
        contentScale = contentScale,
        modifier = mod,
    )
}

