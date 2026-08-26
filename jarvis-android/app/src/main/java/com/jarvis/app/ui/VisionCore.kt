package com.jarvis.app.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.dp
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun VisionCore(
    state: JarvisState,
    audioLevel: Float = 0f,
    modifier: Modifier = Modifier
) {
    val accent = state.accent()
    val inner = accent.copy(alpha = 0.35f)
    val outer = accent.copy(alpha = 0.12f)
    val transition = rememberInfiniteTransition(label = "core")
    val pulse by transition.animateFloat(
        initialValue = 0f, targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1800, easing = LinearEasing), RepeatMode.Reverse),
        label = "pulse"
    )
    val spin by transition.animateFloat(
        initialValue = 0f, targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(9000, easing = LinearEasing)),
        label = "spin"
    )
    val spin2 by transition.animateFloat(
        initialValue = 360f, targetValue = 0f,
        animationSpec = infiniteRepeatable(tween(13000, easing = LinearEasing)),
        label = "spin2"
    )

    val breathing = if (state == JarvisState.IDLE) 0.86f + pulse * 0.14f
    else if (state == JarvisState.OFFLINE) 0.72f + pulse * 0.08f
    else 0.95f + pulse * 0.10f
    val vibe = (audioLevel.coerceIn(0f, 1f) * 0.5f).coerceIn(0f, 0.5f)

    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        CoreCanvas(
            accent = accent,
            inner = inner,
            outer = outer,
            state = state,
            breathing = breathing,
            vibe = vibe,
            spin = spin,
            spin2 = spin2
        )
    }
}

@Composable
private fun BoxScope.CoreCanvas(
    accent: Color,
    inner: Color,
    outer: Color,
    state: JarvisState,
    breathing: Float,
    vibe: Float,
    spin: Float,
    spin2: Float
) {
    val bg = androidx.compose.ui.graphics.Brush.radialGradient(
        colors = listOf(accent.copy(alpha = 0.10f), Color.Transparent, Color.Transparent),
        center = Offset(500f, 500f),
        radius = 800f
    )
    Canvas(modifier = Modifier.size(340.dp)) {
        val cx = size.width / 2f
        val cy = size.height / 2f
        val base = (size.minDimension * 0.22f) * breathing

        drawCircle(brush = bg, radius = size.minDimension * 0.52f, center = Offset(cx, cy))

        // Outer haze
        drawCircle(color = outer.copy(alpha = 0.5f + vibe), radius = base * 1.7f, center = Offset(cx, cy))

        // Orbital rings
        rotate(spin, center = Offset(cx, cy)) {
            drawOval(
                color = accent.copy(alpha = 0.45f),
                topLeft = Offset(cx - base * 1.65f, cy - base * 0.55f),
                size = androidx.compose.ui.geometry.Size(base * 3.3f, base * 1.1f),
                style = Stroke(width = base * 0.035f)
            )
            drawOval(
                color = accent.copy(alpha = 0.22f),
                topLeft = Offset(cx - base * 1.95f, cy - base * 0.75f),
                size = androidx.compose.ui.geometry.Size(base * 3.9f, base * 1.5f),
                style = Stroke(width = base * 0.02f)
            )
        }
        rotate(spin2, center = Offset(cx, cy)) {
            drawOval(
                color = accent.copy(alpha = 0.35f),
                topLeft = Offset(cx - base * 0.55f, cy - base * 1.75f),
                size = androidx.compose.ui.geometry.Size(base * 1.1f, base * 3.5f),
                style = Stroke(width = base * 0.025f)
            )
        }

        // Inner geometry
        drawCircle(color = accent.copy(alpha = 0.9f), radius = base * 0.52f, center = Offset(cx, cy))
        drawCircle(color = Color.White.copy(alpha = 0.9f), radius = base * 0.30f, center = Offset(cx, cy))
        drawCircle(color = Color(0xFF051626), radius = base * 0.24f, center = Offset(cx, cy))
        drawCircle(color = accent.copy(alpha = 0.95f), radius = base * 0.12f, center = Offset(cx, cy))

        // Audio / state reactive ring
        if (state == JarvisState.LISTENING || state == JarvisState.SPEAKING) {
            val ringR = base * (1.35f + vibe)
            drawCircle(
                color = accent.copy(alpha = 0.6f),
                radius = ringR,
                center = Offset(cx, cy),
                style = Stroke(width = base * (0.05f + vibe * 0.10f))
            )
        }

        // Particles
        val particleCount = if (state == JarvisState.PROCESSING) 42 else 22
        repeat(particleCount) { i ->
            val angle = (i * 137.5f) + (spin * 0.35f)
            val dist = base * (1.4f + ((i % 5) * 0.16f)) + vibe * 20f
            val px = cx + cos(angle * 0.0174533f) * dist
            val py = cy + sin(angle * 0.0174533f) * dist
            val pr = 1.2f + (i % 3) * 0.7f
            drawCircle(color = accent.copy(alpha = 0.55f), radius = pr, center = Offset(px, py))
        }

        // Status glow ring
        drawCircle(color = accent.copy(alpha = 0.25f + (vibe * 0.5f)), radius = base * 1.2f, center = Offset(cx, cy), style = Stroke(width = 2f))
    }
}
