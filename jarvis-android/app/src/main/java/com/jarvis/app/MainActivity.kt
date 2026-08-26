package com.jarvis.app

import android.content.Context
import android.content.pm.PackageManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.jarvis.app.permission.PermissionsCore
import com.jarvis.app.tools.CaptureBus
import com.jarvis.app.ui.JarvisTheme
import com.jarvis.app.ui.JarvisAppScreen
import java.io.File

class MainActivity : ComponentActivity() {

    private val viewModel: JarvisViewModel by viewModels()

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { }

    private var pendingCameraUri: Uri? = null

    private val cameraLauncher = registerForActivityResult(
        ActivityResultContracts.TakePicture()
    ) { success ->
        if (success) {
            val uri = pendingCameraUri
            CaptureBus.set(uri)
            viewModel.onCameraImage(uri)
        }
    }

    private val fileLauncher = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            viewModel.onFilePicked(uri)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestCorePermissions()
        setContent {
            val state by viewModel.state.collectAsState()
            val lines by viewModel.lines.collectAsState()
            val memories by viewModel.memories.collectAsState()
            val trigger by viewModel.runtimeRequestTrigger.collectAsState()
            val capture by viewModel.captureIntent.collectAsState()
            val pick by viewModel.pickIntent.collectAsState()
            LaunchedEffect(trigger) {
                if (trigger > 0L) requestCorePermissions()
            }
            LaunchedEffect(capture) {
                if (capture > 0L) {
                    val dir = File(cacheDir, "images").apply { mkdirs() }
                    val file = File(dir, "jarvis_${System.currentTimeMillis()}.jpg")
                    val uri = FileProvider.getUriForFile(this@MainActivity, "${packageName}.fileprovider", file)
                    pendingCameraUri = uri
                    cameraLauncher.launch(uri)
                }
            }
            LaunchedEffect(pick) {
                if (pick > 0L) fileLauncher.launch(arrayOf("*/*"))
            }
            JarvisTheme {
                JarvisAppScreen(
                    state = state,
                    lines = lines,
                    memories = memories,
                    viewModel = viewModel
                )
            }
        }
    }

    private fun requestCorePermissions() {
        val needed = PermissionsCore.runtimePermissions().filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed.isNotEmpty()) permissionLauncher.launch(needed.toTypedArray())
    }
}
