package com.opentune.desktop.player

import com.opentune.data.Http
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.RequestBody.Companion.toRequestBody
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import org.schabi.newpipe.extractor.stream.AudioStream
import org.schabi.newpipe.extractor.stream.DeliveryMethod

/**
 * Resolves high-quality streaming audio URLs for YouTube Music tracks using NewPipe.
 */
object Streams {
    data class Stream(val url: String, val kbps: Int, val mimeType: String)

    private const val KEEP_MS = 60 * 60 * 1000L
    private val found = ConcurrentHashMap<String, Pair<Long, Stream>>()
    private val gate = Mutex()
    private val init by lazy { NewPipe.init(OkHttpDownloader) }

    suspend fun resolve(videoId: String): Stream? {
        val now = System.currentTimeMillis()
        found[videoId]?.let { (at, s) -> if (now - at < KEEP_MS) return s }

        return gate.withLock {
            found[videoId]?.let { (at, s) -> if (now - at < KEEP_MS) return s }
            withContext(Dispatchers.IO) {
                init
                val service = ServiceList.YouTube
                val extractor = service.getStreamExtractor("https://www.youtube.com/watch?v=$videoId")
                runCatching { extractor.fetchPage() }.getOrNull()
                val streams = runCatching { extractor.audioStreams }.getOrNull().orEmpty()
                val best = streams
                    .filter { it.deliveryMethod == DeliveryMethod.PROGRESSIVE_HTTP }
                    .maxByOrNull { it.averageBitrate }
                    ?: streams.maxByOrNull { it.averageBitrate }

                best?.let {
                    val s = Stream(it.content, it.averageBitrate, it.format?.mimeType.orEmpty())
                    found[videoId] = System.currentTimeMillis() to s
                    s
                }
            }
        }
    }

    private object OkHttpDownloader : Downloader() {
        override fun execute(request: Request): Response {
            val builder = okhttp3.Request.Builder()
                .url(request.url())
                .method(
                    request.httpMethod(),
                    request.dataToSend()?.toRequestBody(null),
                )
            request.headers().forEach { (k, v) -> v.forEach { builder.addHeader(k, it) } }
            val call = Http.client.newBuilder()
                .readTimeout(30, TimeUnit.SECONDS)
                .build()
                .newCall(builder.build())

            val response = call.execute()
            val body = response.body?.string().orEmpty()
            return Response(response.code, response.message, response.headers.toMultimap(), body, response.request.url.toString())
        }
    }
}

