package ch.avf.blitztext

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import ch.avf.blitztext.databinding.ActivitySettingsBinding
import kotlinx.coroutines.launch

class SettingsActivity : AppCompatActivity() {

    private lateinit var b: ActivitySettingsBinding

    private val workflowValues =
        listOf("transcription", "textImprover", "dampfAblassen", "emojiText")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(b.root)

        b.spinnerWorkflow.adapter = ArrayAdapter.createFromResource(
            this, R.array.workflow_labels, android.R.layout.simple_spinner_dropdown_item
        )
        b.spinnerWorkflow.setSelection(
            workflowValues.indexOf(Prefs.workflow).coerceAtLeast(0)
        )
        b.editLanguage.setText(Prefs.language)

        b.btnSave.setOnClickListener {
            Prefs.workflow = workflowValues[b.spinnerWorkflow.selectedItemPosition]
            Prefs.language = b.editLanguage.text.toString().trim().ifEmpty { "de" }
            Toast.makeText(this, "Gespeichert", Toast.LENGTH_SHORT).show()
            finish()
        }

        b.btnBilling.setOnClickListener {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(Links.OPENAI_BILLING)))
        }

        b.versionText.text =
            "Version ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})"
        b.btnUpdate.setOnClickListener { checkAndUpdate() }
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()

    private fun checkAndUpdate() {
        b.btnUpdate.isEnabled = false
        lifecycleScope.launch {
            try {
                toast("Suche nach Update ...")
                val remote = UpdateManager.latestVersionCode()
                if (remote == null) {
                    toast("Update-Pruefung fehlgeschlagen")
                    return@launch
                }
                if (remote <= BuildConfig.VERSION_CODE) {
                    toast("Du hast bereits die neueste Version")
                    return@launch
                }
                // Berechtigung "Apps installieren" sicherstellen
                if (!packageManager.canRequestPackageInstalls()) {
                    toast("Bitte 'Apps installieren' fuer Blitztext erlauben, dann erneut tippen")
                    startActivity(
                        Intent(
                            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:$packageName")
                        )
                    )
                    return@launch
                }
                toast("Lade Update ...")
                val apk = UpdateManager.downloadApk(this@SettingsActivity)
                if (apk == null) {
                    toast("Download fehlgeschlagen")
                    return@launch
                }
                UpdateManager.install(this@SettingsActivity, apk)
            } finally {
                b.btnUpdate.isEnabled = true
            }
        }
    }
}
