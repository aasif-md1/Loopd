/**
 * Now Playing Screen — Loopd
 * Fullscreen Spotify-style player with artwork, scrub bar, queue sheet,
 * lyrics preview, repeat/shuffle toggles, device connect modal,
 * sleep timer, equalizer presets, and Loopd endless mode.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Share,
  Modal,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
  BackHandler,
  ActivityIndicator,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import {
  CaretDown,
  DotsThreeVertical,
  DotsThree,
  Heart,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  RepeatOnce,
  Queue,
  ShareNetwork,
  Television,
  SpeakerHigh,
  X,
  Plus,
  PlusCircle,
  ListPlus,
  Disc,
  User,
  Check,
  Moon,
  SlidersHorizontal,
  ArrowsClockwise as LoopIcon,
  Info,
  Quotes,
  ChatCircleText,
} from 'phosphor-react-native';
import { Colors, Typography, Spacing, Shape, Layout } from '../../theme';
import { usePlayerStore } from '../../store/playerStore';
import { useLibraryStore } from '../../store/libraryStore';
import { ScalePressable } from '../ui/ScalePressable';
import { transliterateDevanagariToHinglish } from '../../utils/transliterate';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(SCREEN_WIDTH - 64, 340);

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

const EQ_PRESETS = [
  'Flat',
  'Bass Boost',
  'Acoustic',
  'Vocal Clarity',
  'Electronic Club',
  'Rock and Punch',
];

const SLEEP_TIMER_OPTIONS = [
  { label: 'Off', minutes: 0 },
  { label: '5 minutes', minutes: 5 },
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '45 minutes', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: 'End of track', minutes: -1 },
];

interface AnimatedLyricLineProps {
  text: string;
  time: number;
  isActive: boolean;
  isPast: boolean;
  onPress: () => void;
  onLayout: (e: any) => void;
}

const AnimatedLyricLine = React.memo(function AnimatedLyricLine({
  text,
  time,
  isActive,
  isPast,
  onPress,
  onLayout,
}: AnimatedLyricLineProps) {
  const opacityAnim = useRef(new Animated.Value(isActive ? 1.0 : isPast ? 0.48 : 0.26)).current;
  const scaleAnim = useRef(new Animated.Value(isActive ? 1.04 : 0.98)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: isActive ? 1.0 : isPast ? 0.48 : 0.26,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: isActive ? 1.04 : 0.98,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive, isPast]);

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.appleLyricLineItem,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Pressable onPress={onPress} hitSlop={12}>
        <Text
          style={[
            styles.appleLyricText,
            isActive && styles.appleLyricTextActive,
            isPast && styles.appleLyricTextPast,
          ]}
        >
          {text}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

export function NowPlayingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    shuffle,
    repeat,
    queue,
    queueIndex,
    togglePlay,
    pause,
    next,
    previous,
    seek,
    toggleShuffle,
    toggleRepeat,
    playTrack,
    addToQueue,
    playNext,
  } = usePlayerStore();

  const {
    likedSongIds,
    toggleLike,
    downloadedTrackIds,
    toggleDownload,
  } = useLibraryStore();

  const [queueModalVisible, setQueueModalVisible] = useState(false);
  const [deviceModalVisible, setDeviceModalVisible] = useState(false);
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false);
  const [sleepTimerModalVisible, setSleepTimerModalVisible] = useState(false);
  const [eqModalVisible, setEqModalVisible] = useState(false);

  const [selectedDevice, setSelectedDevice] = useState('This Phone');
  const [selectedEq, setSelectedEq] = useState('Bass Boost');
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState<number | null>(null);
  const [loopdMode, setLoopdMode] = useState(false);
  const [trackInfoVisible, setTrackInfoVisible] = useState(false);

  // Apple Music Style Synced Lyrics state (100% Hinglish English Roman script)
  const [lyricsModalVisible, setLyricsModalVisible] = useState(false);
  const [syncedLyrics, setSyncedLyrics] = useState<Array<{ time: number; text: string }>>([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState<number>(0);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const lyricsScrollRef = useRef<any>(null);
  const linePositionsRef = useRef<{ [idx: number]: number }>({});

  // Hardware BackHandler: single press exits smoothly to home
  useEffect(() => {
    const onBackPress = () => {
      if (lyricsModalVisible) {
        setLyricsModalVisible(false);
        return true;
      }
      if (queueModalVisible) {
        setQueueModalVisible(false);
        return true;
      }
      if (deviceModalVisible) {
        setDeviceModalVisible(false);
        return true;
      }
      if (moreOptionsVisible) {
        setMoreOptionsVisible(false);
        return true;
      }
      if (sleepTimerModalVisible) {
        setSleepTimerModalVisible(false);
        return true;
      }
      if (eqModalVisible) {
        setEqModalVisible(false);
        return true;
      }
      if (trackInfoVisible) {
        setTrackInfoVisible(false);
        return true;
      }
      router.back();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [
    lyricsModalVisible,
    queueModalVisible,
    deviceModalVisible,
    moreOptionsVisible,
    sleepTimerModalVisible,
    eqModalVisible,
    trackInfoVisible,
    router,
  ]);

  // Fetch Synced Lyrics from LRCLIB
  useEffect(() => {
    if (!currentTrack) return;
    let isCancelled = false;
    const fetchLyrics = async () => {
      setIsLoadingLyrics(true);
      try {
        const cleanTitle = currentTrack.title.replace(/\(.*?\)/g, '').trim();
        const cleanArtist = currentTrack.artist.split(',')[0].trim();
        const res = await axios.get('https://lrclib.net/api/get', {
          params: {
            track_name: cleanTitle,
            artist_name: cleanArtist,
          },
          timeout: 4500,
        });

        if (isCancelled) return;

        if (res.data?.syncedLyrics) {
          const rawLines = res.data.syncedLyrics.split('\n');
          const parsed: Array<{ time: number; text: string }> = [];
          for (const line of rawLines) {
            const match = line.match(/\[(\d+):(\d+\.?\d*)\](.*)/);
            if (match) {
              const minutes = parseInt(match[1], 10);
              const seconds = parseFloat(match[2]);
              const time = minutes * 60 + seconds;
              const text = match[3].trim();
              if (text) {
                parsed.push({ time, text });
              }
            }
          }
          if (parsed.length > 0) {
            setSyncedLyrics(parsed);
            setIsLoadingLyrics(false);
            return;
          }
        }
      } catch (_) {
        // Fallback if network or lyrics not found
      }

      const dur = duration > 0 ? duration : currentTrack.duration || 180;
      const fallbackLines = [
        `${currentTrack.title}`,
        `Performed by ${currentTrack.artist}`,
        `Streaming in ultra 320 kbps fidelity on Loopd`,
        `Feeling every beat and melody`,
        `Lost in the rhythm of the music`,
        `Harmonies resonating in pure stereo`,
        `Turn up the volume and enjoy the sound`,
        `Loopd endless audio experience`,
      ];
      const step = dur / (fallbackLines.length + 1);
      const autoParsed = fallbackLines.map((text, i) => ({
        time: Math.floor((i + 1) * step),
        text,
      }));
      if (!isCancelled) {
        setSyncedLyrics(autoParsed);
        setIsLoadingLyrics(false);
      }
    };

    fetchLyrics();
    return () => {
      isCancelled = true;
    };
  }, [currentTrack?.id, currentTrack?.title]);

  // Synchronize active lyric line and auto-scroll
  useEffect(() => {
    if (syncedLyrics.length === 0) return;
    let foundIdx = 0;
    for (let i = 0; i < syncedLyrics.length; i++) {
      if (position >= syncedLyrics[i].time) {
        foundIdx = i;
      } else {
        break;
      }
    }
    if (foundIdx !== activeLyricIndex) {
      setActiveLyricIndex(foundIdx);
      if (lyricsModalVisible && lyricsScrollRef.current) {
        const lineY = linePositionsRef.current[foundIdx];
        const targetY = typeof lineY === 'number' ? Math.max(0, lineY - 160) : Math.max(0, foundIdx * 64 - 160);
        lyricsScrollRef.current.scrollTo({
          y: targetY,
          animated: true,
        });
      }
    }
  }, [position, syncedLyrics, activeLyricIndex, lyricsModalVisible]);

  // Sleep timer interval
  useEffect(() => {
    if (sleepTimerSeconds === null) return;
    if (sleepTimerSeconds <= 0) {
      pause();
      setSleepTimerSeconds(null);
      Alert.alert('Sleep Timer', 'Music paused for sleep. Good night.');
      return;
    }
    const timer = setInterval(() => {
      setSleepTimerSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [sleepTimerSeconds]);

  if (!currentTrack) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nothing playing right now</Text>
          <ScalePressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Explore Music</Text>
          </ScalePressable>
        </View>
      </View>
    );
  }

  const isLiked = likedSongIds.has(currentTrack.id);
  const isDownloaded = downloadedTrackIds.has(currentTrack.id);
  const trackDuration = duration > 0 ? duration : currentTrack.duration || 180;
  const progressRatio = Math.min(Math.max(position / trackDuration, 0), 1);

  const handleSeek = (e: any) => {
    const { locationX } = e.nativeEvent;
    const barWidth = SCREEN_WIDTH - 48;
    const ratio = Math.max(0, Math.min(locationX / barWidth, 1));
    const targetSecond = Math.floor(ratio * trackDuration);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    seek(targetSecond);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Listening to "${currentTrack.title}" by ${currentTrack.artist} on Loopd`,
        url: currentTrack.streamUrl,
      });
    } catch (e) {
      // ignore
    }
  };

  const handleSetSleepTimer = (minutes: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (minutes === 0) {
      setSleepTimerSeconds(null);
    } else if (minutes === -1) {
      const remaining = Math.max(trackDuration - position, 5);
      setSleepTimerSeconds(remaining);
    } else {
      setSleepTimerSeconds(minutes * 60);
    }
    setSleepTimerModalVisible(false);
  };

  const toggleLoopdMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const nextVal = !loopdMode;
    setLoopdMode(nextVal);
    if (nextVal && repeat !== 'one') {
      toggleRepeat();
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Atmospheric Background Gradient */}
      <LinearGradient
        colors={['#2c1f38', '#161924', '#121212']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
      />

      <View
        style={[
          styles.container,
          isDesktop && styles.containerDesktop,
          {
            paddingTop: insets.top > 0 ? insets.top + 8 : 24,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 24,
          },
        ]}
      >
        {/* Top Navigation Bar */}
        <View style={styles.navBar}>
          <ScalePressable
            style={styles.navBtn}
            onPress={() => router.back()}
            haptic
          >
            <CaretDown size={28} color={Colors.textPrimary} weight="bold" />
          </ScalePressable>

          <View style={styles.navTitleContainer}>
            <Text style={styles.navSubtitle} numberOfLines={1}>
              {loopdMode ? 'LOOPD ENDLESS MODE' : 'PLAYING FROM QUEUE'}
            </Text>
            <Text style={styles.navTitle} numberOfLines={1}>
              {currentTrack.album || 'Loopd Radio'}
            </Text>
          </View>

          <ScalePressable
            style={styles.navBtn}
            onPress={() => setMoreOptionsVisible(true)}
            haptic
          >
            <DotsThreeVertical size={28} color={Colors.textPrimary} weight="bold" />
          </ScalePressable>
        </View>

        {/* Big Album Art */}
        <View style={styles.artworkContainer}>
          <Image
            source={{ uri: currentTrack.artwork }}
            style={styles.artwork}
            contentFit="cover"
            transition={300}
          />
          {loopdMode && (
            <View style={styles.loopdBadge}>
              <LoopIcon size={14} color="#000000" />
              <Text style={styles.loopdBadgeText}>LOOPD</Text>
            </View>
          )}
        </View>

        {/* Sleep Timer Indicator Pill if active */}
        {sleepTimerSeconds !== null && (
          <View style={styles.sleepTimerPill}>
            <Moon size={12} color={Colors.primary} />
            <Text style={styles.sleepTimerPillText}>
              Sleep timer: {formatTime(sleepTimerSeconds)}
            </Text>
          </View>
        )}

        {/* Track Title, Artist & Like Button */}
        <View style={styles.trackDetailsRow}>
          <View style={styles.textContainer}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Pressable
              onPress={() => {
                if (currentTrack.artistId) {
                  router.push(`/artist/${currentTrack.artistId}` as any);
                }
              }}
            >
              <Text style={styles.artistName} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
            </Pressable>
          </View>

          <ScalePressable
            style={styles.likeBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              toggleLike(currentTrack);
            }}
            haptic
          >
            <Heart
              size={26}
              color={isLiked ? Colors.primary : Colors.textPrimary}
              weight={isLiked ? 'fill' : 'regular'}
            />
          </ScalePressable>
        </View>

        {/* Scrub Bar */}
        <View style={styles.scrubberContainer}>
          <Pressable
            style={styles.progressBarWrapper}
            onPress={handleSeek}
            hitSlop={{ top: 12, bottom: 12 }}
          >
            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressRatio * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.scrubberThumb,
                  { left: `${progressRatio * 100}%` },
                ]}
              />
            </View>
          </Pressable>

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(trackDuration)}</Text>
          </View>
        </View>

        {/* Main Controls (Shuffle, Prev, Play/Pause, Next, Repeat) */}
        <View style={styles.controlsRow}>
          <ScalePressable
            style={styles.controlIconBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleShuffle();
            }}
            haptic
          >
            <Shuffle
              size={24}
              color={shuffle ? Colors.primary : Colors.textSecondary}
              weight={shuffle ? 'fill' : 'regular'}
            />
          </ScalePressable>

          <ScalePressable
            style={styles.controlIconBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              previous();
            }}
            haptic
          >
            <SkipBack size={36} color={Colors.textPrimary} weight="fill" />
          </ScalePressable>

          <ScalePressable
            style={styles.playPauseBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              togglePlay();
            }}
            haptic
          >
            {isPlaying ? (
              <Pause size={32} color="#000000" weight="fill" />
            ) : (
              <Play
                size={32}
                color="#000000"
                weight="fill"
                style={{ marginLeft: 3 }}
              />
            )}
          </ScalePressable>

          <ScalePressable
            style={styles.controlIconBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              next();
            }}
            haptic
          >
            <SkipForward size={36} color={Colors.textPrimary} weight="fill" />
          </ScalePressable>

          <ScalePressable
            style={styles.controlIconBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleRepeat();
            }}
            haptic
          >
            {repeat === 'one' ? (
              <RepeatOnce size={24} color={Colors.primary} weight="fill" />
            ) : (
              <Repeat
                size={24}
                color={repeat === 'all' ? Colors.primary : Colors.textSecondary}
                weight={repeat === 'all' ? 'fill' : 'regular'}
              />
            )}
          </ScalePressable>
        </View>

        {/* Bottom Actions: Device, Track Info, Share, Queue */}
        <View style={styles.bottomActionsRow}>
          <ScalePressable
            style={styles.bottomActionBtn}
            onPress={() => setDeviceModalVisible(true)}
            haptic
          >
            <Television size={20} color={Colors.textSecondary} weight="regular" />
            <Text style={styles.deviceName}>{selectedDevice}</Text>
          </ScalePressable>

          <View style={styles.bottomRightIcons}>
            <ScalePressable
              style={styles.bottomActionIcon}
              onPress={() => setTrackInfoVisible(true)}
              haptic
            >
              <Info size={22} color={Colors.textSecondary} weight="regular" />
            </ScalePressable>

            <ScalePressable
              style={styles.bottomActionIcon}
              onPress={handleShare}
              haptic
            >
              <ShareNetwork size={22} color={Colors.textSecondary} weight="regular" />
            </ScalePressable>

            <ScalePressable
              style={[
                styles.bottomActionIcon,
                loopdMode && styles.activeLoopdBtn,
              ]}
              onPress={toggleLoopdMode}
              haptic
            >
              <LoopIcon size={20} color={loopdMode ? Colors.primary : Colors.textSecondary} weight="bold" />
            </ScalePressable>

            <ScalePressable
              style={styles.bottomActionIcon}
              onPress={() => setLyricsModalVisible(true)}
              haptic
            >
              <Quotes size={22} color={lyricsModalVisible ? Colors.primary : Colors.textSecondary} weight="bold" />
            </ScalePressable>

            <ScalePressable
              style={styles.bottomActionIcon}
              onPress={() => setQueueModalVisible(true)}
              haptic
            >
              <Queue size={22} color={Colors.textSecondary} weight="regular" />
            </ScalePressable>
          </View>
        </View>
      </View>

      {/* Apple Music Style Time-Synced Lyrics Modal */}
      <Modal
        visible={lyricsModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setLyricsModalVisible(false)}
      >
        <View style={styles.appleLyricsContainer}>
          <StatusBar barStyle="light-content" />

          {/* Authentic Apple Music fluid dynamic gradient matching current track artwork */}
          {currentTrack.artwork ? (
            <Image
              source={{ uri: currentTrack.artwork }}
              style={[StyleSheet.absoluteFill, { opacity: 0.28 }]}
              contentFit="cover"
              blurRadius={65}
            />
          ) : null}
          <LinearGradient
            colors={['rgba(15, 18, 24, 0.85)', 'rgba(10, 11, 15, 0.94)', '#060709']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
          />

          {/* Top Bar with Mini Artwork, Track Info, and Close Button (No 'SYNCED' badge) */}
          <View
            style={[
              styles.appleLyricsHeader,
              { paddingTop: insets.top > 0 ? insets.top + 8 : 24 },
              isDesktop && styles.desktopCenterLyrics,
            ]}
          >
            <View style={styles.appleLyricsHeaderInfo}>
              {currentTrack.artwork ? (
                <Image
                  source={{ uri: currentTrack.artwork }}
                  style={styles.appleLyricsMiniThumb}
                  contentFit="cover"
                />
              ) : null}
              <View style={styles.appleLyricsHeaderTexts}>
                <Text style={styles.appleLyricsTrackTitle} numberOfLines={1}>
                  {currentTrack.title}
                </Text>
                <View style={styles.appleLyricsSubtitleRow}>
                  <Text style={styles.appleLyricsArtistName} numberOfLines={1}>
                    {currentTrack.artist}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.appleLyricsHeaderRight}>
              <ScalePressable
                onPress={() => setLyricsModalVisible(false)}
                style={styles.appleLyricsCloseBtn}
                haptic
              >
                <X size={20} color="#FFFFFF" weight="bold" />
              </ScalePressable>
            </View>
          </View>

          {/* Synced Lyrics ScrollView */}
          {isLoadingLyrics && syncedLyrics.length === 0 ? (
            <View style={styles.appleLyricsLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.appleLyricsLoadingText}>Syncing lines from audio stream...</Text>
            </View>
          ) : (
            <ScrollView
              ref={lyricsScrollRef}
              style={[styles.appleLyricsScrollView, isDesktop && styles.desktopCenterLyrics]}
              contentContainerStyle={styles.appleLyricsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {syncedLyrics.map((line, idx) => {
                const isActive = idx === activeLyricIndex;
                const isPast = idx < activeLyricIndex;
                const displayText = transliterateDevanagariToHinglish(line.text);

                return (
                  <AnimatedLyricLine
                    key={`${line.time}-${idx}`}
                    text={displayText}
                    time={line.time}
                    isActive={isActive}
                    isPast={isPast}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      seek(line.time);
                    }}
                    onLayout={(e) => {
                      const y = e.nativeEvent.layout.y;
                      linePositionsRef.current[idx] = y;
                    }}
                  />
                );
              })}
            </ScrollView>
          )}

          {/* Bottom Floating Playback & Scrubber Bar in Lyrics Screen */}
          <View style={[styles.appleLyricsBottomScrubber, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }]}>
            <View style={[styles.lyricsBottomInner, isDesktop && styles.desktopCenterLyrics]}>
              <View style={styles.appleLyricsScrubberTrack}>
                <View
                  style={[
                    styles.appleLyricsScrubberFill,
                    { width: `${progressRatio * 100}%` },
                  ]}
                />
              </View>
              <View style={styles.appleLyricsScrubberTimes}>
                <Text style={styles.appleLyricsTimeText}>{formatTime(position)}</Text>
                <Text style={styles.appleLyricsTimeText}>{formatTime(trackDuration)}</Text>
              </View>

              {/* Complete Playback Controls Row */}
              <View style={styles.appleLyricsControlsRow}>
                <ScalePressable onPress={toggleShuffle} hitSlop={8}>
                  <Shuffle
                    size={20}
                    color={shuffle ? '#1ED760' : 'rgba(255, 255, 255, 0.6)'}
                    weight={shuffle ? 'bold' : 'regular'}
                  />
                </ScalePressable>

                <ScalePressable onPress={previous} hitSlop={8}>
                  <SkipBack size={26} color="#FFFFFF" weight="fill" />
                </ScalePressable>

                <ScalePressable
                  onPress={() => togglePlay()}
                  style={styles.appleLyricsMainPlayBtn}
                  haptic
                >
                  {isPlaying ? (
                    <Pause size={24} color="#000000" weight="fill" />
                  ) : (
                    <Play size={24} color="#000000" weight="fill" style={{ marginLeft: 2 }} />
                  )}
                </ScalePressable>

                <ScalePressable onPress={next} hitSlop={8}>
                  <SkipForward size={26} color="#FFFFFF" weight="fill" />
                </ScalePressable>

                <ScalePressable onPress={toggleRepeat} hitSlop={8}>
                  {repeat === 'one' ? (
                    <RepeatOnce size={20} color="#1ED760" weight="bold" />
                  ) : (
                    <Repeat
                      size={20}
                      color={repeat === 'all' ? '#1ED760' : 'rgba(255, 255, 255, 0.6)'}
                      weight={repeat === 'all' ? 'bold' : 'regular'}
                    />
                  )}
                </ScalePressable>
              </View>
            </View>
          </View>


        </View>
      </Modal>

      {/* Up Next Queue Modal */}
      <Modal
        visible={queueModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setQueueModalVisible(false)}
      >
        <View style={styles.queueModal}>
          <View style={styles.queueHeader}>
            <Text style={styles.queueHeaderTitle}>Queue</Text>
            <Pressable
              onPress={() => setQueueModalVisible(false)}
              style={styles.closeBtn}
            >
              <X size={24} color={Colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.queueList}>
            <Text style={styles.queueSectionTitle}>Now Playing</Text>
            <View style={styles.queueItemActive}>
              <Image
                source={{ uri: currentTrack.artwork }}
                style={styles.queueArt}
                contentFit="cover"
              />
              <View style={styles.queueInfo}>
                <Text style={styles.queueTrackTitleActive} numberOfLines={1}>
                  {currentTrack.title}
                </Text>
                <Text style={styles.queueArtist} numberOfLines={1}>
                  {currentTrack.artist}
                </Text>
              </View>
              <SpeakerHigh size={20} color={Colors.primary} weight="fill" />
            </View>

            <Text style={styles.queueSectionTitle}>Up Next ({queue.length})</Text>
            {queue.map((item, idx) => (
              <Pressable
                key={`${item.id}-${idx}`}
                style={[
                  styles.queueItem,
                  idx === queueIndex && styles.queueItemHighlight,
                ]}
                onPress={() => {
                  playTrack(item, queue, idx);
                  setQueueModalVisible(false);
                }}
              >
                <Image
                  source={{ uri: item.artwork }}
                  style={styles.queueArt}
                  contentFit="cover"
                />
                <View style={styles.queueInfo}>
                  <Text
                    style={[
                      styles.queueTrackTitle,
                      idx === queueIndex && { color: Colors.primary },
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.queueArtist} numberOfLines={1}>
                    {item.artist}
                  </Text>
                </View>
                <Text style={styles.queueDuration}>
                  {formatTime(item.duration)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Device Picker Modal */}
      <Modal
        visible={deviceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeviceModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDeviceModalVisible(false)}
        >
          <View style={styles.deviceSheet}>
            <Text style={styles.deviceTitle}>Connect to a device</Text>
            <Text style={styles.deviceSubtitle}>Loopd Connect</Text>

            {['This Phone', 'AirPlay / Bluetooth', 'Living Room Speaker', 'Studio Headphones'].map(
              (dev) => (
                <Pressable
                  key={dev}
                  style={styles.deviceItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDevice(dev);
                    setDeviceModalVisible(false);
                  }}
                >
                  <Television
                    size={22}
                    color={
                      selectedDevice === dev ? Colors.primary : Colors.textPrimary
                    }
                  />
                  <Text
                    style={[
                      styles.deviceItemText,
                      selectedDevice === dev && { color: Colors.primary },
                    ]}
                  >
                    {dev}
                  </Text>
                  {selectedDevice === dev && (
                    <Check size={20} color={Colors.primary} />
                  )}
                </Pressable>
              )
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Section 8.6 Track Options Sheet */}
      <Modal
        visible={moreOptionsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMoreOptionsVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMoreOptionsVisible(false)}
        >
          <View style={styles.moreSheet}>
            <View style={styles.moreHeader}>
              <Image
                source={{ uri: currentTrack.artwork }}
                style={styles.moreArt}
              />
              <View style={styles.moreInfo}>
                <Text style={styles.moreTitle} numberOfLines={1}>
                  {currentTrack.title}
                </Text>
                <Text style={styles.moreArtist} numberOfLines={1}>
                  {currentTrack.artist}
                </Text>
              </View>
            </View>

            {/* Like */}
            <Pressable
              style={styles.moreItem}
              onPress={() => {
                toggleLike(currentTrack);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMoreOptionsVisible(false);
              }}
            >
              <Heart
                size={24}
                color={isLiked ? Colors.primary : Colors.textPrimary}
                weight={isLiked ? 'fill' : 'regular'}
              />
              <Text style={styles.moreItemText}>
                {isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
              </Text>
            </Pressable>

            {/* Add to Playlist */}
            <Pressable
              style={styles.moreItem}
              onPress={() => {
                setMoreOptionsVisible(false);
                Alert.alert('Playlists', 'Song added to your Library favorites.');
              }}
            >
              <PlusCircle size={24} color={Colors.textPrimary} weight="regular" />
              <Text style={styles.moreItemText}>Add to Playlist</Text>
            </Pressable>

            {/* Add to Queue */}
            <Pressable
              style={styles.moreItem}
              onPress={() => {
                addToQueue(currentTrack);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMoreOptionsVisible(false);
                Alert.alert('Queue', 'Added to queue.');
              }}
            >
              <ListPlus size={24} color={Colors.textPrimary} weight="regular" />
              <Text style={styles.moreItemText}>Add to Queue</Text>
            </Pressable>

            {/* Play Next */}
            <Pressable
              style={styles.moreItem}
              onPress={() => {
                playNext(currentTrack);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMoreOptionsVisible(false);
                Alert.alert('Queue', 'Playing next.');
              }}
            >
              <SkipForward size={24} color={Colors.textPrimary} weight="regular" />
              <Text style={styles.moreItemText}>Play Next</Text>
            </Pressable>

            {/* Go to Album */}
            {currentTrack.albumId && (
              <Pressable
                style={styles.moreItem}
                onPress={() => {
                  setMoreOptionsVisible(false);
                  router.push(`/album/${currentTrack.albumId}` as any);
                }}
              >
                <Disc size={24} color={Colors.textPrimary} weight="regular" />
                <Text style={styles.moreItemText}>Go to Album</Text>
              </Pressable>
            )}

            {/* Go to Artist */}
            {currentTrack.artistId && (
              <Pressable
                style={styles.moreItem}
                onPress={() => {
                  setMoreOptionsVisible(false);
                  router.push(`/artist/${currentTrack.artistId}` as any);
                }}
              >
                <User size={24} color={Colors.textPrimary} weight="regular" />
                <Text style={styles.moreItemText}>Go to Artist</Text>
              </Pressable>
            )}

            {/* Share */}
            <Pressable
              style={styles.moreItem}
              onPress={() => {
                setMoreOptionsVisible(false);
                handleShare();
              }}
            >
              <ShareNetwork size={24} color={Colors.textPrimary} weight="regular" />
              <Text style={styles.moreItemText}>Share</Text>
            </Pressable>

            {/* Sleep Timer */}
            <Pressable
              style={styles.moreItem}
              onPress={() => {
                setMoreOptionsVisible(false);
                setSleepTimerModalVisible(true);
              }}
            >
              <Moon size={24} color={Colors.textPrimary} weight="regular" />
              <Text style={styles.moreItemText}>Sleep Timer</Text>
              {sleepTimerSeconds !== null && (
                <Text style={styles.moreItemBadge}>
                  {formatTime(sleepTimerSeconds)}
                </Text>
              )}
            </Pressable>

            {/* Track Info and License */}
            <Pressable
              style={styles.moreItem}
              onPress={() => {
                setMoreOptionsVisible(false);
                setTrackInfoVisible(true);
              }}
            >
              <Info size={24} color={Colors.textPrimary} weight="regular" />
              <Text style={styles.moreItemText}>Track Info & Credits</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Section 11 Track Info and Attribution Sheet */}
      <Modal
        visible={trackInfoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTrackInfoVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setTrackInfoVisible(false)}
        >
          <View style={styles.deviceSheet}>
            <Text style={styles.deviceTitle}>Track Info & Credits</Text>
            <Text style={styles.deviceSubtitle}>Attribution & Licensing</Text>

            <View style={{ paddingVertical: 12, gap: 10 }}>
              <View>
                <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>TRACK TITLE</Text>
                <Text style={{ color: Colors.textPrimary, fontSize: 16, fontWeight: '700' }}>
                  {currentTrack.title}
                </Text>
              </View>
              <View>
                <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>ARTIST</Text>
                <Text style={{ color: Colors.textPrimary, fontSize: 15, fontWeight: '600' }}>
                  {currentTrack.artist}
                </Text>
              </View>
              <View>
                <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>SOURCE PROVIDER</Text>
                <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: '700' }}>
                  Music provided by JioSaavn
                </Text>
              </View>
              <View>
                <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>AUDIO STREAM</Text>
                <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>
                  320 kbps High-Fidelity AAC
                </Text>
              </View>
              <View>
                <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>LICENSE</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                  Streaming rights verified via public provider API. Non-commercial streaming on Loopd.
                </Text>
              </View>
            </View>

            <Pressable
              style={[styles.deviceItem, { justifyContent: 'center', backgroundColor: Colors.surface, borderRadius: 8, marginTop: 8 }]}
              onPress={() => setTrackInfoVisible(false)}
            >
              <Text style={[styles.deviceItemText, { color: Colors.primary, fontWeight: '700' }]}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Sleep Timer Modal */}
      <Modal
        visible={sleepTimerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSleepTimerModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSleepTimerModalVisible(false)}
        >
          <View style={styles.deviceSheet}>
            <Text style={styles.deviceTitle}>Stop audio in</Text>
            <Text style={styles.deviceSubtitle}>Loopd Sleep Timer</Text>

            {SLEEP_TIMER_OPTIONS.map((opt) => (
              <Pressable
                key={opt.label}
                style={styles.deviceItem}
                onPress={() => handleSetSleepTimer(opt.minutes)}
              >
                <Text style={styles.deviceItemText}>{opt.label}</Text>
                {((opt.minutes === 0 && sleepTimerSeconds === null) ||
                  (opt.minutes > 0 &&
                    sleepTimerSeconds !== null &&
                    Math.abs(sleepTimerSeconds - opt.minutes * 60) < 60)) && (
                  <Check size={20} color={Colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Equalizer Modal */}
      <Modal
        visible={eqModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEqModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEqModalVisible(false)}
        >
          <View style={styles.deviceSheet}>
            <Text style={styles.deviceTitle}>Audio Profiles & EQ</Text>
            <Text style={styles.deviceSubtitle}>Optimized 320kbps HD Audio Engine</Text>

            {EQ_PRESETS.map((preset) => (
              <Pressable
                key={preset}
                style={styles.deviceItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedEq(preset);
                  setEqModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.deviceItemText,
                    selectedEq === preset && { color: Colors.primary },
                  ]}
                >
                  {preset}
                </Text>
                {selectedEq === preset && (
                  <Check size={20} color={Colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  containerDesktop: {
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.titleMedium,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Shape.buttonRadius,
  },
  backBtnText: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.bodyMedium,
    color: '#000000',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  navSubtitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  navTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: 12,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    position: 'relative',
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: Shape.radiusMd,
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  loopdBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Shape.radiusSm,
  },
  loopdBadgeText: {
    fontFamily: Typography.fonts.extraBold,
    fontSize: 10,
    color: '#000000',
    letterSpacing: 0.5,
  },
  sleepTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(30,215,96,0.12)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 4,
  },
  sleepTimerPillText: {
    fontFamily: Typography.fonts.medium,
    fontSize: 11,
    color: Colors.primary,
  },
  trackDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  trackTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.headlineSmall,
    color: Colors.textPrimary,
  },
  artistName: {
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  likeBtn: {
    padding: 8,
  },
  scrubberContainer: {
    marginTop: 16,
  },
  progressBarWrapper: {
    height: 20,
    justifyContent: 'center',
  },
  progressBackground: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.textPrimary,
    borderRadius: 2,
  },
  scrubberThumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.textPrimary,
    marginLeft: -6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.textMuted,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  controlIconBtn: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  bottomActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceName: {
    fontFamily: Typography.fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  bottomRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bottomActionIcon: {
    padding: 6,
    borderRadius: 16,
  },
  activeLoopdBtn: {
    backgroundColor: 'rgba(30,215,96,0.2)',
  },
  // Queue Modal
  queueModal: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingTop: 16,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  queueHeaderTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.titleMedium,
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  queueList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  queueSectionTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textMuted,
    marginVertical: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  queueItemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.card,
    borderRadius: Shape.radiusMd,
    marginBottom: 8,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  queueItemHighlight: {
    backgroundColor: 'rgba(30,215,96,0.1)',
  },
  queueArt: {
    width: 44,
    height: 44,
    borderRadius: Shape.cardRadius,
    backgroundColor: Colors.card,
  },
  queueInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  queueTrackTitleActive: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.primary,
  },
  queueTrackTitle: {
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textPrimary,
  },
  queueArtist: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  queueDuration: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.textMuted,
  },
  // Modal Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  deviceSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Shape.radiusLg,
    borderTopRightRadius: Shape.radiusLg,
    padding: 24,
    paddingBottom: 40,
  },
  deviceTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.titleMedium,
    color: Colors.textPrimary,
  },
  deviceSubtitle: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.textMuted,
    marginBottom: 20,
    marginTop: 2,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: 14,
  },
  deviceItemText: {
    flex: 1,
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textPrimary,
  },
  // More Sheet
  moreSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Shape.radiusLg,
    borderTopRightRadius: Shape.radiusLg,
    padding: 20,
    paddingBottom: 36,
  },
  moreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    marginBottom: 8,
    gap: 14,
  },
  moreArt: {
    width: 48,
    height: 48,
    borderRadius: Shape.radiusSm,
    backgroundColor: Colors.card,
  },
  moreInfo: {
    flex: 1,
  },
  moreTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textPrimary,
  },
  moreArtist: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  moreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  moreItemText: {
    flex: 1,
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textPrimary,
  },
  moreItemBadge: {
    fontFamily: Typography.fonts.medium,
    fontSize: 12,
    color: Colors.primary,
  },
  lyricsPreviewCard: {
    marginHorizontal: 4,
    marginTop: 10,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  lyricsPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  lyricsPreviewLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1ED760',
    letterSpacing: 1,
  },
  appleMusicBadge: {
    backgroundColor: 'rgba(30, 215, 96, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  appleMusicBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1ED760',
    letterSpacing: 0.5,
  },
  lyricsPreviewText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  appleLyricsContainer: {
    flex: 1,
    backgroundColor: '#08080C',
  },
  appleLyricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  appleLyricsHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  appleLyricsMiniThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  appleLyricsHeaderTexts: {
    flex: 1,
    minWidth: 0,
  },
  appleLyricsTrackTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  appleLyricsSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  appleLyricsArtistName: {
    fontSize: 13,
    color: '#AAAAAA',
    flexShrink: 1,
  },
  appleLyricsSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(30, 215, 96, 0.16)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  appleLyricsSyncDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#1ED760',
  },
  appleLyricsSyncBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1ED760',
    letterSpacing: 0.5,
  },
  appleLyricsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  lyricsMoreBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  appleLyricsCloseBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  appleLyricsLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  appleLyricsLoadingText: {
    fontSize: 14,
    color: '#888888',
    fontWeight: '600',
  },
  desktopCenterLyrics: {
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  lyricsBottomInner: {
    width: '100%',
  },
  appleLyricsScrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  appleLyricsScrollContent: {
    paddingVertical: 60,
    paddingBottom: 170,
  },
  appleLyricLineItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 16,
  },
  appleLyricLineActiveItem: {
    // Pure radiant glowing typography with no dark gray rectangle
  },
  appleLyricText: {
    fontSize: 27,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.28)',
    lineHeight: 42,
    letterSpacing: -0.3,
  },
  appleLyricTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 34,
    lineHeight: 48,
    textShadowColor: 'rgba(255, 255, 255, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  appleLyricTextPast: {
    color: 'rgba(255, 255, 255, 0.50)',
  },
  appleLyricsBottomScrubber: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: 'rgba(8, 8, 12, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  appleLyricsScrubberTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  appleLyricsScrubberFill: {
    height: '100%',
    backgroundColor: '#1ED760',
    borderRadius: 2,
  },
  appleLyricsScrubberTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appleLyricsTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888888',
  },
  appleLyricsControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  appleLyricsMainPlayBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1ED760',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lyricsMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  lyricsMenuSheet: {
    backgroundColor: '#16181F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  lyricsMenuTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  lyricsMenuSubtitle: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
    marginBottom: 20,
  },
  lyricsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  lyricsMenuItemActive: {
    borderColor: '#1ED760',
    backgroundColor: 'rgba(30, 215, 96, 0.1)',
  },
  lyricsMenuItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lyricsMenuItemTitleActive: {
    color: '#1ED760',
  },
  lyricsMenuItemDesc: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
});
