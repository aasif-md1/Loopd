package com.opentune.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.core.content.res.ResourcesCompat
import androidx.core.graphics.drawable.toBitmap
import com.opentune.ui.settings.AppIcon
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.sin
import kotlinx.coroutines.delay

/** Plays once per launch of the app, not each time the screen is rebuilt. */
object Opening {
    var played = false
}

/** The opening splash black field. */
val OPENING_FIELD = Color.Black

/**
 * OpeningReveal takes over seamlessly from the Android system splash screen.
 * Uses the 100% authentic app icon foreground drawable with zero shape distortion,
 * breathes smoothly, then dives through the logo aperture into the main app interface.
 */
@Composable
fun OpeningReveal(onDive: (Float) -> Unit, onDone: () -> Unit) {
    val context = LocalContext.current
    val activeIcon = remember { AppIcon.selected(context) }

    // Load the 100% authentic foreground drawable matching the launcher icon
    val imageBitmap = remember(activeIcon) {
        val drawable = ResourcesCompat.getDrawable(context.resources, activeIcon.foregroundRes, context.theme)
        drawable?.toBitmap(512, 512)?.asImageBitmap()
    }

    val settle = remember { Animatable(0f) }
    val dive = remember { Animatable(0f) }
    val done by rememberUpdatedState(onDone)
    val report by rememberUpdatedState(onDive)

    LaunchedEffect(Unit) {
        // Phase 1: Logo settles with a smooth organic breath
        settle.animateTo(1f, tween(SETTLE_MS, easing = CubicBezierEasing(0.2f, 0f, 0f, 1f)))
        delay(HOLD_MS)
        // Phase 2: Exponential dive into the true logo aperture
        dive.animateTo(1f, tween(DIVE_MS, easing = CubicBezierEasing(0.6f, 0f, 0.85f, 0.35f))) {
            report(value)
        }
        report(1f)
        done()
    }

    Canvas(
        Modifier
            .fillMaxSize()
            // Offscreen layer enables DstOut blend mode to punch an aperture through the field
            .graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen },
    ) {
        val d = dive.value
        val st = settle.value

        val fieldColor = if (activeIcon.isDark) Color.Black else Color.White
        val markColor = if (activeIcon.isDark) Color.White else Color.Black

        // Android 12+ splash displays the 108dp icon at 240dp across.
        // Starting at exactly 240dp guarantees 100% gapless continuity.
        val basePx = 240.dp.toPx()
        val breathe = 1f + 0.045f * sin(Math.PI.toFloat() * st)
        val currentScale = breathe * exp(ln(ZOOM) * d * d)
        val sizePx = basePx * currentScale
        val left = center.x - sizePx / 2f
        val top = center.y - sizePx / 2f

        val window = smooth(0.04f, 0.28f, d)
        val fade = 1f - smooth(0.8f, 1f, d)

        // 1. Background field
        drawRect(fieldColor, alpha = fade)

        if (imageBitmap != null) {
            val dstOffset = IntOffset(left.toInt(), top.toInt())
            val dstSize = IntSize(sizePx.toInt(), sizePx.toInt())

            // 2. Draw the 100% authentic logo (crisp, zero artifacts, pure fidelity)
            if (window < 1f) {
                drawImage(
                    image = imageBitmap,
                    dstOffset = dstOffset,
                    dstSize = dstSize,
                    alpha = (1f - window).coerceIn(0f, 1f),
                    colorFilter = ColorFilter.tint(markColor),
                )
            }

            // 3. Dive: punch an aperture through the field in the EXACT shape of the real logo
            if (window > 0f) {
                drawImage(
                    image = imageBitmap,
                    dstOffset = dstOffset,
                    dstSize = dstSize,
                    alpha = window,
                    blendMode = BlendMode.DstOut,
                )
            }
        }
    }
}

private fun smooth(from: Float, to: Float, x: Float): Float {
    val t = ((x - from) / (to - from)).coerceIn(0f, 1f)
    return t * t * (3f - 2f * t)
}

private const val SETTLE_MS = 620
private const val HOLD_MS = 120L
private const val DIVE_MS = 900
private const val ZOOM = 90f
