package com.loopd.app

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class LoopdSpeechModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), RecognitionListener {

    private var speechRecognizer: SpeechRecognizer? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun getName(): String = "LoopdSpeechModule"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            if (reactContext.hasActiveReactInstance()) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(eventName, params)
            }
        } catch (_: Exception) {}
    }

    @ReactMethod
    fun isAvailable(promise: Promise) {
        mainHandler.post {
            try {
                val available = SpeechRecognizer.isRecognitionAvailable(reactContext)
                promise.resolve(available)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun startListening(language: String?, promise: Promise) {
        mainHandler.post {
            try {
                if (speechRecognizer == null) {
                    speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactContext).apply {
                        setRecognitionListener(this@LoopdSpeechModule)
                    }
                }

                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(
                        RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                        RecognizerIntent.LANGUAGE_MODEL_WEB_SEARCH
                    )
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 10)
                    putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 6000L)
                    putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2500L)
                    putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2000L)
                    val lang = if (!language.isNullOrEmpty()) language else "hi-IN"
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang)
                    putExtra("android.speech.extra.EXTRA_ADDITIONAL_LANGUAGES", arrayOf("en-IN", "hi-Latn", "en-US"))
                }

                speechRecognizer?.startListening(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("SPEECH_ERROR", e.localizedMessage)
            }
        }
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        mainHandler.post {
            try {
                speechRecognizer?.stopListening()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("STOP_ERROR", e.localizedMessage)
            }
        }
    }

    @ReactMethod
    fun destroy(promise: Promise) {
        mainHandler.post {
            try {
                speechRecognizer?.destroy()
                speechRecognizer = null
                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    // RecognitionListener callbacks
    override fun onReadyForSpeech(params: Bundle?) {
        val map = Arguments.createMap().apply { putBoolean("ready", true) }
        sendEvent("onSpeechStart", map)
    }

    override fun onBeginningOfSpeech() {
        val map = Arguments.createMap().apply { putBoolean("speaking", true) }
        sendEvent("onSpeechBeginning", map)
    }

    override fun onRmsChanged(rmsdB: Float) {
        val map = Arguments.createMap().apply { putDouble("rms", rmsdB.toDouble()) }
        sendEvent("onSpeechVolume", map)
    }

    override fun onBufferReceived(buffer: ByteArray?) {}

    override fun onEndOfSpeech() {
        val map = Arguments.createMap().apply { putBoolean("ended", true) }
        sendEvent("onSpeechEnd", map)
    }

    override fun onError(error: Int) {
        val errorMsg = when (error) {
            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
            SpeechRecognizer.ERROR_CLIENT -> "Client side error"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
            SpeechRecognizer.ERROR_NETWORK -> "Network error"
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
            SpeechRecognizer.ERROR_NO_MATCH -> "No speech match found"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognition service busy"
            SpeechRecognizer.ERROR_SERVER -> "Server error"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input detected"
            else -> "Unknown speech error ($error)"
        }
        val map = Arguments.createMap().apply {
            putInt("code", error)
            putString("message", errorMsg)
        }
        sendEvent("onSpeechError", map)
    }

    override fun onResults(results: Bundle?) {
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val text = matches?.firstOrNull() ?: ""
        val map = Arguments.createMap().apply {
            putString("text", text)
            val arr = Arguments.createArray()
            matches?.forEach { arr.pushString(it) }
            putArray("candidates", arr)
        }
        sendEvent("onSpeechResults", map)
    }

    override fun onPartialResults(partialResults: Bundle?) {
        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val text = matches?.firstOrNull() ?: ""
        val map = Arguments.createMap().apply {
            putString("text", text)
        }
        sendEvent("onSpeechPartialResults", map)
    }

    override fun onEvent(eventType: Int, params: Bundle?) {}
}
