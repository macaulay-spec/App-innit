package com.jarvis.app.tools

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.MediaStore

class FileAndCameraToolkit(private val context: Context) {

    /** Opens the system SAF file picker. User picks a file; JARVIS gets its URI and can summarize. */
    fun openFilePicker() {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try { context.startActivity(intent) } catch (_: Exception) { }
    }

    /** Opens the system camera app to capture a photo. */
    fun openCamera() {
        val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try { context.startActivity(intent) } catch (_: Exception) { }
    }

    fun openManageStorage() {
        runCatching {
            val intent = Intent(android.provider.Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }
    }
}
