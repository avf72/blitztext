package ch.avf.blitztext

import android.accessibilityservice.AccessibilityService
import android.content.ClipData
import android.content.ClipboardManager
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Fuegt diktierten Text in das aktuell fokussierte Eingabefeld einer beliebigen App ein.
 * Primaer ueber Zwischenablage + ACTION_PASTE (cursor-erhaltend), Fallback ACTION_SET_TEXT.
 */
class BlitztextAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onDestroy() {
        if (instance === this) instance = null
        super.onDestroy()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}
    override fun onInterrupt() {}

    /** true, wenn der Text eingefuegt wurde. */
    fun insertText(text: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val node = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT) ?: return false

        val clip = getSystemService(ClipboardManager::class.java)
        clip?.setPrimaryClip(ClipData.newPlainText("blitztext", text))
        if (node.performAction(AccessibilityNodeInfo.ACTION_PASTE)) return true

        // Fallback: bestehenden Text + neuen zusammenfuegen und setzen.
        val existing = node.text?.toString().orEmpty()
        val args = Bundle().apply {
            putCharSequence(
                AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                if (existing.isEmpty()) text else "$existing $text"
            )
        }
        return node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
    }

    companion object {
        @Volatile
        var instance: BlitztextAccessibilityService? = null

        fun isEnabled(): Boolean = instance != null
    }
}
