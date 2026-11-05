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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.opentune.ui.settings.AppIcon
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.sin
import kotlinx.coroutines.delay

/** Plays once per launch of the app, not each time the screen is rebuilt. */
object Opening {
    var played = false
}

/**
 * The Loopd opening reveal transition.
 *
 * Takes over seamlessly from the Android system splash screen at the exact same size,
 * identifies the user's active [AppIcon], executes a bespoke, creative animation tailored
 * specifically to that logo's visual identity, and then dives through the logo aperture
 * into the main app interface.
 *
 * [onDive] reports the dive progress (0 to 1) so the app content behind zooms forward.
 * [onDone] notifies completion to dismiss the reveal overlay.
 */
@Composable
fun OpeningReveal(onDive: (Float) -> Unit, onDone: () -> Unit) {
    val context = LocalContext.current
    val activeIcon = remember { AppIcon.selected(context) }
    val mark = remember(activeIcon) { markPath(activeIcon) }

    val settle = remember { Animatable(0f) }
    val dive = remember { Animatable(0f) }
    val done by rememberUpdatedState(onDone)
    val report by rememberUpdatedState(onDive)

    LaunchedEffect(Unit) {
        // Phase 1: Logo settles and executes its unique thematic animation
        settle.animateTo(1f, tween(SETTLE_MS, easing = CubicBezierEasing(0.2f, 0f, 0f, 1f)))
        delay(HOLD_MS)
        // Phase 2: Exponential dive into the logo window, revealing the app
        dive.animateTo(1f, tween(DIVE_MS, easing = CubicBezierEasing(0.6f, 0f, 0.85f, 0.35f))) {
            report(value)
        }
        report(1f)
        done()
    }

    Canvas(
        Modifier
            .fillMaxSize()
            // Offscreen layer enables DstOut blend mode to punch a window into the app below
            .graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen },
    ) {
        val d = dive.value
        val st = settle.value

        // Colors tailored to the active icon's theme for gapless splash continuation
        val fieldColor = if (activeIcon.isDark) Color.Black else Color.White
        val markColor = if (activeIcon.isDark) Color.White else Color.Black
        val accentGlint = if (activeIcon.isDark) Color(0xFFDADADA) else Color(0xFF303030)

        // The system splash draws the 108-unit icon 240dp across; start exactly there.
        val base = 240.dp.toPx() / MARK_VIEWPORT
        val breathe = 1f + 0.045f * sin(Math.PI.toFloat() * st)
        val s = base * breathe * exp(ln(ZOOM) * d * d)
        val window = smooth(0.04f, 0.28f, d)
        val fade = 1f - smooth(0.8f, 1f, d)

        // Draw the background field that covers the screen
        drawRect(fieldColor, alpha = fade)

        // White/black rim outlining the expanding portal
        val rim = Stroke(width = RIM.toPx() / s, join = StrokeJoin.Round)

        translate(center.x - MARK_VIEWPORT / 2f * s, center.y - MARK_VIEWPORT / 2f * s) {
            scale(s, s, pivot = Offset.Zero) {
                // 1. Draw solid logo mark
                if (window < 1f) {
                    drawPath(mark, markColor, alpha = (1f - window).coerceIn(0f, 1f))
                }

                // 2. Logo-specific bespoke animation layers
                drawBespokeAnimation(
                    icon = activeIcon,
                    st = st,
                    d = d,
                    window = window,
                    fade = fade,
                    s = s,
                    markColor = markColor,
                    accentGlint = accentGlint,
                )

                // 3. Shimmer glint running across the mark during settle
                if (st in 0.05f..0.98f && d == 0f) {
                    val x = -30f + 170f * st
                    drawPath(
                        mark,
                        Brush.linearGradient(
                            listOf(accentGlint.copy(alpha = 0f), accentGlint.copy(alpha = 0.92f), accentGlint.copy(alpha = 0f)),
                            start = Offset(x - 18f, 30f),
                            end = Offset(x + 18f, 78f),
                        ),
                        blendMode = BlendMode.SrcAtop,
                    )
                }

                // 4. Transform mark into an aperture window onto the app
                if (window > 0f) {
                    drawPath(mark, Color.Black, alpha = window, blendMode = BlendMode.DstOut)
                }

                // 5. Crisp rim outline framing the opening window
                if (fade > 0f) {
                    drawPath(mark, markColor, alpha = fade, style = rim)
                }
            }
        }
    }
}

/**
 * Draws creative, custom-tailored visual effects unique to each of the 6 icons.
 */
private fun DrawScope.drawBespokeAnimation(
    icon: AppIcon,
    st: Float,
    d: Float,
    window: Float,
    fade: Float,
    s: Float,
    markColor: Color,
    accentGlint: Color,
) {
    when (icon) {
        AppIcon.LooPd -> drawLoopdAnimation(st, d, window, fade, markColor)
        AppIcon.PULSE -> drawPulseAnimation(st, d, window, fade, markColor)
        AppIcon.FLOW -> drawFlowAnimation(st, d, window, fade, markColor)
        AppIcon.AXIS -> drawAxisAnimation(st, d, window, fade, markColor)
        AppIcon.TUNE -> drawTuneAnimation(st, d, window, fade, markColor)
        AppIcon.ORBIT -> drawOrbitAnimation(st, d, window, fade, markColor)
    }
}

