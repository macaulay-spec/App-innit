package com.jarvis.app

import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import com.jarvis.app.permission.PermissionsCore
import com.jarvis.app.ui.JarvisTheme
import com.jarvis.app.ui.JarvisAppScreen

class MainActivity : ComponentActivity() {

    private val viewModel: JarvisViewModel by viewModels()

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestCorePermissions()
        setContent {
            val state by viewModel.state.collectAsState()
            val lines by viewModel.lines.collectAsState()
            val memories by viewModel.memories.collectAsState()
            val trigger by viewModel.runtimeRequestTrigger.collectAsState()
            LaunchedEffect(trigger) {
                if (trigger > 0L) requestCorePermissions()
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
