package com.opentune.desktop.player

import com.opentune.data.model.Song
import com.opentune.desktop.data.Library
import javafx.application.Platform
import javafx.scene.media.Media
import javafx.scene.media.MediaPlayer
import javafx.util.Duration
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Global audio player engine for Loopd Desktop.
 */
object Player {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var mediaPlayer: MediaPlayer? = null

    private val _currentSong = MutableStateFlow<Song?>(null)
    val currentSong: StateFlow<Song?> = _currentSong.asStateFlow()

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()

    private val _positionMs = MutableStateFlow(0L)
    val positionMs: StateFlow<Long> = _positionMs.asStateFlow()

    private val _durationMs = MutableStateFlow(0L)
    val durationMs: StateFlow<Long> = _durationMs.asStateFlow()

    private val _queue = MutableStateFlow<List<Song>>(emptyList())
    val queue: StateFlow<List<Song>> = _queue.asStateFlow()

    private val _index = MutableStateFlow(0)
    val index: StateFlow<Int> = _index.asStateFlow()

    private val _volume = MutableStateFlow(1f)
    val volume: StateFlow<Float> = _volume.asStateFlow()

    init {
        runCatching { Platform.startup {} }
    }

    fun play(song: Song, newQueue: List<Song>? = null) {
        if (newQueue != null && newQueue.isNotEmpty()) {
            val idx = newQueue.indexOfFirst { it.videoId == song.videoId }.coerceAtLeast(0)
            playAll(newQueue, idx)
        } else {
            val q = _queue.value
            val at = q.indexOfFirst { it.videoId == song.videoId }
            if (at >= 0) {
                playAt(at)
            } else {
                _queue.value = listOf(song) + q
                _index.value = 0
                startSong(song)
            }
        }
    }

    fun playAll(songs: List<Song>, startIndex: Int = 0) {
        if (songs.isEmpty()) return
        _queue.value = songs
        _index.value = startIndex.coerceIn(0, songs.lastIndex)
        startSong(songs[_index.value])
    }

    fun playAt(idx: Int) {
        val q = _queue.value
        if (idx !in q.indices) return
        _index.value = idx
        startSong(q[idx])
    }

    fun togglePlayPause() {
        val player = mediaPlayer ?: return
        Platform.runLater {
            if (_isPlaying.value) {
                player.pause()
                _isPlaying.value = false
            } else {
                player.play()
                _isPlaying.value = true
            }
        }
    }

    fun seekTo(positionMs: Long) {
        mediaPlayer?.let { player ->
            Platform.runLater {
                player.seek(Duration.millis(positionMs.toDouble()))
            }
        }
    }

    fun skipNext() {
        val q = _queue.value
        if (q.isEmpty()) return
        val next = (_index.value + 1) % q.size
        playAt(next)
    }

    fun skipPrevious() {
        val q = _queue.value
        if (q.isEmpty()) return
        val prev = if (_index.value - 1 < 0) q.lastIndex else _index.value - 1
        playAt(prev)
    }

    fun setVolume(vol: Float) {
        val v = vol.coerceIn(0f, 1f)
        _volume.value = v
        mediaPlayer?.let { player ->
            Platform.runLater { player.volume = v.toDouble() }
        }
    }

    private fun startSong(song: Song) {
        _currentSong.value = song
        _isPlaying.value = false
        _positionMs.value = 0L
        Library.recordPlay(song)

        scope.launch {
            val resolved = Streams.resolve(song.videoId)
            if (resolved == null) {
                // If stream cannot be resolved, skip to next after brief pause
                skipNext()
                return@launch
            }

            Platform.runLater {
                try {
                    mediaPlayer?.stop()
                    mediaPlayer?.dispose()

                    val media = Media(resolved.url)
                    val player = MediaPlayer(media)
                    mediaPlayer = player

                    player.volume = _volume.value.toDouble()
                    player.currentTimeProperty().addListener { _, _, cur ->
                        _positionMs.value = cur.toMillis().toLong()
                    }
                    player.totalDurationProperty().addListener { _, _, dur ->
                        if (!dur.isUnknown) _durationMs.value = dur.toMillis().toLong()
                    }
                    player.setOnReady {
                        player.play()
                        _isPlaying.value = true
                    }
                    player.setOnEndOfMedia {
                        skipNext()
                    }
                    player.setOnError {
                        skipNext()
                    }
                } catch (e: Exception) {
                    skipNext()
                }
            }
        }
    }
}

