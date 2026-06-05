plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "ch.avf.blitztext"
    compileSdk = 34

    defaultConfig {
        applicationId = "ch.avf.blitztext"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"

        // Werte aus gradle/CI ueberschreibbar; Defaults zeigen aufs Live-Backend.
        buildConfigField("String", "BACKEND_URL", "\"https://blitztext-web.vercel.app\"")
        buildConfigField("String", "SUPABASE_URL", "\"https://cuoxdqokkiadmnoaoxgi.supabase.co\"")
        buildConfigField(
            "String",
            "SUPABASE_ANON_KEY",
            "\"sb_publishable_BSalwoZLHOCUepNxuwd-ag_3jnwUZ1M\""
        )
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    signingConfigs {
        // Fester Schluessel (von der CI erzeugt + im Repo), damit Updates per
        // Drueber-Install funktionieren (gleiche Signatur ueber alle Builds).
        getByName("debug") {
            val ks = file("blitztext.jks")
            if (ks.exists()) {
                storeFile = ks
                storePassword = "blitztext"
                keyAlias = "blitztext"
                keyPassword = "blitztext"
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.browser:browser:1.8.0")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
