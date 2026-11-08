package com.opentune.desktop.data

import com.opentune.data.model.Song
import java.io.File
import java.sql.Connection
import java.sql.DriverManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable

/**
 * SQLite database store for Liked songs, play history, and user playlists.
 */
object Library {
    @Serializable
    data class Playlist(val id: String, val name: String, val songs: List<Song> = emptyList())

    private val dbDir = File(System.getProperty("user.home"), ".loopd").apply { mkdirs() }
    private val dbFile = File(dbDir, "library.db")
    private val db: Connection = DriverManager.getConnection("jdbc:sqlite:${dbFile.absolutePath}").also { initSchema(it) }

    private val _liked = MutableStateFlow<List<Song>>(emptyList())
    val liked: StateFlow<List<Song>> = _liked.asStateFlow()

    private val _recent = MutableStateFlow<List<Song>>(emptyList())
    val recent: StateFlow<List<Song>> = _recent.asStateFlow()

    private val _playlists = MutableStateFlow<List<Playlist>>(emptyList())
    val playlists: StateFlow<List<Playlist>> = _playlists.asStateFlow()

    init {
        reload()
    }

    private fun initSchema(conn: Connection) {
        conn.createStatement().use { stmt ->
            stmt.execute(
                """
                CREATE TABLE IF NOT EXISTS liked (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    artist TEXT NOT NULL,
                    cover TEXT,
                    length TEXT,
                    liked_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS history (
                    id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    artist TEXT NOT NULL,
                    cover TEXT,
                    length TEXT,
                    played_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS playlists (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS playlist_items (
                    playlist_id TEXT NOT NULL,
                    id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    artist TEXT NOT NULL,
                    cover TEXT,
                    length TEXT,
                    position INTEGER NOT NULL
                );
                """.trimIndent()
            )
        }
    }

    @Synchronized
    fun reload() {
        // Load liked
        val likedList = mutableListOf<Song>()
        db.createStatement().use { stmt ->
            val rs = stmt.executeQuery("SELECT id, title, artist, cover, length FROM liked ORDER BY liked_at DESC")
            while (rs.next()) {
                likedList.add(Song(rs.getString("id"), rs.getString("title"), rs.getString("artist"), rs.getString("cover"), rs.getString("length")))
            }
        }
        _liked.value = likedList

        // Load recent history
        val recentList = mutableListOf<Song>()
        db.createStatement().use { stmt ->
            val rs = stmt.executeQuery("SELECT id, title, artist, cover, length FROM history ORDER BY played_at DESC LIMIT 60")
            while (rs.next()) {
                recentList.add(Song(rs.getString("id"), rs.getString("title"), rs.getString("artist"), rs.getString("cover"), rs.getString("length")))
            }
        }
        _recent.value = recentList
    }

    @Synchronized
    fun setLiked(song: Song, like: Boolean) {
        if (like) {
            val ps = db.prepareStatement("INSERT OR REPLACE INTO liked (id, title, artist, cover, length, liked_at) VALUES (?, ?, ?, ?, ?, ?)")
            ps.setString(1, song.videoId)
            ps.setString(2, song.title)
            ps.setString(3, song.artist)
            ps.setString(4, song.thumbnailUrl)
            ps.setString(5, song.durationText)
            ps.setLong(6, System.currentTimeMillis())
            ps.executeUpdate()
        } else {
            val ps = db.prepareStatement("DELETE FROM liked WHERE id = ?")
            ps.setString(1, song.videoId)
            ps.executeUpdate()
        }
        reload()
    }

    fun isLiked(songId: String): Boolean = _liked.value.any { it.videoId == songId }

    @Synchronized
    fun recordPlay(song: Song) {
        val ps = db.prepareStatement("INSERT INTO history (id, title, artist, cover, length, played_at) VALUES (?, ?, ?, ?, ?, ?)")
        ps.setString(1, song.videoId)
        ps.setString(2, song.title)
        ps.setString(3, song.artist)
        ps.setString(4, song.thumbnailUrl)
        ps.setString(5, song.durationText)
        ps.setLong(6, System.currentTimeMillis())
        ps.executeUpdate()
        reload()
    }
}

