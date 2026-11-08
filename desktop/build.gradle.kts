import org.jetbrains.compose.desktop.application.dsl.TargetFormat

plugins {
    id("org.jetbrains.kotlin.jvm")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("org.jetbrains.compose")
}

evaluationDependsOn(":core")

val appBuild = rootProject.file("app/build.gradle.kts").readText()
val appVersionName = Regex("""versionName = "([^"]+)"""").find(appBuild)!!.groupValues[1]
val appVersionCode = Regex("""versionCode = (\d+)""").find(appBuild)!!.groupValues[1]

val coreSources = rootProject.file("core/src/main/java")
val sharedFromCore = listOf(
    "com/opentune/data/model/**",
    "com/opentune/data/innertube/Innertube.kt",
    "com/opentune/data/innertube/InnertubeParser.kt",
    "com/opentune/data/innertube/PlayerClient.kt",
    "com/opentune/data/podcasts/PodcastParser.kt",
    "com/opentune/data/podcasts/PodcastModels.kt",
    "com/opentune/data/Http.kt",
    "com/opentune/data/DebugLog.kt",
    "com/opentune/data/AppLog.kt",
    "com/opentune/data/TrackIds.kt",
    "com/opentune/data/settings/AppSettings.kt",
    "com/opentune/data/history/ListeningHistoryTarget.kt",
    "com/opentune/data/history/History.kt",
    "com/opentune/data/history/Wrapped.kt",
    "com/opentune/data/history/DailyMixes.kt",
    "com/opentune/data/history/SpeedDial.kt",
    "com/opentune/data/history/ListenedCollections.kt",
    "com/opentune/data/library/Hidden.kt",
    "com/opentune/data/SavedFile.kt",
    "com/opentune/data/covers/AppleArtistArt.kt",
    "com/opentune/data/covers/ArtistSignatures.kt",
    "com/opentune/data/lyrics/Lyrics.kt",
    "com/opentune/data/lyrics/LyricsRepository.kt",
    "com/opentune/data/lyrics/LyricsQuality.kt",
    "com/opentune/data/lyrics/SongParts.kt",
    "com/opentune/data/lyrics/BetterLyrics.kt",
    "com/opentune/data/lyrics/KuGou.kt",
    "com/opentune/data/lyrics/LyricsPlus.kt",
    "com/opentune/data/lyrics/LrcRed.kt",
    "com/opentune/data/lyrics/Paxsenix.kt",
    "com/opentune/data/metadata/Deezer.kt",
    "com/opentune/data/metadata/AppleWebToken.kt",
    "com/opentune/data/lyrics/NetEase.kt",
    "com/opentune/data/lyrics/SimpMusic.kt",
    "com/opentune/data/lyrics/YouTubeCaptions.kt",
    "com/opentune/data/addons/AddonModels.kt",
    "com/opentune/data/config/RemoteConfig.kt",
    "org/schabi/newpipe/extractor/utils/Utils.java",
)

val appSources = rootProject.file("app/src/main/java")
val sharedFromApp = listOf(
    "com/opentune/ui/BottomChrome.kt",
    "com/opentune/ui/components/FocusRing.kt",
)

val generateBuildConfig = tasks.register("generateBuildConfig") {
    val out = layout.buildDirectory.dir("generated/buildconfig")
    outputs.dir(out)
    inputs.property("version", appVersionName)
    doLast {
        val file = out.get().asFile.resolve("com/opentune/core/BuildConfig.java")
        file.parentFile.mkdirs()
        file.writeText(
            """
            package com.opentune.core;
            public final class BuildConfig {
                public static final boolean DEBUG = false;
                public static final String VERSION_NAME = "$appVersionName";
                public static final String LASTFM_API_KEY = "";
                public static final String LASTFM_API_SECRET = "";
            }
            """.trimIndent()
        )
    }
}

val newPipeForDesktop = layout.buildDirectory.file("libs/newpipe-patched.jar")
val prepareNewPipe = tasks.register<Jar>("newPipeForDesktop") {
    dependsOn(":core:stripNewPipeExtractorUtils")
    val stripped = project(":core").tasks.named<Jar>("stripNewPipeExtractorUtils").flatMap { it.archiveFile }
    from(zipTree(stripped))
    archiveFileName.set("newpipe-patched.jar")
    destinationDirectory.set(layout.buildDirectory.dir("libs"))
}

sourceSets {
    main {
        java {
            srcDir("src/shim/java")
            srcDir(generateBuildConfig.map { it.outputs.files.singleFile })
            srcDir(coreSources)
            include("android/**")
            include("org/**")
            include("com/opentune/core/BuildConfig.java")
            include("org/schabi/newpipe/extractor/utils/Utils.java")
        }
        kotlin {
            srcDir("src/main/kotlin")
            srcDir("src/shim/kotlin")
            srcDir(coreSources)
            srcDir(appSources)
            include("com/opentune/desktop/**")
            include("shim/**")
            sharedFromCore.forEach { include(it) }
            sharedFromApp.forEach { include(it) }
        }
        resources {
            srcDir("src/main/resources")
        }
    }
}

tasks.named("compileKotlin") {
    dependsOn(prepareNewPipe)
}
tasks.named("compileJava") {
    dependsOn(prepareNewPipe)
}
tasks.withType<ProcessResources> {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
}

val osName = System.getProperty("os.name").lowercase()
val osArch = System.getProperty("os.arch").lowercase()
val bytedecoPlatform = when {
    "windows" in osName && ("amd64" in osArch || "x86_64" in osArch) -> "windows-x86_64"
    "windows" in osName && "aarch64" in osArch -> "windows-arm64"
    "mac" in osName && ("aarch64" in osArch || "arm64" in osArch) -> "macosx-arm64"
    "mac" in osName -> "macosx-x86_64"
    "linux" in osName && ("aarch64" in osArch || "arm64" in osArch) -> "linux-arm64"
    "linux" in osName -> "linux-x86_64"
    else -> "windows-x86_64"
}
val javafxPlatform = when {
    "windows" in osName && ("amd64" in osArch || "x86_64" in osArch) -> "win"
    "mac" in osName && ("aarch64" in osArch || "arm64" in osArch) -> "mac-aarch64"
    "mac" in osName -> "mac"
    "linux" in osName && ("aarch64" in osArch || "arm64" in osArch) -> "linux-aarch64"
    "linux" in osName -> "linux"
    else -> "win"
}

dependencies {
    implementation(compose.desktop.currentOs)
    implementation(compose.material3)
    implementation(compose.materialIconsExtended)
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-swing:1.11.0")

    implementation("io.ktor:ktor-client-core:3.5.2")
    implementation("io.ktor:ktor-client-okhttp:3.5.2")
    implementation("io.ktor:ktor-client-content-negotiation:3.5.2")
    implementation("io.ktor:ktor-serialization-kotlinx-json:3.5.2")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.11.0")

    implementation(files(prepareNewPipe.map { it.archiveFile }))
    implementation("com.github.TeamNewPipe:nanojson:e9d656ddb49a412a5a0a5d5ef20ca7ef09549996")
    implementation("org.jsoup:jsoup:1.22.2")
    implementation("com.google.code.findbugs:jsr305:3.0.2")
    implementation("com.google.protobuf:protobuf-javalite:4.35.0")
    implementation("org.graalvm.polyglot:polyglot:24.1.2")
    implementation("org.graalvm.polyglot:js-community:24.1.2")
    implementation("org.mozilla:rhino:1.8.1")
    implementation("org.mozilla:rhino-engine:1.8.1")

    implementation("org.xerial:sqlite-jdbc:3.47.1.0")
    implementation("org.json:json:20240303")
    implementation("org.jflac:jflac-codec:1.5.2")
    implementation("com.google.zxing:core:3.5.4")
    implementation("net.java.dev.jna:jna:5.17.0")

    implementation("com.materialkolor:material-kolor:4.0.0")
    implementation("dev.chrisbanes.haze:haze:1.7.1")

    implementation("io.coil-kt.coil3:coil-compose:3.0.4")
    implementation("io.coil-kt.coil3:coil-network-okhttp:3.0.4")

    implementation("org.bytedeco:javacv:1.5.12") {
        listOf("opencv", "openblas", "flycapture", "libdc1394", "libfreenect", "libfreenect2", "librealsense", "librealsense2",
            "videoinput", "artoolkitplus", "flandmark", "leptonica", "tesseract").forEach { exclude(group = "org.bytedeco", module = it) }
    }
    implementation("org.bytedeco:ffmpeg:7.1.1-1.5.12")
    implementation("org.bytedeco:ffmpeg:7.1.1-1.5.12:$bytedecoPlatform")
    implementation("org.bytedeco:javacpp:1.5.12:$bytedecoPlatform")

    for (module in listOf("base", "graphics", "media")) {
        implementation("org.openjfx:javafx-$module:21.0.5:$javafxPlatform")
    }

    testImplementation("junit:junit:4.13.2")
}

compose.desktop {
    application {
        mainClass = "com.opentune.desktop.MainKt"
        nativeDistributions {
            targetFormats(TargetFormat.Msi, TargetFormat.Exe)
            packageName = "Loopd"
            packageVersion = "1.0.$appVersionCode"
            description = "High-fidelity lossless music streaming for desktop"
            vendor = "Loopd"
            modules("java.instrument", "java.management", "java.net.http", "java.scripting", "java.sql", "jdk.crypto.ec", "jdk.dynalink", "jdk.httpserver", "jdk.jfr", "jdk.unsupported")
            windows {
                iconFile.set(project.file("packaging/icons/AppIcon.ico"))
                menuGroup = "Loopd"
                upgradeUuid = "6c1f6c2e-5a3b-4d34-9a51-0e9c1d8f2a71"
                shortcut = true
                menu = true
                perUserInstall = true
                dirChooser = true
            }
        }
    }
}
