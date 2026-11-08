package com.opentune.data.subsonic

/** Subsonic stub for desktop - desktop uses YouTube Music streaming directly. */
object Subsonic {
    const val PREFIX = "subsonic:"
    fun isSubsonic(id: String): Boolean = id.startsWith(PREFIX)
    fun resolveCover(url: String?): String? = url
    fun coverUri(id: String): String? = null
}

