package com.jarvis.app.accessibility

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.graphics.Rect
import android.os.Build
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class JarvisAccessibilityService : AccessibilityService() {

    companion object {
        @Volatile var instance: JarvisAccessibilityService? = null
            private set
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) { /* live view optional */ }

    override fun onInterrupt() {}

    override fun onDestroy() {
        if (instance === this) instance = null
        super.onDestroy()
    }

    private fun root(): AccessibilityNodeInfo? = rootInActiveWindow

    fun getScreenText(): String {
        val node = root() ?: return ""
        val sb = StringBuilder()
        collectText(node, sb, 0)
        return sb.toString().trim()
    }

    private fun collectText(node: AccessibilityNodeInfo, sb: StringBuilder, depth: Int) {
        if (depth > 40) return
        val text = node.text?.toString()
        val content = node.contentDescription?.toString()
        when {
            !text.isNullOrBlank() -> sb.append(text).append('\n')
            !content.isNullOrBlank() -> sb.append(content).append('\n')
        }
        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { collectText(it, sb, depth + 1) }
        }
    }

    fun clickText(text: String): Boolean {
        val node = root() ?: return false
        val found = dfFind(node, text) ?: return false
        return found.performAction(AccessibilityNodeInfo.ACTION_CLICK)
    }

    fun setTextInField(marker: String, newText: String): Boolean {
        val node = root() ?: return false
        val field = dfFindEditable(node, marker) ?: dfFindEditable(node, "") ?: return false
        val args = android.os.Bundle()
        args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, newText)
        return field.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
    }

    fun back(): Boolean = performGlobalAction(GLOBAL_ACTION_BACK)
    fun home(): Boolean = performGlobalAction(GLOBAL_ACTION_HOME)
    fun recents(): Boolean = performGlobalAction(GLOBAL_ACTION_RECENTS)
    fun notificationShade(): Boolean = performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS)

    fun clickAt(x: Float, y: Float): Boolean {
        val path = Path().apply { moveTo(x, y) }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 60))
            .build()
        return dispatchGesture(gesture, null, null)
    }

    fun swipe(fromX: Float, fromY: Float, toX: Float, toY: Float): Boolean {
        val path = Path().apply { moveTo(fromX, fromY); lineTo(toX, toY) }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 400))
            .build()
        return dispatchGesture(gesture, null, null)
    }

    private fun dfFind(node: AccessibilityNodeInfo, text: String): AccessibilityNodeInfo? {
        if (node.text?.toString()?.contains(text, true) == true ||
            node.contentDescription?.toString()?.contains(text, true) == true
        ) return node
        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { child ->
                dfFind(child, text)?.let { return it }
            }
        }
        return null
    }

    private fun dfFindEditable(node: AccessibilityNodeInfo, hint: String): AccessibilityNodeInfo? {
        if (node.isEditable) {
            val cur = node.text?.toString()
            if (hint.isBlank() || cur?.contains(hint, true) == true) return node
        }
        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { child ->
                dfFindEditable(child, hint)?.let { return it }
            }
        }
        return null
    }
}