/**
 * LooPd: Harmonic concentric sound ripple waves & cosmic vortex dive.
 */
private fun DrawScope.drawLoopdAnimation(st: Float, d: Float, window: Float, fade: Float, markColor: Color) {
    val cx = 54f
    val cy = 54f
    // Settle: Expanding harmonic sonic ripples emanating from the center core
    if (d == 0f && st > 0.05f) {
        for (i in 0..2) {
            val progress = ((st * 1.5f + i * 0.33f) % 1f)
            val radius = 8f + 30f * progress
            val alpha = (1f - progress) * 0.45f * (1f - window)
            if (alpha > 0.02f) {
                drawCircle(
                    color = markColor,
                    radius = radius,
                    center = Offset(cx, cy),
                    style = Stroke(width = 1.0f),
                    alpha = alpha,
                )
            }
        }
    }
    // Dive: Relativistic acoustic warp rings accelerating outward
    if (d > 0.02f) {
        val warpAlpha = (1f - d) * fade * 0.6f
        val ring1 = 30f * (1f + d * 3.5f)
        val ring2 = 45f * (1f + d * 5.0f)
        drawCircle(markColor, radius = ring1, center = Offset(cx, cy), style = Stroke(width = 1.2f), alpha = warpAlpha)
        drawCircle(markColor, radius = ring2, center = Offset(cx, cy), style = Stroke(width = 0.8f), alpha = warpAlpha * 0.6f)
    }
}

/**
 * PULSE: Dynamic musical equalizer frequency peaks & stereo soundstage dive.
 */
private fun DrawScope.drawPulseAnimation(st: Float, d: Float, window: Float, fade: Float, markColor: Color) {
    // Settle: Equalizer bars dancing with live musical energy
    if (d == 0f && st > 0.05f) {
        val xPositions = listOf(31f, 36f, 41f, 46f, 54f, 62f, 67f, 72f, 77f)
        for (i in xPositions.indices) {
            val freq = sin(st * 4f * Math.PI.toFloat() + i * 0.85f)
            val peakH = 4f + 3f * freq
            val px = xPositions[i]
            val py = if (i % 2 == 0) 33f - peakH else 75f + peakH
            drawCircle(
                color = markColor,
                radius = 1.0f,
                center = Offset(px, py),
                alpha = 0.5f * (1f - window),
            )
        }
    }
    // Dive: Symmetrical stereo shockwave bars expanding left and right
    if (d > 0.02f) {
        val splitDist = d * 28f
        val splitAlpha = (1f - d) * fade * 0.5f
        // Left acoustic pulse bracket
        drawLine(markColor, Offset(24f - splitDist, 45f), Offset(24f - splitDist, 63f), strokeWidth = 1.5f, alpha = splitAlpha)
        // Right acoustic pulse bracket
        drawLine(markColor, Offset(84f + splitDist, 45f), Offset(84f + splitDist, 63f), strokeWidth = 1.5f, alpha = splitAlpha)
    }
}

/**
 * FLOW: Liquid infinity wave undulation & continuous fluid ribbon iris.
 */
private fun DrawScope.drawFlowAnimation(st: Float, d: Float, window: Float, fade: Float, markColor: Color) {
    // Settle: Fluid harmonic wave oscillations
    if (d == 0f && st > 0.05f) {
        val waveT = sin(st * 3f * Math.PI.toFloat())
        // Gentle glowing fluid contour aura
        drawCircle(markColor, radius = 13f + 1.5f * waveT, center = Offset(38f, 54f), style = Stroke(0.8f), alpha = 0.25f * (1f - window))
        drawCircle(markColor, radius = 13f - 1.5f * waveT, center = Offset(70f, 54f), style = Stroke(0.8f), alpha = 0.25f * (1f - window))
    }
    // Dive: Ribbon loops expand gracefully outward
    if (d > 0.02f) {
        val loopSpread = d * 24f
        val loopAlpha = (1f - d) * fade * 0.45f
        drawCircle(markColor, radius = 14f + loopSpread, center = Offset(38f - loopSpread * 0.5f, 54f), style = Stroke(1.2f), alpha = loopAlpha)
        drawCircle(markColor, radius = 14f + loopSpread, center = Offset(70f + loopSpread * 0.5f, 54f), style = Stroke(1.2f), alpha = loopAlpha)
    }
}

/**
 * AXIS: Precision architectural crosshair calibration & optical aperture shutter.
 */
