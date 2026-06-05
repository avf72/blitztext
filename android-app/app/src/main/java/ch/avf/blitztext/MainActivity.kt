package ch.avf.blitztext

import android.Manifest
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import ch.avf.blitztext.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var b: ActivityMainBinding

    private val permLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
            refresh()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityMainBinding.inflate(layoutInflater)
        setContentView(b.root)

        b.btnLogin.setOnClickListener { AuthManager.startLogin(this) }
        b.btnLogout.setOnClickListener { AuthManager.logout(); refresh() }
        b.btnOverlay.setOnClickListener {
            startActivity(
                Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
            )
        }
        b.btnAccessibility.setOnClickListener { showAccessibilityHelp() }
        b.btnStart.setOnClickListener {
            Prefs.overlayEnabled = true
            startOverlay()
        }
        b.btnStop.setOnClickListener {
            Prefs.overlayEnabled = false
            stopService(Intent(this, OverlayService::class.java))
        }
        b.btnSettings.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }

        requestRuntimePermissions()
    }

    override fun onResume() {
        super.onResume()
        refresh()
        maybeAutoStartOverlay()
    }

    /** Startet den Overlay-Knopf automatisch, sobald alle Voraussetzungen erfuellt sind -
     *  kein manuelles "Starten" mehr noetig (auch nicht nach Neustart + App-Oeffnen). */
    private fun maybeAutoStartOverlay() {
        val micGranted = ContextCompat.checkSelfPermission(
            this, Manifest.permission.RECORD_AUDIO
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        if (Prefs.overlayEnabled &&
            Prefs.isLoggedIn &&
            Settings.canDrawOverlays(this) &&
            micGranted &&
            !OverlayService.isRunning
        ) {
            ContextCompat.startForegroundService(this, Intent(this, OverlayService::class.java))
        }
    }

    private fun startOverlay() {
        if (!Settings.canDrawOverlays(this)) {
            b.status.text = "Bitte zuerst die Berechtigung 'Ueber Apps anzeigen' erteilen."
            return
        }
        ContextCompat.startForegroundService(this, Intent(this, OverlayService::class.java))
    }

    private fun requestRuntimePermissions() {
        val perms = mutableListOf(Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        permLauncher.launch(perms.toTypedArray())
    }

    private fun refresh() {
        val mic = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED
        fun mark(ok: Boolean) = if (ok) "✓" else "✗"
        b.status.text = buildString {
            appendLine("${mark(Prefs.isLoggedIn)}  Eingeloggt")
            appendLine("${mark(Settings.canDrawOverlays(this@MainActivity))}  Ueber Apps anzeigen")
            appendLine("${mark(isAccessibilityEnabled())}  Bedienungshilfe (Texteinfuegen)")
            append("${mark(mic)}  Mikrofon")
        }
    }

    private fun showAccessibilityHelp() {
        val msg = """
            So aktivierst du die Bedienungshilfe (noetig zum Einfuegen des Textes):

            1. Auf der naechsten Seite: "Installierte Apps" (oder "Heruntergeladene Apps") -> Blitztext -> Schalter EIN.

            2. Falls "Eingeschraenkte Einstellung" erscheint:
               a) Tippe unten auf "App-Info (Drei-Punkte-Menue)".
               b) Dort oben rechts auf die drei Punkte tippen.
               c) "Eingeschraenkte Einstellungen zulassen" waehlen, mit PIN/Fingerabdruck bestaetigen.
               d) Danach zurueck und Schritt 1 wiederholen.
        """.trimIndent()
        AlertDialog.Builder(this)
            .setTitle("Bedienungshilfe aktivieren")
            .setMessage(msg)
            .setPositiveButton("Bedienungshilfe oeffnen") { _, _ ->
                startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
            }
            .setNeutralButton("App-Info (Drei-Punkte-Menue)") { _, _ ->
                startActivity(
                    Intent(
                        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        Uri.parse("package:$packageName")
                    )
                )
            }
            .setNegativeButton("Schliessen", null)
            .show()
    }

    private fun isAccessibilityEnabled(): Boolean {
        val expected = "$packageName/$packageName.BlitztextAccessibilityService"
        val enabled = Settings.Secure.getString(
            contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        return enabled.split(":").any { it.equals(expected, ignoreCase = true) }
    }
}
