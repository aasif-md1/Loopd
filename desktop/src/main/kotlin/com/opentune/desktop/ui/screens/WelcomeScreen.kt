package com.opentune.desktop.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.Explore
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Language
import androidx.compose.material.icons.rounded.LibraryMusic
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.opentune.data.innertube.Innertube
import com.opentune.data.innertube.InnertubeParser
import com.opentune.data.model.BrowseType
import com.opentune.data.model.SearchFilter
import com.opentune.data.model.SearchResult
import com.opentune.data.settings.AppSettings
import com.opentune.data.settings.ThemeMode
import com.opentune.data.settings.WelcomeState
import com.opentune.desktop.data.Library
import com.opentune.desktop.ui.components.Artwork
import com.opentune.ui.BottomChrome
import com.opentune.ui.ChromeTab
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

enum class OnboardingStep {
    LANGUAGE,
    ARTISTS,
    LOOK,
    READY,
}

data class WelcomeArtist(
    val id: String,
    val name: String,
    val photo: String,
)

private val POPULAR_ARTISTS = listOf(
    WelcomeArtist("UC6107grRI4m0329JKFK4-Ug", "Arijit Singh", "https://lh3.googleusercontent.com/yU4E7h-yE_xXo-K1QeO8D8nZ7eA8bZ3yF8e=w544-h544"),
    WelcomeArtist("UCaYwtv9Vv3O4q_N-d2Q6p5Q", "Diljit Dosanjh", "https://lh3.googleusercontent.com/a-/ALV-UjV_3dYx7f9Z7g=w544-h544"),
    WelcomeArtist("UCzF_KfZ7F0U9iJ2h3l9oUvg", "Sidhu Moose Wala", "https://lh3.googleusercontent.com/a-/ALV-UjU5jX_8F8a9b=w544-h544"),
    WelcomeArtist("UCh86FjWfU_j2E4U1sEaWzxg", "Karan Aujla", "https://lh3.googleusercontent.com/a-/ALV-UjW_8b7X9f=w544-h544"),
    WelcomeArtist("UCrVlYIeGq2YpB7pUe2Q9ZzA", "Shreya Ghoshal", "https://lh3.googleusercontent.com/a-/ALV-UjV2b8f7X=w544-h544"),
    WelcomeArtist("UC2h06rZ6P9K5YvD4R1o6Y2A", "Atif Aslam", "https://lh3.googleusercontent.com/a-/ALV-UjX8k9Y7f=w544-h544"),
    WelcomeArtist("UCx76nF4jN9s4X5d1Y1v7_aQ", "Badshah", "https://lh3.googleusercontent.com/a-/ALV-UjV5b8f7X=w544-h544"),
    WelcomeArtist("UCQ2rGfJ1c2T5N4r7A2b5Y4g", "AP Dhillon", "https://lh3.googleusercontent.com/a-/ALV-UjW5c8f7X=w544-h544"),
    WelcomeArtist("UCq-Fj5jknLsUf-MWSy4_brA", "Pritam", "https://lh3.googleusercontent.com/a-/ALV-UjY2b8f7X=w544-h544"),
    WelcomeArtist("UCLFz_98Q_a4pGvF6mP4cMRA", "Neha Kakkar", "https://lh3.googleusercontent.com/a-/ALV-UjV3b8f7X=w544-h544"),
    WelcomeArtist("UC4M01Zq-N8c-d6G8x9Q9v7w", "Yo Yo Honey Singh", "https://lh3.googleusercontent.com/a-/ALV-UjW3b8f7X=w544-h544"),
    WelcomeArtist("UCYw_R5fHn8E3K7e-T3s_4fQ", "A.R. Rahman", "https://lh3.googleusercontent.com/a-/ALV-UjX3b8f7X=w544-h544"),
    WelcomeArtist("UCqECaJ8Gagnn7YCbPEzWH6g", "Taylor Swift", "https://lh3.googleusercontent.com/a-/ALV-UjZ8k9Y7f=w544-h544"),
    WelcomeArtist("UC0WP5P-ufpRfjbNrmOWwLBQ", "The Weeknd", "https://lh3.googleusercontent.com/a-/ALV-UjZ5c8f7X=w544-h544"),
    WelcomeArtist("UCByOQJjav0CUDwxCk-jVNRQ", "Drake", "https://lh3.googleusercontent.com/a-/ALV-UjZ2b8f7X=w544-h544"),
    WelcomeArtist("UC0C-w0YjGpqDXGB8Tr0G61A", "Ed Sheeran", "https://lh3.googleusercontent.com/a-/ALV-UjZ3b8f7X=w544-h544"),
)

