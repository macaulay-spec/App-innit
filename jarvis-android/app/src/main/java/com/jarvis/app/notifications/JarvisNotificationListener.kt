package com.jarvis.app.notifications

import android.app.Notification
import android.app.RemoteInput
import android.content.Context
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class JarvisNotificationListener : NotificationListenerService() {

    companion object {
        @Volatile var instance: JarvisNotificationListener? = null
            private set

        /** Best effort reply through a notification's RemoteInput action. */
        fun replyViaNotification(packageName: String, replyText: String): Boolean {
            val inst = instance ?: return false
            return inst.sendReply(packageName, replyText)
        }
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    override fun onListenerConnected() {
        instance = this
        refresh()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) = refresh()
    override fun onNotificationRemoved(sbn: StatusBarNotification?) = refresh()

    override fun onDestroy() {
        if (instance === this) instance = null
        super.onDestroy()
    }

    private fun refresh() {
        try {
            val sbns = activeNotifications ?: return
            val apps = packageManager.getInstalledApplications(0)
            val items = sbns.mapNotNull { sbn ->
                val notif = sbn.notification ?: return@mapNotNull null
                val extras = notif.extras ?: return@mapNotNull null
                val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
                    ?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
                    ?: ""
                val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
                if (text.isBlank() && title.isBlank()) return@mapNotNull null
                val label = apps.firstOrNull { it.packageName == sbn.packageName }?.loadLabel(packageManager)?.toString()
                    ?: sbn.packageName
                JarvisNotification(
                    packageName = sbn.packageName,
                    appLabel = label,
                    title = title,
                    text = text,
                    key = sbn.key,
                    timestamp = sbn.postTime
                )
            }
            NotificationRepository.update(items)
        } catch (_: Exception) { }
    }

    private fun sendReply(packageName: String, replyText: String): Boolean {
        return try {
            val action = findReplyAction(packageName) ?: return false
            val inputs = action.getRemoteInputs() ?: return false
            val results = Bundle()
            results.putCharSequence(inputs.first().resultKey, replyText)
            RemoteInput.addResultsToIntent(action.getRemoteInputs(), action.actionIntent, results)
            action.actionIntent.send()
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun findReplyAction(packageName: String): Notification.Action? {
        val sbns = activeNotifications ?: return null
        for (sbn in sbns) {
            if (sbn.packageName != packageName) continue
            sbn.notification.actions?.forEach { action ->
                val inputs = action.getRemoteInputs()
                if (inputs != null && inputs.isNotEmpty()) return action
            }
        }
        return null
    }
}
