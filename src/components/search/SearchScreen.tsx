/**
 * Search Screen — Loopd
 * Sticky search bar with dynamic Real-Time Voice Search, browse genre grid, live search results with tabs.
 * Fully responsive on mobile, laptop, and desktop.
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  StatusBar,
  Modal,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
  NativeModules,
  DeviceEventEmitter,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Image } from 'expo-image';
import {
  MagnifyingGlass,
  X,
  ClockCounterClockwise,
  Microphone,
  Waveform,
  Play,
  CheckCircle,
} from 'phosphor-react-native';
import { AudioModule } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Shape, Layout } from '../../theme';
import {
  FilterChips,
  ScalePressable,
  TrackItem,
  SectionHeader,
  EmptyState,
  CardSkeleton,
  TrackSkeleton,
  TrackActionModal,
} from '../ui';
import { useSearch, useGenres, useDebounce } from '../../hooks';
import { usePlayerStore } from '../../store/playerStore';
import { useLibraryStore } from '../../store/libraryStore';
import { cleanSmartSpeechToHinglish } from '../../utils/transliterate';
import type { Track } from '../../types';

// Vibrant genre colors (curated)
const GENRE_COLORS = [
  '#E13300', '#1E3264', '#148A08', '#DC148C',
  '#8C67AC', '#E61E32', '#BA5D07', '#0D73EC',
  '#477D95', '#7358FF', '#E8115B', '#503750',
  '#1DB954', '#A56C3C', '#5179A1', '#FF6437',
];

export interface SoundLyricMatch {
  title: string;
  lyric: string;
  artist: string;
}

const SOUND_LYRIC_MATCHES: SoundLyricMatch[] = [
  { title: 'Arz Kiya Hai', lyric: 'Naa Kahate The Kuchh Jo', artist: 'Anuv Jain' },
  { title: 'Gehra Hua', lyric: 'Kaayar Jo The Vo Shaayar Bane', artist: 'Dhurandhar' },
  { title: 'Tum Hi Ho', lyric: 'Kyunki Tum Hi Ho Ab Tum Hi Ho', artist: 'Arijit Singh' },
  { title: 'Kesariya', lyric: 'Kesariya Tera Ishq Hai Piya', artist: 'Brahmastra' },
  { title: 'Yeshanagula', lyric: 'The Paradise', artist: 'Anirudh' },
  { title: 'Lover', lyric: 'MoonChild Era', artist: 'Diljit Dosanjh' },
  { title: '295', lyric: 'Moosetape', artist: 'Sidhu Moose Wala' },
  { title: 'Pehla Nasha', lyric: 'Pehla Nasha Pehla Khumaar', artist: 'Udit Narayan' },
];

const AcousticSineWave = React.memo(({ isListening, volume = 0, width = 360 }: { isListening: boolean; volume?: number; width?: number }) => {
  const [, setTick] = useState(0);
  const phaseRef = useRef(0);
  const smoothVolRef = useRef(0);
  const targetVolRef = useRef(volume);
  targetVolRef.current = isListening ? volume : 0;

  useEffect(() => {
    let animId: number;
    const animate = () => {
      const target = targetVolRef.current;
      // Ultra-silky exponential moving average: smooth attack, gentle release
      const speed = target > smoothVolRef.current ? 0.16 : 0.05;
      smoothVolRef.current += (target - smoothVolRef.current) * speed;

      // Continuous, seamless phase advance that never resets
      phaseRef.current += isListening ? 0.022 + smoothVolRef.current * 0.020 : 0.015;
      setTick((t) => (t + 1) % 1000000);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isListening]);

  const height = 150;
  const centerY = height / 2;
  const w = Math.max(280, width);

  const curVol = smoothVolRef.current;
  const phase = phaseRef.current;

  // Harmonious, fixed fundamental frequencies
  const freq1 = 2.0;
  const freq2 = 2.8;
  const freq3 = 3.6;

  // Serene baseline in silence, organic liquid swell when speaking
  const dynamicAmp1 = (isListening ? 14 : 8) + curVol * 36;
  const dynamicAmp2 = (isListening ? 10 : 6) + curVol * 26;
  const dynamicAmp3 = (isListening ? 7 : 4) + curVol * 18;

  const buildPath = (amplitude: number, freq: number, phaseShift: number, harmonicWeight: number) => {
    const points: { x: number; y: number }[] = [];
    const steps = 44;
    for (let i = 0; i <= steps; i++) {
      const nx = i / steps;
      const x = nx * w;
      // Smooth windowing envelope so wave gently meets 0 at both borders
      const envelope = Math.sin(Math.PI * nx);
      // Pure sine fundamental + subtle voice harmonic ripple only when user is actively speaking
      const fundamental = Math.sin(nx * Math.PI * 2 * freq + phase + phaseShift);
      const harmonic = curVol > 0.01
        ? Math.sin(nx * Math.PI * 4 * freq + phase * 1.3) * (curVol * harmonicWeight)
        : 0;
      const y = centerY + (fundamental + harmonic) * amplitude * envelope;
      points.push({ x, y });
    }
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = ((prev.x + curr.x) / 2).toFixed(1);
      const midY = ((prev.y + curr.y) / 2).toFixed(1);
      d += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(1)}, ${midX} ${midY}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
    return d;
  };

  const path1 = buildPath(dynamicAmp1, freq1, 0, 0.28);
  const path2 = buildPath(dynamicAmp2, freq2, Math.PI * 0.55, 0.22);
  const path3 = buildPath(dynamicAmp3, freq3, Math.PI * 1.15, 0.16);

  return (
    <View style={{ width: w, height, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={w} height={height}>
        <Defs>
          <LinearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#1ED760" stopOpacity="0.1" />
            <Stop offset="25%" stopColor="#1ED760" stopOpacity="0.85" />
            <Stop offset="50%" stopColor="#1ED760" stopOpacity="1" />
            <Stop offset="75%" stopColor="#1ED760" stopOpacity="0.85" />
            <Stop offset="100%" stopColor="#1ED760" stopOpacity="0.1" />
          </LinearGradient>
          <LinearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#10B981" stopOpacity="0.05" />
            <Stop offset="30%" stopColor="#10B981" stopOpacity="0.75" />
            <Stop offset="50%" stopColor="#10B981" stopOpacity="0.9" />
            <Stop offset="70%" stopColor="#10B981" stopOpacity="0.75" />
            <Stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
          </LinearGradient>
          <LinearGradient id="waveGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#059669" stopOpacity="0.02" />
            <Stop offset="50%" stopColor="#059669" stopOpacity="0.45" />
            <Stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Path d={path3} stroke="url(#waveGrad3)" strokeWidth={1.5} fill="none" />
        <Path d={path2} stroke="url(#waveGrad2)" strokeWidth={2.4} fill="none" />
        <Path d={path1} stroke="url(#waveGrad1)" strokeWidth={3.2} fill="none" />
      </Svg>
    </View>
  );
});

export function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [query, setQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('All');
  const debouncedQuery = useDebounce(query, 300);

  const { playFromContext } = usePlayerStore();
  const { searchHistory, addSearchHistory, removeSearchHistory, clearSearchHistory } =
    useLibraryStore();

  const genres = useGenres();
  const search = useSearch(debouncedQuery, debouncedQuery.length > 1);

  const isSearching = query.length > 0;
  const [actionModalTrack, setActionModalTrack] = useState<Track | null>(null);

  // Dynamic Sound & Voice Search State
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('Listening... Speak any song or lyrics');
  const [audioLevel, setAudioLevel] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const audioLevelAnim = useRef(new Animated.Value(0)).current;
  const waveAnimValues = useRef([
    new Animated.Value(0.4),
    new Animated.Value(0.5),
    new Animated.Value(0.65),
    new Animated.Value(0.8),
    new Animated.Value(0.95),
    new Animated.Value(0.8),
    new Animated.Value(0.65),
    new Animated.Value(0.5),
    new Animated.Value(0.4),
  ]).current;
  const recognitionRef = useRef<any>(null);
  const audioStreamRef = useRef<any>(null);
  const audioCtxRef = useRef<any>(null);
  const animFrameRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);
  const autoStopTimerRef = useRef<any>(null);

  useEffect(() => {
    if (isListening) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      const waveDurations = [780, 640, 840, 580, 920, 620, 860, 680, 740];
      const waveMinMax = [
        [0.35, 0.75],
        [0.4, 0.85],
        [0.45, 0.95],
        [0.55, 1.05],
        [0.6, 1.15],
        [0.55, 1.05],
        [0.45, 0.95],
        [0.4, 0.85],
        [0.35, 0.75],
      ];

      const waveLoops = waveAnimValues.map((anim, idx) => {
        const [minV, maxV] = waveMinMax[idx];
        const dur = waveDurations[idx];
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: maxV,
              duration: dur,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: minV,
              duration: dur,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
        loop.start();
        return loop;
      });

      return () => {
        pulseLoop.stop();
        waveLoops.forEach((l) => l.stop());
      };
    } else {
      pulseAnim.setValue(1);
      waveAnimValues.forEach((anim) => anim.setValue(0.25));
      audioLevelAnim.setValue(0);
    }
  }, [isListening, pulseAnim, waveAnimValues, audioLevelAnim]);

  const { LoopdSpeechModule } = NativeModules;

  const stopAudioCapture = useCallback(() => {
    try {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (_) {}
      }
      if (Platform.OS === 'android' && LoopdSpeechModule) {
        LoopdSpeechModule.stopListening().catch(() => {});
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks?.().forEach((t: any) => t.stop?.());
        audioStreamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close?.();
        audioCtxRef.current = null;
      }
      setAudioLevel(0);
    } catch (_) {}
  }, []);

  const handleVoiceConfirm = useCallback((finalText?: string) => {
    const textToSearch = finalText || voiceTranscript;
    if (textToSearch && textToSearch.trim().length > 0) {
      const trimmed = textToSearch.trim();
      setQuery(trimmed);
      addSearchHistory(trimmed);
      try {
        if (Platform.OS === 'android' && LoopdSpeechModule) {
          LoopdSpeechModule.stopListening().catch(() => {});
        }
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } catch (_) {}
      stopAudioCapture();
      setIsListening(false);
      setVoiceModalVisible(false);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}
    }
  }, [voiceTranscript, addSearchHistory, stopAudioCapture]);

  const closeVoiceModal = useCallback(() => {
    try {
      if (Platform.OS === 'android' && LoopdSpeechModule) {
        LoopdSpeechModule.stopListening().catch(() => {});
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch (_) {}
    stopAudioCapture();
    setIsListening(false);
    setVoiceModalVisible(false);
  }, [stopAudioCapture]);

  // Android Native SpeechRecognizer Event Listeners
  useEffect(() => {
    if (Platform.OS === 'android') {
      const subStart = DeviceEventEmitter.addListener('onSpeechStart', () => {
        setIsListening(true);
        setVoiceStatus('Listening to you... Speak song or lyrics');
      });
      const subVol = DeviceEventEmitter.addListener('onSpeechVolume', (data: any) => {
        if (data && typeof data.rms === 'number') {
          // Strict acoustic noise gate: background silence (<= 2.2 dB) maps to pure 0
          const raw = data.rms;
          const norm = raw <= 2.2 ? 0 : Math.min(1, (raw - 2.2) / 6.5);
          setAudioLevel(norm);
          Animated.spring(audioLevelAnim, {
            toValue: norm,
            friction: 7,
            tension: 45,
            useNativeDriver: true,
          }).start();
        }
      });
      const subPartial = DeviceEventEmitter.addListener('onSpeechPartialResults', (data: any) => {
        if (data?.text) {
          const cleaned = cleanSmartSpeechToHinglish(data.text);
          setVoiceTranscript(cleaned);
          setVoiceStatus(cleaned);
        }
      });
      const subResults = DeviceEventEmitter.addListener('onSpeechResults', (data: any) => {
        const rawText = data?.text || data?.candidates?.[0] || '';
        if (rawText) {
          const cleaned = cleanSmartSpeechToHinglish(rawText, data?.candidates);
          setVoiceTranscript(cleaned);
          setIsListening(false);
          setVoiceStatus(`Searching "${cleaned}"...`);
          setTimeout(() => {
            handleVoiceConfirm(cleaned);
          }, 800);
        }
      });
      const subError = DeviceEventEmitter.addListener('onSpeechError', (data: any) => {
        setIsListening(false);
        setVoiceStatus(data?.message || 'Tap mic to speak again');
      });

      return () => {
        subStart.remove();
        subVol.remove();
        subPartial.remove();
        subResults.remove();
        subError.remove();
      };
    }
  }, [handleVoiceConfirm]);

  const startVoiceSearch = useCallback(async () => {
    setVoiceModalVisible(true);
    setVoiceTranscript('');
    setVoiceStatus('Listening... Speak any song or lyrics');
    setIsListening(true);
    setAudioLevel(0);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}

    // Check & request microphone permission on Native Android
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        if (AudioModule && typeof AudioModule.requestRecordingPermissionsAsync === 'function') {
          const res = await AudioModule.requestRecordingPermissionsAsync();
          if (res.status !== 'granted') {
            setVoiceStatus('Microphone permission required. Tap below to search.');
            return;
          }
        }
      } catch (err) {
        console.warn('[VoiceSearch] Native permission request:', err);
      }
    }

    // Android Native Speech Recognizer
    if (Platform.OS === 'android' && LoopdSpeechModule) {
      try {
        await LoopdSpeechModule.startListening('hi-IN');
        return;
      } catch (err) {
        console.warn('[VoiceSearch] Native LoopdSpeechModule error:', err);
      }
    }

    // Live Web Audio API stream visualizer (Web & Electron)
    if (typeof window !== 'undefined' && navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        audioStreamRef.current = stream;
        setVoiceStatus('Listening... Speak any song or lyrics');

        const AudioContextClass =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          audioCtxRef.current = ctx;
          if (ctx.state === 'suspended') {
            await ctx.resume().catch(() => {});
          }
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.3;
          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateMeter = () => {
            if (!analyser) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(1, avg / 50));
            animFrameRef.current = requestAnimationFrame(updateMeter);
          };
          updateMeter();
        }

      } catch (err: any) {
        console.warn('[VoiceSearch] getUserMedia permission error:', err);
        setIsListening(false);
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setVoiceStatus('Microphone permission blocked. Please check Windows Settings.');
        } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
          setVoiceStatus('No microphone detected. Please connect a microphone.');
        } else {
          setVoiceStatus('Microphone access failed. Tap to try again.');
        }
      }
    }

    // Native Web Speech API (Built-in Chromium, Edge, Chrome, Electron)
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognitionRef.current = recognition;
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = 'hi-IN';

          recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }
            if (transcript) {
              const cleaned = cleanSmartSpeechToHinglish(transcript);
              setVoiceTranscript(cleaned);
              setVoiceStatus(cleaned);
              if (event.results[0]?.isFinal) {
                setIsListening(false);
                setVoiceStatus(`Searching "${cleaned}"...`);
                setTimeout(() => {
                  handleVoiceConfirm(cleaned);
                }, 700);
              }
            }
          };

          recognition.onerror = (event: any) => {
            console.warn('[VoiceSearch] SpeechRecognition error:', event.error);
            if (event.error === 'not-allowed') {
              setVoiceStatus('Microphone permission blocked. Tap to try again.');
            } else if (event.error === 'no-speech') {
              setVoiceStatus('No speech detected. Tap mic to try again');
            } else {
              setVoiceStatus('Listening... Speak any song or artist');
            }
          };

          recognition.onend = () => {
            setIsListening(false);
            stopAudioCapture();
          };

          recognition.start();
          return;
        } catch (e) {
          console.warn('[VoiceSearch] SpeechRecognition start:', e);
        }
      }
    }

    // Safety fallback listening timer (25s so user is never rushed)
    setTimeout(() => {
      setIsListening(false);
    }, 25000);
  }, [pulseAnim, LoopdSpeechModule]);

  const handleTrackPress = useCallback(
    (track: Track) => {
      addSearchHistory(query);
      const trackList = search.data?.tracks || [track];
      const idx = trackList.findIndex((t) => t.id === track.id);
      playFromContext(trackList, idx >= 0 ? idx : 0, 'Search');
    },
    [playFromContext, query, search.data]
  );

  const handleHistoryPress = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const filteredResults = useMemo(() => {
    if (!search.data) return null;
    return search.data;
  }, [search.data, searchFilter]);

  // Responsive genre card calculation
  const containerMaxWidth = 1200;
  const currentContentWidth = Math.min(width, containerMaxWidth);
  const genreColumns = isDesktop ? 4 : 2;
  const genreCardWidth = (currentContentWidth - 32 - (genreColumns - 1) * 12) / genreColumns;

  return (
    <View style={[styles.screen, { paddingTop: isDesktop ? 20 : insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Search bar header */}
      <View
        style={[
          styles.searchBarContainer,
          isDesktop && { maxWidth: 640, alignSelf: 'center', width: '100%' },
        ]}
      >
        <View style={styles.searchBar}>
          <MagnifyingGlass size={20} color={Colors.textMuted} weight="regular" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="What do you want to play? (Song, Artist, Album)"
            placeholderTextColor={Colors.textMuted}
            selectionColor={Colors.primary}
            returnKeyType="search"
            autoCorrect={false}
            onSubmitEditing={() => {
              if (query.length > 1) addSearchHistory(query);
            }}
          />
          {query.length > 0 ? (
            <ScalePressable onPress={() => setQuery('')} hitSlop={8}>
              <X size={20} color={Colors.textSecondary} weight="bold" />
            </ScalePressable>
          ) : (
            <ScalePressable
              onPress={startVoiceSearch}
              style={styles.micButton}
              hitSlop={8}
            >
              <Microphone size={20} color="#1ED760" weight="fill" />
            </ScalePressable>
          )}
        </View>
      </View>

      {isSearching ? (
        // Search results
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop && { maxWidth: 1200, alignSelf: 'center', width: '100%', paddingHorizontal: 24 },
            { paddingBottom: isDesktop ? 120 : Layout.tabBarHeight + Layout.miniPlayerHeight + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search filter chips */}
          <FilterChips
            chips={['All', 'Songs', 'Artists', 'Albums']}
            activeChip={searchFilter}
            onSelect={setSearchFilter}
          />

          {search.isLoading ? (
            <View>
              {Array.from({ length: 6 }).map((_, i) => (
                <TrackSkeleton key={i} />
              ))}
            </View>
          ) : filteredResults ? (
            <>
              {/* Top result */}
              {(searchFilter === 'All' || searchFilter === 'Songs') &&
                filteredResults.tracks.length > 0 && (
                  <>
                    <SectionHeader title="Top Result" />
                    <ScalePressable
                      style={styles.topResultCard}
                      onPress={() => handleTrackPress(filteredResults.tracks[0])}
                      haptic
                    >
                      <Image
                        source={{ uri: filteredResults.tracks[0].artwork }}
                        style={styles.topResultArt}
                        contentFit="cover"
                        transition={200}
                      />
                      <Text style={styles.topResultTitle} numberOfLines={1}>
                        {filteredResults.tracks[0].title}
                      </Text>
                      <Text style={styles.topResultSubtitle} numberOfLines={1}>
                        {filteredResults.tracks[0].artist} • Song
                      </Text>
                    </ScalePressable>
                  </>
                )}

              {/* Songs List */}
              {(searchFilter === 'All' || searchFilter === 'Songs') &&
                filteredResults.tracks.length > 0 && (
                  <>
                    <SectionHeader title="Songs" />
                    {filteredResults.tracks.slice(0, searchFilter === 'All' ? 8 : 25).map((track) => (
                      <TrackItem
                        key={track.id}
                        track={track}
                        onPress={handleTrackPress}
                        onMore={(t) => setActionModalTrack(t)}
                      />
                    ))}
                  </>
                )}

              {/* Artists */}
              {(searchFilter === 'All' || searchFilter === 'Artists') &&
                filteredResults.artists.length > 0 && (
                  <>
                    <SectionHeader title="Artists" />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.artistsRow}
                    >
                      {filteredResults.artists.slice(0, 10).map((artist) => (
                        <ScalePressable
                          key={artist.id}
                          style={styles.artistCard}
                          onPress={() => router.push(`/artist/${artist.id}` as any)}
                          haptic
                        >
                          <Image
                            source={{ uri: artist.image }}
                            style={styles.artistImage}
                            contentFit="cover"
                            transition={200}
                          />
                          <Text style={styles.artistName} numberOfLines={1}>
                            {artist.name}
                          </Text>
                          <Text style={styles.artistSub}>Artist</Text>
                        </ScalePressable>
                      ))}
                    </ScrollView>
                  </>
                )}

              {/* Albums */}
              {(searchFilter === 'All' || searchFilter === 'Albums') &&
                filteredResults.albums.length > 0 && (
                  <>
                    <SectionHeader title="Albums" />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.artistsRow}
                    >
                      {filteredResults.albums.slice(0, 10).map((album) => (
                        <ScalePressable
                          key={album.id}
                          style={styles.albumCard}
                          onPress={() => router.push(`/album/${album.id}` as any)}
                          haptic
                        >
                          <Image
                            source={{ uri: album.artwork }}
                            style={styles.albumImage}
                            contentFit="cover"
                            transition={200}
                          />
                          <Text style={styles.artistName} numberOfLines={1}>
                            {album.title}
                          </Text>
                          <Text style={styles.artistSub} numberOfLines={1}>
                            {album.artist}
                          </Text>
                        </ScalePressable>
                      ))}
                    </ScrollView>
                  </>
                )}

              {filteredResults.tracks.length === 0 &&
                filteredResults.artists.length === 0 &&
                filteredResults.albums.length === 0 && (
                  <EmptyState
                    title={`No results for "${query}"`}
                    message="Check the spelling, or try different keywords like an artist or song name"
                  />
                )}
            </>
          ) : null}
        </ScrollView>
      ) : (
        // Browse all (genre grid) + search history
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop && { maxWidth: 1200, alignSelf: 'center', width: '100%', paddingHorizontal: 24 },
            { paddingBottom: isDesktop ? 120 : Layout.tabBarHeight + Layout.miniPlayerHeight + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search history */}
          {searchHistory.length > 0 && (
            <>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Recent searches</Text>
                <ScalePressable onPress={clearSearchHistory}>
                  <Text style={styles.clearText}>Clear all</Text>
                </ScalePressable>
              </View>
              {searchHistory.slice(0, 6).map((q) => (
                <ScalePressable
                  key={q}
                  style={styles.historyItem}
                  onPress={() => handleHistoryPress(q)}
                >
                  <ClockCounterClockwise size={18} color={Colors.textSecondary} weight="regular" />
                  <Text style={styles.historyText}>{q}</Text>
                  <ScalePressable
                    onPress={() => removeSearchHistory(q)}
                    hitSlop={8}
                    style={styles.historyRemove}
                  >
                    <X size={16} color={Colors.textMuted} />
                  </ScalePressable>
                </ScalePressable>
              ))}
            </>
          )}

          {/* Browse all genre cards */}
          <SectionHeader title="Browse all genres" />
          <View style={styles.genreGrid}>
            {genres.isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <View key={i} style={[styles.genreCardPlaceholder, { width: genreCardWidth }]}>
                    <CardSkeleton size={genreCardWidth} />
                  </View>
                ))
              : (genres.data || []).map((genre, idx) => (
                  <ScalePressable
                    key={genre.id}
                    style={[
                      styles.genreCard,
                      {
                        width: genreCardWidth,
                        backgroundColor:
                          genre.color || GENRE_COLORS[idx % GENRE_COLORS.length],
                      },
                    ]}
                    onPress={() => router.push(`/genre/${genre.id}` as any)}
                    haptic
                  >
                    <Text style={styles.genreText}>{genre.name}</Text>
                    {genre.image && (
                      <Image
                        source={{ uri: genre.image }}
                        style={styles.genreImage}
                        contentFit="cover"
                        transition={200}
                      />
                    )}
                  </ScalePressable>
                ))}
          </View>
        </ScrollView>
      )}

      {/* IMMERSIVE STUDIO VOICE SEARCH (FULL-SCREEN FLUID EXPERIENCE) */}
      <Modal
        visible={voiceModalVisible}
        transparent={false}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeVoiceModal}
      >
        <View style={[styles.voiceStudioScreen, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
          <StatusBar barStyle="light-content" />

          {/* Top Bar with Minimal Close */}
          <View style={styles.voiceStudioHeader}>
            <View style={{ width: 40 }} />
            <Pressable
              style={styles.voiceStudioCloseBtn}
              onPress={closeVoiceModal}
              hitSlop={16}
            >
              <X size={20} color="#FFFFFF" weight="bold" />
            </Pressable>
          </View>

          {/* Top Subtle Ambient Glow */}
          <View style={styles.voiceStudioAmbientTopGlow} pointerEvents="none" />

          {/* Center Stage: Image 3 Sinusoidal Wave Strings & Clean Typography */}
          <View style={styles.voiceStudioCenter}>
            {/* The Continuous Fluid Sinusoidal Wave (Image 3 Left Screen) */}
            <AcousticSineWave
              isListening={isListening}
              volume={audioLevel}
              width={width - 48}
            />

            {/* Real-time Spoken Words or Clean Image 3 Typography */}
            <View style={styles.voiceStudioTextBox}>
              {voiceTranscript.trim().length > 0 ? (
                <>
                  <Text style={styles.voiceStudioRecognizedText} numberOfLines={2}>
                    "{voiceTranscript}"
                  </Text>
                  <Text style={styles.voiceStudioSubText}>Tap search or continue speaking</Text>
                </>
              ) : (
                <>
                  <Text style={styles.voiceStudioPromptTitle}>
                    Say a song title or artist name
                  </Text>
                  <Text style={styles.voiceStudioSubText}>
                    {voiceStatus || (isListening ? 'Listening... Speak now' : 'Tap button below to start')}
                  </Text>
                </>
              )}
            </View>

            {/* Direct Instant Search Action (Appears when user spoke) */}
            {voiceTranscript.trim().length > 0 && (
              <ScalePressable
                style={styles.voiceStudioConfirmBtn}
                onPress={() => handleVoiceConfirm()}
                haptic
              >
                <MagnifyingGlass size={18} color="#000000" weight="bold" />
                <Text style={styles.voiceStudioConfirmText}>Search Song</Text>
              </ScalePressable>
            )}
          </View>

          {/* Bottom Action: Image 3 Style Squircle Button */}
          <View style={styles.voiceStudioBottom}>
            <ScalePressable
              style={[
                styles.voiceStudioSquircleBtn,
                isListening ? styles.voiceStudioSquircleBtnStop : styles.voiceStudioSquircleBtnStart,
              ]}
              onPress={() => {
                if (isListening) {
                  setIsListening(false);
                  stopAudioCapture();
                } else {
                  startVoiceSearch();
                }
              }}
              haptic
            >
              {isListening ? (
                <X size={26} color="#FFFFFF" weight="bold" />
              ) : (
                <Microphone size={26} color="#000000" weight="fill" />
              )}
            </ScalePressable>

            <Text style={styles.voiceStudioHintText}>
              {isListening ? 'Tap to stop' : 'Tap to speak'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* 3-Dot Options Action Modal for Tracks */}
      <TrackActionModal
        track={actionModalTrack}
        visible={Boolean(actionModalTrack)}
        onClose={() => setActionModalTrack(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  searchBarContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderTopColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.body,
    color: '#FFFFFF',
    height: '100%',
    padding: 0,
    outlineStyle: 'none' as any,
  },
  micButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 215, 96, 0.12)',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  historyTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.trackTitle,
    color: Colors.textPrimary,
  },
  clearText: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 12,
    gap: 12,
  },
  historyText: {
    flex: 1,
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
  },
  historyRemove: {
    padding: 4,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.screenPadding,
    gap: 12,
  },
  genreCard: {
    height: 104,
    borderRadius: 16,
    padding: 12,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  genreCardPlaceholder: {
    height: 104,
  },
  genreText: {
    fontFamily: Typography.fonts.extraBold,
    fontSize: 16,
    color: '#FFFFFF',
    zIndex: 2,
    maxWidth: '70%',
    lineHeight: 20,
  },
  genreImage: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    width: 72,
    height: 72,
    borderRadius: 8,
    transform: [{ rotate: '24deg' }],
  },
  topResultCard: {
    marginHorizontal: Spacing.screenPadding,
    backgroundColor: Colors.card,
    borderRadius: Shape.radiusMd,
    padding: 16,
    marginTop: 4,
  },
  topResultArt: {
    width: 80,
    height: 80,
    borderRadius: Shape.cardRadius,
    backgroundColor: Colors.highlight,
    marginBottom: 12,
  },
  topResultTitle: {
    fontFamily: Typography.fonts.extraBold,
    fontSize: Typography.sizes.screenTitle,
    color: Colors.textPrimary,
  },
  topResultSubtitle: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.subtitle,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  artistsRow: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 16,
  },
  artistCard: {
    alignItems: 'center',
    width: 120,
  },
  artistImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.card,
  },
  artistName: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.subtitle,
    color: Colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  artistSub: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  albumCard: {
    width: 150,
  },
  albumImage: {
    width: 150,
    height: 150,
    borderRadius: Shape.cardRadius,
    backgroundColor: Colors.card,
  },

  /* Immersive Studio Voice Search */
  voiceStudioScreen: {
    flex: 1,
    backgroundColor: '#07090E',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  voiceStudioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  voiceStudioCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceStudioCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  voiceStudioAmbientTopGlow: {
    position: 'absolute',
    top: -60,
    alignSelf: 'center',
    width: 320,
    height: 180,
    borderRadius: 160,
    backgroundColor: '#1ED760',
    opacity: 0.12,
  },
  voiceStudioTextBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
    paddingHorizontal: 20,
    minHeight: 80,
  },
  voiceStudioPromptTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  voiceStudioRecognizedText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  voiceStudioSubText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  voiceStudioConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1ED760',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 24,
    shadowColor: '#1ED760',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  voiceStudioConfirmText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
  },
  voiceStudioBottom: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 28,
  },
  voiceStudioSquircleBtn: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 10,
  },
  voiceStudioSquircleBtnStop: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  voiceStudioSquircleBtnStart: {
    backgroundColor: '#1ED760',
    shadowColor: '#1ED760',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 6,
  },
  voiceStudioHintText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
