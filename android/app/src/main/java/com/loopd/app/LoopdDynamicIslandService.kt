package com.loopd.app

import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.DisplayMetrics
import android.util.TypedValue
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import java.net.URL
import kotlin.concurrent.thread

class LoopdDynamicIslandService : Service() {

    private var windowManager: WindowManager? = null
    private var islandRootView: View? = null
    private var isExpanded = false
    private var isPlaying = false
    private var currentTitle: String = ""
    private var currentArtist: String = ""
    private var currentArtworkUrl: String? = null

    // Views
    private var artworkView: ImageView? = null
    private var titleView: TextView? = null
    private var artistView: TextView? = null
    private var playPauseBtn: ImageView? = null
    private var nextBtn: ImageView? = null
    private var prevBtn: ImageView? = null
    private var waveBar1: View? = null
    private var waveBar2: View? = null
    private var waveBar3: View? = null
    private var waveAnimator: ValueAnimator? = null
    private var artworkRotation: ObjectAnimator? = null

    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) return START_NOT_STICKY

        val action = intent.action ?: ACTION_SHOW
        when (action) {
            ACTION_SHOW -> {
                val title = intent.getStringExtra(EXTRA_TITLE) ?: "Now Playing"
                val artist = intent.getStringExtra(EXTRA_ARTIST) ?: "Loopd Music"
                val artwork = intent.getStringExtra(EXTRA_ARTWORK)
                val playing = intent.getBooleanExtra(EXTRA_IS_PLAYING, true)
                showIsland(title, artist, artwork, playing)
            }
            ACTION_UPDATE -> {
                val title = intent.getStringExtra(EXTRA_TITLE) ?: currentTitle
                val artist = intent.getStringExtra(EXTRA_ARTIST) ?: currentArtist
                val artwork = intent.getStringExtra(EXTRA_ARTWORK) ?: currentArtworkUrl
                val playing = intent.getBooleanExtra(EXTRA_IS_PLAYING, isPlaying)
                updateIsland(title, artist, artwork, playing)
            }
            ACTION_HIDE -> {
                hideIsland()
            }
        }

        return START_NOT_STICKY
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun showIsland(title: String, artist: String, artworkUrl: String?, playing: Boolean) {
        if (!Settings.canDrawOverlays(this)) {
            return
        }

        currentTitle = title
        currentArtist = artist
        currentArtworkUrl = artworkUrl
        isPlaying = playing

        if (islandRootView != null) {
            updateIsland(title, artist, artworkUrl, playing)
            return
        }

        val displayMetrics = resources.displayMetrics
        val screenWidth = displayMetrics.widthPixels

        // Determine camera cutout / status bar position
        var topMargin = dpToPx(12)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            // DisplayCutout info
            try {
                val resId = resources.getIdentifier("status_bar_height", "dimen", "android")
                if (resId > 0) {
                    val sbHeight = resources.getDimensionPixelSize(resId)
                    topMargin = (sbHeight - dpToPx(38)).coerceAtLeast(dpToPx(6))
                }
            } catch (_: Exception) {}
        }

        val windowParams = WindowManager.LayoutParams().apply {
            width = WindowManager.LayoutParams.WRAP_CONTENT
            height = WindowManager.LayoutParams.WRAP_CONTENT
            type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }
            flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
            format = PixelFormat.TRANSLUCENT
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = topMargin
        }

        // Build Dynamic Island view hierarchy programmatically
        val pillContainer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dpToPx(6), dpToPx(5), dpToPx(12), dpToPx(5))

            // Apple Dynamic Island pure obsidian black background with curved edges
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpToPx(24).toFloat()
                setColor(Color.parseColor("#000000"))
                setStroke(dpToPx(1), Color.parseColor("#222834"))
            }
            elevation = dpToPx(12).toFloat()
        }

        // Artwork circular thumbnail
        val artFrame = FrameLayout(this)
        val artSize = dpToPx(34)
        val artView = ImageView(this).apply {
            scaleType = ImageView.ScaleType.CENTER_CROP
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#12151C"))
            }
            clipToOutline = true
            setImageResource(R.mipmap.ic_launcher_round)
        }
        artFrame.addView(artView, FrameLayout.LayoutParams(artSize, artSize))
        artworkView = artView
        pillContainer.addView(artFrame, LinearLayout.LayoutParams(artSize, artSize).apply {
            marginEnd = dpToPx(8)
        })

        // Title & Artist Column
        val infoCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val titleTv = TextView(this).apply {
            text = title
            setTextColor(Color.WHITE)
            textSize = 12.5f
            isSingleLine = true
            maxLines = 1
            paint.isFakeBoldText = true
            maxWidth = (screenWidth * 0.38f).toInt()
        }
        titleView = titleTv
        infoCol.addView(titleTv)

        val artistRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        // Animated sound visualizer bars inside pill
        val waveRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val b1 = View(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpToPx(1).toFloat()
                setColor(Color.parseColor("#1ED760"))
            }
        }
        val b2 = View(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpToPx(1).toFloat()
                setColor(Color.parseColor("#1ED760"))
            }
        }
        val b3 = View(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpToPx(1).toFloat()
                setColor(Color.parseColor("#1ED760"))
            }
        }
        waveBar1 = b1
        waveBar2 = b2
        waveBar3 = b3
        waveRow.addView(b1, LinearLayout.LayoutParams(dpToPx(2), dpToPx(6)).apply { marginEnd = dpToPx(2) })
        waveRow.addView(b2, LinearLayout.LayoutParams(dpToPx(2), dpToPx(10)).apply { marginEnd = dpToPx(2) })
        waveRow.addView(b3, LinearLayout.LayoutParams(dpToPx(2), dpToPx(7)))
        artistRow.addView(waveRow, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            dpToPx(10)
        ).apply {
            marginEnd = dpToPx(5)
        })

        val artistTv = TextView(this).apply {
            text = artist
            setTextColor(Color.parseColor("#94A3B8"))
            textSize = 10.5f
            isSingleLine = true
            maxLines = 1
            maxWidth = (screenWidth * 0.35f).toInt()
        }
        artistView = artistTv
        artistRow.addView(artistTv)
        infoCol.addView(artistRow)

        pillContainer.addView(infoCol, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            weight = 1f
            marginEnd = dpToPx(8)
        })

        // Previous Track Button (visible in expanded, subtle in compact)
        val prevSize = dpToPx(28)
        val prevIv = ImageView(this).apply {
            setPadding(dpToPx(4), dpToPx(4), dpToPx(4), dpToPx(4))
            setImageResource(android.R.drawable.ic_media_previous)
            setColorFilter(Color.WHITE)
            visibility = View.GONE // Show in expanded
            setOnClickListener {
                LoopdDynamicIslandModule.emitRemoteAction("previous")
            }
        }
        prevBtn = prevIv
        pillContainer.addView(prevIv, LinearLayout.LayoutParams(prevSize, prevSize).apply {
            marginEnd = dpToPx(4)
        })

        // Play / Pause Button
        val playSize = dpToPx(32)
        val playIv = ImageView(this).apply {
            setPadding(dpToPx(5), dpToPx(5), dpToPx(5), dpToPx(5))
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#1ED760"))
            }
            setImageResource(if (playing) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play)
            setColorFilter(Color.BLACK)
            setOnClickListener {
                isPlaying = !isPlaying
                updatePlayPauseIcon()
                LoopdDynamicIslandModule.emitRemoteAction("playPause")
            }
        }
        playPauseBtn = playIv
        pillContainer.addView(playIv, LinearLayout.LayoutParams(playSize, playSize).apply {
            marginEnd = dpToPx(2)
        })

        // Next Track Button
        val nextSize = dpToPx(28)
        val nextIv = ImageView(this).apply {
            setPadding(dpToPx(4), dpToPx(4), dpToPx(4), dpToPx(4))
            setImageResource(android.R.drawable.ic_media_next)
            setColorFilter(Color.WHITE)
            setOnClickListener {
                LoopdDynamicIslandModule.emitRemoteAction("next")
            }
        }
        nextBtn = nextIv
        pillContainer.addView(nextIv, LinearLayout.LayoutParams(nextSize, nextSize).apply {
            marginStart = dpToPx(4)
        })

        // Click on island body to bring Loopd to foreground
        pillContainer.setOnClickListener {
            bringAppToForeground()
        }

        // Long press to expand / collapse
        pillContainer.setOnLongClickListener {
            toggleExpandedView()
            true
        }

        islandRootView = pillContainer

        try {
            windowManager?.addView(pillContainer, windowParams)
            loadArtwork(artworkUrl)
            startWaveAnimation()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun updateIsland(title: String, artist: String, artworkUrl: String?, playing: Boolean) {
        if (islandRootView == null) {
            showIsland(title, artist, artworkUrl, playing)
            return
        }

        currentTitle = title
        currentArtist = artist
        currentArtworkUrl = artworkUrl
        isPlaying = playing

        mainHandler.post {
            titleView?.text = title
            artistView?.text = artist
            updatePlayPauseIcon()
            loadArtwork(artworkUrl)
            if (playing) {
                startWaveAnimation()
            } else {
                stopWaveAnimation()
            }
        }
    }

    private fun updatePlayPauseIcon() {
        playPauseBtn?.setImageResource(
            if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
        )
    }

    private fun hideIsland() {
        mainHandler.post {
            try {
                stopWaveAnimation()
                if (islandRootView != null) {
                    windowManager?.removeView(islandRootView)
                    islandRootView = null
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun toggleExpandedView() {
        isExpanded = !isExpanded
        prevBtn?.visibility = if (isExpanded) View.VISIBLE else View.GONE
    }

    private fun bringAppToForeground() {
        try {
            val launchIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            }
            startActivity(launchIntent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun loadArtwork(urlStr: String?) {
        if (urlStr.isNullOrEmpty()) {
            artworkView?.setImageResource(R.mipmap.ic_launcher_round)
            return
        }
        thread {
            try {
                val url = URL(urlStr)
                val bmp: Bitmap? = BitmapFactory.decodeStream(url.openConnection().getInputStream())
                if (bmp != null) {
                    mainHandler.post {
                        artworkView?.setImageBitmap(bmp)
                    }
                }
            } catch (_: Exception) {}
        }
    }

    private fun startWaveAnimation() {
        if (waveAnimator != null) return
        waveAnimator = ValueAnimator.ofFloat(0.3f, 1f).apply {
            duration = 450
            repeatMode = ValueAnimator.REVERSE
            repeatCount = ValueAnimator.INFINITE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener { anim ->
                val v = anim.animatedValue as Float
                waveBar1?.scaleY = v
                waveBar2?.scaleY = 1.3f - v * 0.3f
                waveBar3?.scaleY = v * 0.8f + 0.2f
            }
            start()
        }
    }

    private fun stopWaveAnimation() {
        waveAnimator?.cancel()
        waveAnimator = null
        waveBar1?.scaleY = 0.5f
        waveBar2?.scaleY = 0.5f
        waveBar3?.scaleY = 0.5f
    }

    private fun dpToPx(dp: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.toFloat(),
            resources.displayMetrics
        ).toInt()
    }

    override fun onDestroy() {
        hideIsland()
        super.onDestroy()
    }

    companion object {
        const val ACTION_SHOW = "com.loopd.app.DYNAMIC_ISLAND_SHOW"
        const val ACTION_UPDATE = "com.loopd.app.DYNAMIC_ISLAND_UPDATE"
        const val ACTION_HIDE = "com.loopd.app.DYNAMIC_ISLAND_HIDE"

        const val EXTRA_TITLE = "title"
        const val EXTRA_ARTIST = "artist"
        const val EXTRA_ARTWORK = "artwork"
        const val EXTRA_IS_PLAYING = "isPlaying"

        fun show(context: Context, title: String, artist: String, artwork: String?, isPlaying: Boolean) {
            try {
                val intent = Intent(context, LoopdDynamicIslandService::class.java).apply {
                    action = ACTION_SHOW
                    putExtra(EXTRA_TITLE, title)
                    putExtra(EXTRA_ARTIST, artist)
                    putExtra(EXTRA_ARTWORK, artwork)
                    putExtra(EXTRA_IS_PLAYING, isPlaying)
                }
                context.startService(intent)
            } catch (_: Exception) {}
        }

        fun update(context: Context, title: String, artist: String, artwork: String?, isPlaying: Boolean) {
            try {
                val intent = Intent(context, LoopdDynamicIslandService::class.java).apply {
                    action = ACTION_UPDATE
                    putExtra(EXTRA_TITLE, title)
                    putExtra(EXTRA_ARTIST, artist)
                    putExtra(EXTRA_ARTWORK, artwork)
                    putExtra(EXTRA_IS_PLAYING, isPlaying)
                }
                context.startService(intent)
            } catch (_: Exception) {}
        }

        fun hide(context: Context) {
            try {
                val intent = Intent(context, LoopdDynamicIslandService::class.java).apply {
                    action = ACTION_HIDE
                }
                context.startService(intent)
            } catch (_: Exception) {}
        }
    }
}
