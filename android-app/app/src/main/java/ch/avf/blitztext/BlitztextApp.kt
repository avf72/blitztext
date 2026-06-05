package ch.avf.blitztext

import android.app.Application

class BlitztextApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Prefs.init(this)
    }
}
