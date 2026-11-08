package com.opentune.desktop

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.drag
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.PointerIcon
import androidx.compose.ui.input.pointer.pointerHoverIcon
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import java.awt.Frame
import java.awt.MouseInfo
import javax.swing.JFrame

/**
 * The window's frame. On Windows the app draws its own header and genuine Windows caption controls:
 * Minimize, Maximize, and Close on the right.
 */
object DesktopWindow {
    val isMac = System.getProperty("os.name").orEmpty().lowercase().startsWith("mac")

    /** Room above the app's content for the Mac's window buttons. */
    val topInset = if (isMac) 28.dp else 0.dp

    /** Whether the app draws the window's buttons and drag areas itself. */
    val drawsFrame: Boolean get() = WindowsFrame.drawn

    /** The window, and what closing it does; set when it's made. */
    internal var window: JFrame? = null
    internal var close: () -> Unit = {}

    val isMaximized: Boolean
        get() {
            val w = window ?: return false
            return (w.extendedState and Frame.MAXIMIZED_BOTH) != 0
        }

    fun style(window: JFrame) {
        if (!isMac) return
        window.rootPane.putClientProperty("apple.awt.fullWindowContent", true)
        window.rootPane.putClientProperty("apple.awt.transparentTitleBar", true)
        window.rootPane.putClientProperty("apple.awt.windowTitleVisible", false)
    }

    fun minimize() {
        if (!WindowsFrame.minimize()) window?.extendedState = Frame.ICONIFIED
    }

    fun toggleMaximize() {
        if (WindowsFrame.toggleMaximize()) return
        val w = window ?: return
        w.extendedState = if (w.extendedState and Frame.MAXIMIZED_BOTH != 0) Frame.NORMAL else Frame.MAXIMIZED_BOTH
    }
}

/**
 * Empty title bar: dragging it moves the window, a double click zooms it, as a
 * system title bar does. Put it behind a bar's content, not around it, so the
 * buttons and sliders on the bar take their own presses and only the empty
 * parts reach here. Nothing, where the system draws the title bar.
 */
internal fun Modifier.windowDrag(): Modifier = if (!DesktopWindow.drawsFrame) this else pointerInput(Unit) {
    var lastAt = 0L
    var lastWhere = Offset.Zero
    awaitEachGesture {
        val down = awaitFirstDown()
        val twice = down.uptimeMillis - lastAt <= viewConfiguration.doubleTapTimeoutMillis &&
            (down.position - lastWhere).getDistance() <= viewConfiguration.touchSlop
        if (twice) {
            lastAt = 0L
            down.consume()
            DesktopWindow.toggleMaximize()
            return@awaitEachGesture
        }
        lastAt = down.uptimeMillis
        lastWhere = down.position
        // Windows moves it, with Snap and drag-down-to-restore; without the hook, it's moved from here.
        if (WindowsFrame.startDrag()) return@awaitEachGesture
        val window = DesktopWindow.window ?: return@awaitEachGesture
        val from = window.location
        val pointer = MouseInfo.getPointerInfo()?.location ?: return@awaitEachGesture
        drag(down.id) {
            val now = MouseInfo.getPointerInfo()?.location ?: return@drag
            window.setLocation(from.x + now.x - pointer.x, from.y + now.y - pointer.y)
        }
    }
}

/**
 * Authentic Windows Caption Controls: Minimize, Maximize/Restore, and Close.
 * Standard Windows dimensions: 46dp width x 32dp height.
 */
@Composable
internal fun WindowsCaptionButtons(modifier: Modifier = Modifier) {
    if (!DesktopWindow.drawsFrame) return
    val onSurface = MaterialTheme.colorScheme.onSurface
    val isMax = DesktopWindow.isMaximized
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        // Minimize
        CaptionButton("Minimize", onClick = DesktopWindow::minimize) { isHovered ->
            val stroke = 1.dp.toPx()
            val w = 5.dp.toPx()
            drawLine(
                color = onSurface,
                start = Offset(center.x - w, center.y),
                end = Offset(center.x + w, center.y),
                strokeWidth = stroke,
                cap = StrokeCap.Square,
            )
        }
        // Maximize / Restore
        CaptionButton(if (isMax) "Restore" else "Maximize", onClick = DesktopWindow::toggleMaximize) { isHovered ->
            val stroke = 1.dp.toPx()
            if (!isMax) {
                val s = 5.dp.toPx()
                drawRect(
                    color = onSurface,
                    topLeft = Offset(center.x - s, center.y - s),
                    size = Size(s * 2, s * 2),
                    style = Stroke(width = stroke),
                )
            } else {
                val s = 4.dp.toPx()
                val offset = 2.dp.toPx()
                drawRect(
                    color = onSurface,
                    topLeft = Offset(center.x - s + offset, center.y - s - offset),
                    size = Size(s * 2, s * 2),
                    style = Stroke(width = stroke),
                )
                drawRect(
                    color = onSurface,
                    topLeft = Offset(center.x - s - offset, center.y - s + offset),
                    size = Size(s * 2, s * 2),
                    style = Stroke(width = stroke),
                )
            }
        }
        // Close
        CaptionButton("Close", isClose = true, onClick = DesktopWindow.close) { isHovered ->
            val stroke = 1.2.dp.toPx()
            val s = 4.5.dp.toPx()
            val color = if (isHovered) Color.White else onSurface
            drawLine(
                color = color,
                start = Offset(center.x - s, center.y - s),
                end = Offset(center.x + s, center.y + s),
                strokeWidth = stroke,
                cap = StrokeCap.Square,
            )
            drawLine(
                color = color,
                start = Offset(center.x + s, center.y - s),
                end = Offset(center.x - s, center.y + s),
                strokeWidth = stroke,
                cap = StrokeCap.Square,
            )
        }
    }
}

@Composable
private fun CaptionButton(
    label: String,
    isClose: Boolean = false,
    onClick: () -> Unit,
    drawIcon: DrawScope.(Boolean) -> Unit,
) {
    val hover = remember { MutableInteractionSource() }
    val hovered by hover.collectIsHoveredAsState()
    val bgColor = when {
        isClose && hovered -> Color(0xFFE81123)
        hovered -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
        else -> Color.Transparent
    }
    Box(
        Modifier
            .size(width = 46.dp, height = 32.dp)
            .background(bgColor)
            .hoverable(hover)
            .pointerHoverIcon(PointerIcon.Default)
            .clickable(interactionSource = hover, indication = null, onClick = onClick)
            .semantics { contentDescription = label }
            .drawBehind {
                drawIcon(hovered)
            },
    )
}

/** Backward-compatibility alias */
@Composable
internal fun WindowButtons(modifier: Modifier = Modifier) = WindowsCaptionButtons(modifier)