object WelcomeManager {
    fun finish() {
        AppSettings.updateUi { it.copy(welcome = WelcomeState.SEEN) }
    }
    fun showAgain() {
        AppSettings.updateUi { it.copy(welcome = WelcomeState.DUE) }
    }
    fun settle() {
        val cur = AppSettings.ui.value.welcome
        if (cur != WelcomeState.UNDECIDED) return
        val hasHistory = Library.recent.value.isNotEmpty() || Library.liked.value.isNotEmpty()
        AppSettings.updateUi { it.copy(welcome = if (hasHistory) WelcomeState.SEEN else WelcomeState.DUE) }
    }
}

@Composable
fun WelcomeScreen(onDone: () -> Unit) {
    var step by remember { mutableStateOf(OnboardingStep.LANGUAGE) }
    var selectedLanguage by remember { mutableStateOf("English") }
    val pickedArtists = remember { mutableStateListOf<WelcomeArtist>() }

    Surface(
        color = MaterialTheme.colorScheme.background,
        modifier = Modifier.fillMaxSize(),
    ) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Box(
                Modifier.fillMaxSize().background(
                    Brush.radialGradient(
                        listOf(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f), Color.Transparent),
                        radius = 800f,
                    ),
                ),
            )

            AnimatedContent(
                targetState = step,
                transitionSpec = {
                    (fadeIn(spring(stiffness = 400f)) + scaleIn(spring(stiffness = 400f), initialScale = 0.96f))
                        .togetherWith(fadeOut(spring(stiffness = 400f)) + scaleOut(spring(stiffness = 400f), targetScale = 1.04f))
                },
                label = "welcomeSteps",
                modifier = Modifier.widthIn(max = 760.dp).fillMaxWidth().padding(horizontal = 24.dp, vertical = 20.dp),
            ) { currentStep ->
                when (currentStep) {
                    OnboardingStep.LANGUAGE -> LanguageStep(
                        selected = selectedLanguage,
                        onSelect = { selectedLanguage = it },
                        onNext = { step = OnboardingStep.ARTISTS },
                    )
                    OnboardingStep.ARTISTS -> ArtistsStep(
                        picks = pickedArtists,
                        onToggle = { artist ->
                            if (pickedArtists.any { it.id == artist.id }) {
                                pickedArtists.removeAll { it.id == artist.id }
                            } else {
                                pickedArtists.add(artist)
                            }
                        },
                        onBack = { step = OnboardingStep.LANGUAGE },
                        onNext = { step = OnboardingStep.LOOK },
                        onSkip = { step = OnboardingStep.LOOK },
                    )
                    OnboardingStep.LOOK -> LookStep(
                        onBack = { step = OnboardingStep.ARTISTS },
                        onNext = { step = OnboardingStep.READY },
                    )
                    OnboardingStep.READY -> ReadyStep(
                        picksCount = pickedArtists.size,
                        onFinish = {
                            WelcomeManager.finish()
                            onDone()
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun LanguageStep(
    selected: String,
    onSelect: (String) -> Unit,
    onNext: () -> Unit,
) {
    val languages = listOf(
        "English" to "English (Default)",
        "हिन्दी" to "Hindi",
        "ਪੰਜਾਬੀ" to "Punjabi",
        "Español" to "Spanish",
        "Français" to "French",
        "Deutsch" to "German",
    )

    Column(
        Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Box(
            Modifier.size(60.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Rounded.Language, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(32.dp))
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Choose your language", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("भाषा चुनें • Select your preferred language", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxWidth().height(220.dp),
        ) {
            items(languages) { (native, eng) ->
                val isSelected = selected == native
                Surface(
                    color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainer,
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(
                        if (isSelected) 2.dp else 1.dp,
                        if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f),
                    ),
                    modifier = Modifier.clip(RoundedCornerShape(16.dp)).clickable { onSelect(native) },
                ) {
                    Row(
                        Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column {
                            Text(native, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            Text(eng, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        if (isSelected) {
                            Icon(Icons.Rounded.Check, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                        }
                    }
                }
            }
        }

        Button(
            onClick = onNext,
            shape = RoundedCornerShape(24.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
            modifier = Modifier.widthIn(min = 220.dp).height(48.dp),
        ) {
            Text("Continue", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            Spacer(Modifier.width(8.dp))
            Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun ArtistsStep(
    picks: List<WelcomeArtist>,
    onToggle: (WelcomeArtist) -> Unit,
    onBack: () -> Unit,
    onNext: () -> Unit,
    onSkip: () -> Unit,
) {
    var query by remember { mutableStateOf("") }
    var searchResults by remember { mutableStateOf<List<WelcomeArtist>?>(null) }

    LaunchedEffect(query) {
        val q = query.trim()
        if (q.isEmpty()) {
            searchResults = null
            return@LaunchedEffect
        }
        delay(300)
        withContext(Dispatchers.IO) {
            val found = runCatching {
                val resp = Innertube.search(q, SearchFilter.ARTISTS.params)
                val rows = InnertubeParser.parseSearchPage(resp).rows
                rows.mapNotNull { (it as? SearchResult.Browse)?.item }
                    .filter { it.type == BrowseType.ARTIST }
                    .map { WelcomeArtist(it.browseId, it.title, it.thumbnailUrl.orEmpty()) }
            }.getOrDefault(emptyList())
            searchResults = found
        }
    }

    val displayArtists = searchResults ?: POPULAR_ARTISTS

    Column(
        Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
            }
            Text("Step 2 of 3", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            TextButton(onClick = onSkip) {
                Text("Skip", fontWeight = FontWeight.SemiBold)
            }
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Pick artists you like", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("Personalize your music feed and mixes", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text("Search any artist (e.g. Arijit Singh, Sidhu Moose Wala, Diljit)") },
            leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
            trailingIcon = {
                if (query.isNotEmpty()) {
                    IconButton(onClick = { query = "" }) {
                        Icon(Icons.Rounded.Close, contentDescription = "Clear")
                    }
                }
            },
            singleLine = true,
            shape = RoundedCornerShape(20.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = MaterialTheme.colorScheme.surfaceContainer,
                unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainer,
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = Color.Transparent,
            ),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
        )

        LazyVerticalGrid(
            columns = GridCells.Adaptive(110.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(8.dp),
            modifier = Modifier.fillMaxWidth().height(360.dp),
        ) {
            items(displayArtists, key = { it.id }) { artist ->
                val isPicked = picks.any { it.id == artist.id }
                val scale by animateFloatAsState(if (isPicked) 0.92f else 1f, spring(dampingRatio = 0.6f, stiffness = 400f))
                val ringColor by animateColorAsState(if (isPicked) MaterialTheme.colorScheme.primary else Color.Transparent)

                Column(
                    Modifier.clip(RoundedCornerShape(16.dp)).clickable { onToggle(artist) }.padding(6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Box(
                        Modifier.size(86.dp).graphicsLayer { scaleX = scale; scaleY = scale },
                        contentAlignment = Alignment.Center,
                    ) {
                        Box(
                            Modifier.fillMaxSize().border(3.dp, ringColor, CircleShape).padding(4.dp)
                                .clip(CircleShape).background(MaterialTheme.colorScheme.surfaceContainerHigh),
                            contentAlignment = Alignment.Center,
                        ) {
                            if (artist.photo.isNotBlank()) {
                                Artwork(url = artist.photo, size = 86.dp, shape = CircleShape)
                            } else {
                                Text(artist.name.take(1).uppercase(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            }
                        }

                        if (isPicked) {
                            Box(
                                Modifier.align(Alignment.BottomEnd).size(24.dp)
                                    .clip(CircleShape).background(MaterialTheme.colorScheme.primary),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(Icons.Rounded.Check, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(16.dp))
                            }
                        }
                    }

                    Text(
                        artist.name,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = if (isPicked) FontWeight.Bold else FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }

        Button(
            onClick = onNext,
            shape = RoundedCornerShape(24.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
            modifier = Modifier.widthIn(min = 220.dp).height(48.dp),
        ) {
            Text(
                if (picks.isNotEmpty()) "Continue (${picks.size} picked)" else "Continue",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.width(8.dp))
            Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun LookStep(
    onBack: () -> Unit,
    onNext: () -> Unit,
) {
    val ui by AppSettings.ui.collectAsState()
    val themeSettings by AppSettings.theme.collectAsState()
    val isDark = themeSettings.mode == ThemeMode.DARK || themeSettings.mode == ThemeMode.SYSTEM

    Column(
        Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
            }
            Text("Step 3 of 3", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.width(48.dp))
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Choose a look", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("Tailor the appearance of Loopd on your display", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ThemeOption(
                title = "Dark",
                icon = Icons.Rounded.DarkMode,
                isSelected = isDark && !themeSettings.pureBlack,
                onClick = { AppSettings.updateTheme { it.copy(mode = ThemeMode.DARK, pureBlack = false) } },
                modifier = Modifier.weight(1f),
            )
            ThemeOption(
                title = "Pure Black",
                icon = Icons.Rounded.DarkMode,
                isSelected = themeSettings.pureBlack,
                onClick = { AppSettings.updateTheme { it.copy(mode = ThemeMode.DARK, pureBlack = true) } },
                modifier = Modifier.weight(1f),
            )
            ThemeOption(
                title = "Light",
                icon = Icons.Rounded.LightMode,
                isSelected = themeSettings.mode == ThemeMode.LIGHT && !themeSettings.pureBlack,
                onClick = { AppSettings.updateTheme { it.copy(mode = ThemeMode.LIGHT, pureBlack = false) } },
                modifier = Modifier.weight(1f),
            )
        }

        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ThemeOption(
                title = "Liquid Glass",
                icon = Icons.Rounded.AutoAwesome,
                isSelected = ui.liquidGlass,
                onClick = { AppSettings.updateUi { it.copy(liquidGlass = true) } },
                modifier = Modifier.weight(1f),
            )
            ThemeOption(
                title = "Frosted Glass",
                icon = Icons.Rounded.Palette,
                isSelected = !ui.liquidGlass,
                onClick = { AppSettings.updateUi { it.copy(liquidGlass = false) } },
                modifier = Modifier.weight(1f),
            )
        }

        Surface(
            color = MaterialTheme.colorScheme.surfaceContainerLow,
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        ) {
            Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Live Interface Preview", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Box(Modifier.width(360.dp), contentAlignment = Alignment.Center) {
                    BottomChrome(
                        inline = false,
                        tabs = listOf(
                            ChromeTab("Home", Icons.Rounded.Home, Icons.Rounded.Home),
                            ChromeTab("Explore", Icons.Rounded.Explore, Icons.Rounded.Explore),
                            ChromeTab("Library", Icons.Rounded.LibraryMusic, Icons.Rounded.LibraryMusic),
                        ),
                        selected = 0,
                        onSelect = {},
                        onExpand = {},
                        searchSelected = false,
                        onSearch = {},
                        mini = null,
                    )
                }
            }
        }

        Button(
            onClick = onNext,
            shape = RoundedCornerShape(24.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
            modifier = Modifier.widthIn(min = 220.dp).height(48.dp),
        ) {
            Text("Done", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            Spacer(Modifier.width(8.dp))
            Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun ThemeOption(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainer,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(if (isSelected) 2.dp else 1.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)),
        modifier = modifier.clip(RoundedCornerShape(16.dp)).clickable(onClick = onClick),
    ) {
        Column(
            Modifier.padding(vertical = 14.dp, horizontal = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(icon, contentDescription = null, tint = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
            Text(title, style = MaterialTheme.typography.labelLarge, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium)
        }
    }
}

@Composable
private fun ReadyStep(
    picksCount: Int,
    onFinish: () -> Unit,
) {
    Column(
        Modifier.fillMaxWidth().padding(vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        Box(
            Modifier.size(90.dp).shadow(24.dp, CircleShape, ambientColor = MaterialTheme.colorScheme.primary, spotColor = MaterialTheme.colorScheme.primary)
                .clip(CircleShape).background(MaterialTheme.colorScheme.primary),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Rounded.PlayArrow, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(52.dp))
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("You're all set!", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
            Text(
                if (picksCount > 0) "Loopd has personalized your mixes with your $picksCount favorite artists." else "Loopd is ready with millions of songs in lossless audio.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.widthIn(max = 480.dp),
            )
        }

        Spacer(Modifier.height(8.dp))

        Button(
            onClick = onFinish,
            shape = RoundedCornerShape(28.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
            modifier = Modifier.width(260.dp).height(56.dp),
        ) {
            Text("Start Listening", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.width(8.dp))
            Icon(Icons.AutoMirrored.Rounded.ArrowForward, contentDescription = null, modifier = Modifier.size(20.dp))
        }
    }
}

