package com.jarvis.app.ui

import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Mic
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.jarvis.app.JarvisViewModel
import com.jarvis.app.memory.MemoryEntity

private enum class Tab(val label: String) { HOME("Home"), MEMORY("Memory"), SETTINGS("Settings") }

@Composable
fun JarvisAppScreen(
    state: JarvisState,
    lines: List<com.jarvis.app.ChatLine>,
    memories: List<MemoryEntity>,
    viewModel: JarvisViewModel
) {
    var tab by remember { mutableStateOf(Tab.HOME) }
    val context = LocalContext.current

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                Tab.entries.forEach { t ->
                    NavigationBarItem(
                        selected = tab == t,
                        onClick = { tab = t },
                        icon = {
                            Icon(
                                imageVector = when (t) {
                                    Tab.HOME -> Icons.Default.Home
                                    Tab.MEMORY -> Icons.Default.Storage
                                    Tab.SETTINGS -> Icons.Default.Settings
                                },
                                contentDescription = t.label
                            )
                        },
                        label = { Text(t.label) }
                    )
                }
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.toggleListening() },
                containerColor = state.accent()
            ) {
                Icon(Icons.Default.Mic, contentDescription = "Listening", tint = Color(0xFF001A22))
            }
        }
    ) { pad ->
        Box(Modifier.padding(pad).fillMaxSize()) {
            when (tab) {
                Tab.HOME -> HomeScreen(state, lines, viewModel)
                Tab.MEMORY -> MemoryScreen(memories)
                Tab.SETTINGS -> SettingsScreen(viewModel)
            }
        }
    }
}

@Composable
private fun HomeScreen(
    state: JarvisState,
    lines: List<com.jarvis.app.ChatLine>,
    viewModel: JarvisViewModel
) {
    Column(
        Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            VisionCore(state = state, modifier = Modifier.size(260.dp))
        }
        Text(
            text = state.label,
            color = state.accent(),
            modifier = Modifier.align(Alignment.CenterHorizontally),
            fontSize = 16.sp
        )
        Spacer(Modifier.height(8.dp))

        LazyColumn(
            Modifier
                .weight(1f)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            items(lines) { l ->
                Bubble(role = l.role, text = l.text)
            }
        }

        Spacer(Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = viewModel.input.collectAsState().value,
                onValueChange = viewModel::setInput,
                modifier = Modifier.weight(1f),
                placeholder = { Text("Ask JARVIS…") },
                singleLine = false,
                shape = RoundedCornerShape(16.dp),
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences)
            )
            IconButton(onClick = { viewModel.send() }) {
                Icon(Icons.Default.Send, contentDescription = "Send", tint = state.accent())
            }
        }
        Spacer(Modifier.height(6.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("Open WhatsApp", "Any messages?", "Battery", "What do you remember?", "Reply to John, say hi").forEach { chip ->
                TextButton(onClick = { viewModel.setInput(chip) }) {
                    Text(chip, fontSize = 12.sp, color = state.accent())
                }
            }
        }
    }
}

@Composable
private fun Bubble(role: String, text: String) {
    val mine = role == "user"
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start) {
        Card(
            modifier = Modifier.fillMaxWidth(0.86f),
            colors = CardDefaults.cardColors(
                containerColor = if (mine) Color(0xFF0A2E45) else MaterialTheme.colorScheme.surface
            )
        ) {
            Column(Modifier.padding(10.dp)) {
                Text(
                    text = if (mine) "You" else "JARVIS",
                    color = if (mine) Color(0xFF9FF4FF) else Color(0xFF35E0FF),
                    fontSize = 11.sp
                )
                Text(text = text, color = MaterialTheme.colorScheme.onBackground)
            }
        }
    }
}

@Composable
private fun MemoryScreen(memories: List<MemoryEntity>) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Long-term memory", color = MaterialTheme.colorScheme.primary, fontSize = 20.sp)
        Spacer(Modifier.height(8.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(memories) { m ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Column(Modifier.padding(10.dp)) {
                        Text(m.content, color = MaterialTheme.colorScheme.onBackground)
                        Text(
                            "${m.type} · importance ${m.importance}",
                            color = Color(0xFF6BFFE1),
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsScreen(viewModel: JarvisViewModel) {
    val context = LocalContext.current
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Settings", color = MaterialTheme.colorScheme.primary, fontSize = 20.sp)
        Spacer(Modifier.height(12.dp))
        VerticalCard("Listening") {
            Text("Tap the mic FAB to start/stop the foreground listening service.", color = MaterialTheme.colorScheme.onBackground)
        }
        VerticalCard("Notification access (read & reply)") {
            Text("Enable 'JARVIS' in Android notification access settings.", color = MaterialTheme.colorScheme.onBackground)
            Button(onClick = { context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }) {
                Text("Open notification access")
            }
        }
        VerticalCard("Full mode (screen control)") {
            Text("Enable 'JARVIS' in Android accessibility settings. Off by default.", color = MaterialTheme.colorScheme.onBackground)
            Button(onClick = { context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }) {
                Text("Open accessibility settings")
            }
        }
        VerticalCard("Battery optimization") {
            Button(onClick = {
                context.startActivity(
                    Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                )
            }) { Text("Open battery settings") }
        }
        VerticalCard("Memory") {
            Button(onClick = { viewModel.wipeMemory() }) { Text("Wipe all memory") }
        }
    }
}

@Composable
private fun VerticalCard(title: String, content: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, color = MaterialTheme.colorScheme.primary, fontSize = 16.sp)
            content()
        }
    }
}
