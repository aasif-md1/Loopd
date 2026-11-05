package com.opentune.ui.components

import android.content.Context
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.graphics.Path
import com.opentune.ui.settings.AppIcon
import kotlin.math.cos
import kotlin.math.sin

/**
 * The Loopd brand mark in standard adaptive icon 108 by 108 viewport space.
 * Provides custom, authentic vector representations for each of the 6 app icons,
 * completely replacing the legacy single-wave mark.
 */
internal const val MARK_VIEWPORT = 108f

// Standard bounds in 108-unit space for MarkRefresh, ShareCard and icon framing
internal const val MARK_LEFT = 24.5f
internal const val MARK_RIGHT = 83.5f
internal const val MARK_TOP = 24.5f
internal const val MARK_BOTTOM = 83.5f

/** Cached paths for each icon so they are built once and reused. */
private val iconPathCache = mutableMapOf<AppIcon, Path>()

/** The mark as a Compose [Path] for the active icon in [MARK_VIEWPORT] units. */
internal fun markPath(icon: AppIcon = AppIcon.current): Path {
    return iconPathCache.getOrPut(icon) { createIconPath(icon) }
}

/** Overload to resolve active icon from context. */
internal fun markPath(context: Context): Path {
    return markPath(AppIcon.selected(context))
}

/**
 * Creates the authentic vector geometry for each of the 6 icons in 108x108 space,
 * centered at (54, 54).
 */
private fun createIconPath(icon: AppIcon): Path = when (icon) {
    AppIcon.LooPd -> createLoopdPath()
    AppIcon.PULSE -> createPulsePath()
    AppIcon.FLOW -> createFlowPath()
    AppIcon.AXIS -> createAxisPath()
    AppIcon.TUNE -> createTunePath()
    AppIcon.ORBIT -> createOrbitPath()
}

/**
 * LooPd: Concentric circular sound ripple dots radiating from a central core.
 */
private fun createLoopdPath(): Path = Path().apply {
    val cx = 54f
    val cy = 54f
    // Central core
    addOval(Rect(cx - 3.2f, cy - 3.2f, cx + 3.2f, cy + 3.2f))

    // Tier 1: 8 nodes, radius 8.0
    val tier1Count = 8
    val r1 = 8.0f
    for (i in 0 until tier1Count) {
        val angle = i * (2 * Math.PI / tier1Count)
        val x = cx + (r1 * cos(angle)).toFloat()
        val y = cy + (r1 * sin(angle)).toFloat()
        addOval(Rect(x - 1.6f, y - 1.6f, x + 1.6f, y + 1.6f))
    }

    // Tier 2: 12 nodes, radius 14.5
    val tier2Count = 12
    val r2 = 14.5f
    for (i in 0 until tier2Count) {
        val angle = (i + 0.5) * (2 * Math.PI / tier2Count)
        val x = cx + (r2 * cos(angle)).toFloat()
        val y = cy + (r2 * sin(angle)).toFloat()
        addOval(Rect(x - 1.9f, y - 1.9f, x + 1.9f, y + 1.9f))
    }

    // Tier 3: 16 nodes, radius 21.0
    val tier3Count = 16
    val r3 = 21.0f
    for (i in 0 until tier3Count) {
        val angle = i * (2 * Math.PI / tier3Count)
        val x = cx + (r3 * cos(angle)).toFloat()
        val y = cy + (r3 * sin(angle)).toFloat()
        addOval(Rect(x - 2.2f, y - 2.2f, x + 2.2f, y + 2.2f))
    }

    // Tier 4: 20 nodes, radius 27.5
    val tier4Count = 20
    val r4 = 27.5f
    for (i in 0 until tier4Count) {
        val angle = (i + 0.5) * (2 * Math.PI / tier4Count)
        val x = cx + (r4 * cos(angle)).toFloat()
        val y = cy + (r4 * sin(angle)).toFloat()
        addOval(Rect(x - 2.4f, y - 2.4f, x + 2.4f, y + 2.4f))
    }
}

/**
 * PULSE: Symmetrical dynamic equalizer frequency bars with center acoustic contour.
 */
private fun createPulsePath(): Path = Path().apply {
    val barWidth = 2.6f
    val barRadius = CornerRadius(1.3f, 1.3f)
    val bars = listOf(
        Triple(26f, 48f, 60f),
        Triple(31f, 42f, 66f),
        Triple(36f, 38f, 70f),
        Triple(41f, 36f, 72f),
        Triple(46f, 40f, 68f),
        Triple(50f, 47f, 61f),
        Triple(54f, 49f, 59f),
        Triple(58f, 47f, 61f),
        Triple(62f, 40f, 68f),
        Triple(67f, 36f, 72f),
        Triple(72f, 38f, 70f),
        Triple(77f, 42f, 66f),
        Triple(82f, 48f, 60f),
    )
    for ((x, top, bottom) in bars) {
        addRoundRect(RoundRect(x - barWidth / 2f, top, x + barWidth / 2f, bottom, barRadius))
    }
}