private fun DrawScope.drawAxisAnimation(st: Float, d: Float, window: Float, fade: Float, markColor: Color) {
    val cx = 54f
    val cy = 54f
    // Settle: Caliper coordinate alignment ticks & focal disc target pulse
    if (d == 0f && st > 0.05f) {
        val discPulse = 1f + 0.12f * sin(st * 2.5f * Math.PI.toFloat())
        // Precision focal target ring
        drawCircle(markColor, radius = 11.5f * discPulse, center = Offset(cx, cy), style = Stroke(1.0f), alpha = 0.4f * (1f - window))

        // Precision corner alignment crosshairs
        val tickA = 0.5f * st * (1f - window)
        // Top corner tick
        drawLine(markColor, Offset(31f, 31f), Offset(35f, 31f), strokeWidth = 1.0f, alpha = tickA)
        drawLine(markColor, Offset(31f, 31f), Offset(31f, 35f), strokeWidth = 1.0f, alpha = tickA)
        // Bottom right corner tick
        drawLine(markColor, Offset(77f, 76f), Offset(73f, 76f), strokeWidth = 1.0f, alpha = tickA)
        drawLine(markColor, Offset(77f, 76f), Offset(77f, 72f), strokeWidth = 1.0f, alpha = tickA)
    }
    // Dive: High-speed optical aperture shutter dilation through the center disc
    if (d > 0.02f) {
        val shutterR = 10f + d * 40f
        val shutterAlpha = (1f - d) * fade * 0.55f
        drawCircle(markColor, radius = shutterR, center = Offset(cx, cy), style = Stroke(1.5f), alpha = shutterAlpha)
    }
}

/**
 * TUNE: Acoustic bass flex resonance & stereo immersive soundstage.
 */
private fun DrawScope.drawTuneAnimation(st: Float, d: Float, window: Float, fade: Float, markColor: Color) {
    // Settle: Acoustic soundwave arcs radiating from left and right earcups
    if (d == 0f && st > 0.05f) {
        for (i in 0..1) {
            val progress = ((st * 2f + i * 0.5f) % 1f)
            val arcSpread = 4f + 8f * progress
            val arcAlpha = (1f - progress) * 0.45f * (1f - window)
            // Left soundwave arc
            drawArc(
                color = markColor,
                startAngle = 135f,
                sweepAngle = 90f,
                useCenter = false,
                topLeft = Offset(34f - arcSpread, 67f - arcSpread),
                size = Size(arcSpread * 2f, arcSpread * 2f),
                style = Stroke(1.0f, cap = StrokeCap.Round),
                alpha = arcAlpha,
            )
            // Right soundwave arc
            drawArc(
                color = markColor,
                startAngle = -45f,
                sweepAngle = 90f,
                useCenter = false,
                topLeft = Offset(74f - arcSpread, 67f - arcSpread),
                size = Size(arcSpread * 2f, arcSpread * 2f),
                style = Stroke(1.0f, cap = StrokeCap.Round),
                alpha = arcAlpha,
            )
        }
    }
    // Dive: Headphone crown arch and earcups expand outward into surround stage
    if (d > 0.02f) {
        val crownRise = d * 18f
        val crownAlpha = (1f - d) * fade * 0.45f
        drawArc(
            color = markColor,
            startAngle = 180f,
            sweepAngle = 180f,
            useCenter = false,
            topLeft = Offset(22f - d * 15f, 20f - crownRise),
            size = Size(64f + d * 30f, 60f + d * 30f),
            style = Stroke(1.2f),
            alpha = crownAlpha,
        )
    }
}

/**
 * ORBIT: Digital satellite constellation synchronization & hyperdrive warp.
 */
private fun DrawScope.drawOrbitAnimation(st: Float, d: Float, window: Float, fade: Float, markColor: Color) {
    val cx = 54f
    val cy = 54f
    // Settle: Satellite constellation nodes pulse in an orbital sequence
    if (d == 0f && st > 0.05f) {
        // Orbital connection grid lines
        val pulseRing = 14.5f + 2f * sin(st * 3f * Math.PI.toFloat())
        drawCircle(
            color = markColor,
            radius = pulseRing,
            center = Offset(cx, cy),
            style = Stroke(0.8f),
            alpha = 0.25f * (1f - window),
        )
    }
    // Dive: Warp-speed digital starfield dispersion in 3D parallax
    if (d > 0.02f) {
        val warpDist = d * 35f
        val warpAlpha = (1f - d) * fade * 0.5f
        // 4 diagonal warp nodes expanding radially
        drawCircle(markColor, radius = 1.5f, center = Offset(cx - warpDist, cy - warpDist), alpha = warpAlpha)
        drawCircle(markColor, radius = 1.5f, center = Offset(cx + warpDist, cy - warpDist), alpha = warpAlpha)
        drawCircle(markColor, radius = 1.5f, center = Offset(cx + warpDist, cy + warpDist), alpha = warpAlpha)
        drawCircle(markColor, radius = 1.5f, center = Offset(cx - warpDist, cy + warpDist), alpha = warpAlpha)
    }
}

private fun smooth(from: Float, to: Float, x: Float): Float {
    val t = ((x - from) / (to - from)).coerceIn(0f, 1f)
    return t * t * (3f - 2f * t)
}

/** The width of the white/black edge around the mark during opening. */
private val RIM = 2.5.dp
private const val SETTLE_MS = 620
private const val HOLD_MS = 120L
private const val DIVE_MS = 900
/** How many times its size the mark grows to by the end of the dive. */
private const val ZOOM = 90f
