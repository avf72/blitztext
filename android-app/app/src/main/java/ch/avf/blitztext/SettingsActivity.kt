package ch.avf.blitztext

import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import ch.avf.blitztext.databinding.ActivitySettingsBinding

class SettingsActivity : AppCompatActivity() {

    private val workflowValues =
        listOf("transcription", "textImprover", "dampfAblassen", "emojiText")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val b = ActivitySettingsBinding.inflate(layoutInflater)
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
    }
}