/**
 * FLOW: Smooth flowing continuous infinity acoustic ribbon (∞).
 */
private fun createFlowPath(): Path = Path().apply {
    moveTo(54f, 54f)
    cubicTo(45f, 41f, 34f, 38f, 26f, 46f)
    cubicTo(18f, 54f, 20f, 66f, 32f, 69f)
    cubicTo(43f, 71f, 49f, 61f, 54f, 54f)
    cubicTo(59f, 47f, 65f, 37f, 76f, 39f)
    cubicTo(88f, 42f, 90f, 54f, 82f, 62f)
    cubicTo(74f, 70f, 63f, 67f, 54f, 54f)
    close()

    moveTo(38f, 54f)
    cubicTo(38f, 48f, 33f, 45f, 29f, 49f)
    cubicTo(25f, 53f, 27f, 59f, 31f, 61f)
    cubicTo(35f, 62f, 38f, 59f, 38f, 54f)
    close()

    moveTo(70f, 54f)
    cubicTo(70f, 49f, 75f, 46f, 79f, 50f)
    cubicTo(83f, 54f, 81f, 60f, 77f, 62f)
    cubicTo(73f, 63f, 70f, 59f, 70f, 54f)
    close()
}

/**
 * AXIS: Precision architectural orthogonal frame with anchored focal disc.
 */
private fun createAxisPath(): Path = Path().apply {
    moveTo(34f, 34f)
    cubicTo(34f, 32f, 36f, 31f, 38f, 31f)
    lineTo(44f, 31f)
    cubicTo(45.5f, 31f, 46f, 32f, 46f, 34f)
    lineTo(46f, 65f)
    lineTo(72f, 65f)
    cubicTo(73.5f, 65f, 74f, 66f, 74f, 68f)
    lineTo(74f, 74f)
    cubicTo(74f, 75.5f, 73.5f, 76f, 72f, 76f)
    lineTo(38f, 76f)
    cubicTo(35f, 76f, 34f, 74.5f, 34f, 72f)
    close()

    addOval(Rect(44.5f, 44.5f, 63.5f, 63.5f))
}

/**
 * TUNE: Acoustic headphone bridge arch with acoustic driver stems.
 */
private fun createTunePath(): Path = Path().apply {
    moveTo(30f, 56f)
    cubicTo(30f, 35f, 41f, 25f, 54f, 25f)
    cubicTo(67f, 25f, 78f, 35f, 78f, 56f)
    lineTo(78f, 77f)
    cubicTo(78f, 81f, 74f, 83f, 70f, 83f)
    cubicTo(66f, 83f, 63f, 80f, 63f, 76f)
    lineTo(63f, 56f)
    cubicTo(63f, 42f, 59f, 36f, 54f, 36f)
    cubicTo(49f, 36f, 45f, 42f, 45f, 56f)
    lineTo(45f, 76f)
    cubicTo(45f, 80f, 42f, 83f, 38f, 83f)
    cubicTo(34f, 83f, 30f, 81f, 30f, 77f)
    close()
}

/**
 * ORBIT: Digital satellite constellation diamond matrix.
 */
private fun createOrbitPath(): Path = Path().apply {
    val cx = 54f
    val cy = 54f

    fun addDiamond(x: Float, y: Float, size: Float) {
        val s = size / 2f
        moveTo(x, y - s)
        lineTo(x + s, y)
        lineTo(x, y + s)
        lineTo(x - s, y)
        close()
    }

    addDiamond(cx, cy, 9.5f)

    val rInner = 14.5f
    addDiamond(cx, cy - rInner, 6.5f)
    addDiamond(cx + rInner, cy, 6.5f)
    addDiamond(cx, cy + rInner, 6.5f)
    addDiamond(cx - rInner, cy, 6.5f)

    val rDiag = 10.5f
    addDiamond(cx + rDiag, cy - rDiag, 5.5f)
    addDiamond(cx + rDiag, cy + rDiag, 5.5f)
    addDiamond(cx - rDiag, cy + rDiag, 5.5f)
    addDiamond(cx - rDiag, cy - rDiag, 5.5f)

    val rOuter = 26.0f
    addDiamond(cx, cy - rOuter, 5.0f)
    addDiamond(cx + rOuter, cy, 5.0f)
    addDiamond(cx, cy + rOuter, 5.0f)
    addDiamond(cx - rOuter, cy, 5.0f)

    val rOuterDiag = 19.5f
    addDiamond(cx + rOuterDiag, cy - rOuterDiag, 4.5f)
    addDiamond(cx + rOuterDiag, cy + rOuterDiag, 4.5f)
    addDiamond(cx - rOuterDiag, cy + rOuterDiag, 4.5f)
    addDiamond(cx - rOuterDiag, cy - rOuterDiag, 4.5f)
}
