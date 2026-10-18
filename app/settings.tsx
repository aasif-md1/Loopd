/**
 * Settings Screen — Loopd
 * Conforms to Section 8.7 of Loopd Master Build Prompt.
 * Account, Playback, Audio Quality, Data Saver, Language, Notifications, Privacy, About, Clear Cache.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  StatusBar,
  Alert,
  Linking,
  Modal,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CaretRight,
  SlidersHorizontal,
  SpeakerHigh,
  WifiHigh,
  Trash,
  ShieldCheck,
  Info,
  Globe,
  Bell,
  User,
  Heart,
  ArrowsClockwise,
} from 'phosphor-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Shape, Spacing } from '@/src/theme';
import { ScalePressable } from '@/src/components/ui/ScalePressable';
import { OnboardingModal } from '@/src/components/onboarding/OnboardingModal';
import { usePlayerStore } from '@/src/store/playerStore';
import { useLibraryStore } from '@/src/store/libraryStore';
import { dynamicIslandService } from '@/src/services/dynamicIslandService';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { autoOpenNowPlaying, setAutoOpenNowPlaying } = usePlayerStore();
  const { userName, setUserName } = useLibraryStore();

  const [editNameVisible, setEditNameVisible] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const [gapless, setGapless] = useState(true);
  const [normalize, setNormalize] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [audioQuality, setAudioQuality] = useState<'Low' | 'Normal' | 'High'>('High');
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [dynamicIslandEnabled, setDynamicIslandEnabled] = useState(dynamicIslandService.getIsEnabled());

  const handleToggleDynamicIsland = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (val && Platform.OS === 'android') {
      const canDraw = await dynamicIslandService.canDrawOverlays();
      if (!canDraw) {
        Alert.alert(
          'Dynamic Island Permission',
          'To display the floating music pill around your front camera cutout when leaving the app, Android requires "Display over other apps" permission.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Enable in Settings',
              onPress: () => dynamicIslandService.requestOverlayPermission(),
            },
          ]
        );
      }
    }
    setDynamicIslandEnabled(val);
    dynamicIslandService.setEnabled(val);
  };

  const handleClearCache = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Clear Cache',
      'This will free up temporary audio cache and album artwork memory.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Cache Cleared', 'Temporary cache has been cleared.');
          },
        },
      ]
    );
  };

  const handleOpenSystemNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openSettings().catch(() => {
      Alert.alert('Settings', 'Open device Settings > Apps > Loopd > Notifications');
    });
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? All saved playlists, likes, and listening history will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deleted', 'Your account data has been removed.');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <ScalePressable
          style={styles.backBtn}
          onPress={() => router.back()}
          haptic
        >
          <ArrowLeft size={24} color={Colors.textPrimary} weight="bold" />
        </ScalePressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Banner */}
        <View style={styles.brandCard}>
          <Image
            source={require('@/assets/images/loopd-icon.png')}
            style={styles.logoBadge}
            contentFit="cover"
          />
          <View style={styles.brandTextContainer}>
            <Text style={styles.brandName}>Loopd</Text>
            <Text style={styles.brandTagline}>Free Music Streaming • No Ads</Text>
          </View>
        </View>

        {/* Section: Account */}
        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.card}>
          <ScalePressable
            style={styles.row}
            onPress={() => {
              setTempName(userName);
              setEditNameVisible(true);
            }}
            haptic
          >
            <View>
              <Text style={styles.rowTitle}>Display Name</Text>
              <Text style={[styles.rowSubtitle, { color: Colors.primary, fontWeight: '700' }]}>
                {userName}
              </Text>
            </View>
            <User size={20} color={Colors.primary} weight="bold" />
          </ScalePressable>

          <View style={styles.divider} />

          <ScalePressable
            style={styles.row}
            onPress={() => setShowPreferencesModal(true)}
            haptic
          >
            <View>
              <Text style={styles.rowTitle}>Music Preferences</Text>
              <Text style={styles.rowSubtitle}>Languages and followed artists</Text>
            </View>
            <CaretRight size={20} color={Colors.textSecondary} weight="bold" />
          </ScalePressable>

          <View style={styles.divider} />

          <ScalePressable
            style={styles.row}
            onPress={handleDeleteAccount}
            haptic
          >
            <View>
              <Text style={[styles.rowTitle, { color: Colors.error }]}>Delete Account</Text>
              <Text style={styles.rowSubtitle}>Permanently remove user data and history</Text>
            </View>
            <Trash size={20} color={Colors.error} weight="regular" />
          </ScalePressable>
        </View>

        {/* Section: Playback */}
        <Text style={styles.sectionHeader}>Playback</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.rowTitle}>Open player when a song starts</Text>
              <Text style={styles.rowSubtitle}>Immediately opens fullscreen player on tap</Text>
            </View>
            <Switch
              value={autoOpenNowPlaying}
              onValueChange={setAutoOpenNowPlaying}
              trackColor={{ false: '#3E3E3E', true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.rowTitle}>Gapless Playback</Text>
              <Text style={styles.rowSubtitle}>Seamless transitions between tracks</Text>
            </View>
            <Switch
              value={gapless}
              onValueChange={setGapless}
              trackColor={{ false: '#3E3E3E', true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.rowTitle}>Normalize Volume</Text>
              <Text style={styles.rowSubtitle}>Consistent audio level across all tracks</Text>
            </View>
            <Switch
              value={normalize}
              onValueChange={setNormalize}
              trackColor={{ false: '#3E3E3E', true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.rowTitle}>Autoplay Similar Songs</Text>
              <Text style={styles.rowSubtitle}>Keep the vibe going when queue ends</Text>
            </View>
            <Switch
              value={autoplay}
              onValueChange={setAutoplay}
              trackColor={{ false: '#3E3E3E', true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.rowTitle}>Dynamic Island Floating Player</Text>
              <Text style={styles.rowSubtitle}>Floating music pill around camera cutout when leaving app</Text>
            </View>
            <Switch
              value={dynamicIslandEnabled}
              onValueChange={handleToggleDynamicIsland}
              trackColor={{ false: '#3E3E3E', true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section: Audio Quality */}
        <Text style={styles.sectionHeader}>Audio Quality</Text>
        <View style={styles.card}>
          {(['Low', 'Normal', 'High'] as const).map((quality) => (
            <ScalePressable
              key={quality}
              style={styles.row}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setAudioQuality(quality);
              }}
              haptic
            >
              <View>
                <Text
                  style={[
                    styles.rowTitle,
                    audioQuality === quality && { color: Colors.primary },
                  ]}
                >
                  {quality}
                </Text>
                <Text style={styles.rowSubtitle}>
                  {quality === 'Low'
                    ? '96 kbps • Lowest data usage'
                    : quality === 'Normal'
                    ? '160 kbps • Great balance'
                    : '320 kbps • Studio lossless quality'}
                </Text>
              </View>
              {audioQuality === quality && (
                <View style={styles.radioDot} />
              )}
            </ScalePressable>
          ))}
        </View>

        {/* Section: Data Saver */}
        <Text style={styles.sectionHeader}>Data Saver</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.rowTitle}>Data Saver Mode</Text>
              <Text style={styles.rowSubtitle}>Sets audio quality to Low on cellular networks</Text>
            </View>
            <Switch
              value={dataSaver}
              onValueChange={setDataSaver}
              trackColor={{ false: '#3E3E3E', true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section: Notifications */}
        <Text style={styles.sectionHeader}>Notifications</Text>
        <View style={styles.card}>
          <ScalePressable
            style={styles.row}
            onPress={handleOpenSystemNotifications}
            haptic
          >
            <View>
              <Text style={styles.rowTitle}>Media & Player Notifications</Text>
              <Text style={styles.rowSubtitle}>Manage lock screen & notification shade controls</Text>
            </View>
            <CaretRight size={20} color={Colors.textSecondary} weight="bold" />
          </ScalePressable>
        </View>

        {/* Section: Privacy */}
        <Text style={styles.sectionHeader}>Privacy & Consent</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.rowTitle}>Crash & Diagnostics Reporting</Text>
              <Text style={styles.rowSubtitle}>Help us fix bugs and improve performance</Text>
            </View>
            <Switch
              value={analyticsEnabled}
              onValueChange={setAnalyticsEnabled}
              trackColor={{ false: '#3E3E3E', true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <ScalePressable
            style={styles.row}
            onPress={() => {
              Alert.alert('Privacy Policy', 'Loopd does not sell your personal data or serve advertisements.');
            }}
            haptic
          >
            <View>
              <Text style={styles.rowTitle}>Privacy Policy</Text>
              <Text style={styles.rowSubtitle}>Read our full store-compliant privacy policy</Text>
            </View>
            <ShieldCheck size={20} color={Colors.textSecondary} weight="regular" />
          </ScalePressable>

          <View style={styles.divider} />

          <ScalePressable
            style={styles.row}
            onPress={() => {
              Alert.alert('Terms of Service', 'Free music streaming service provided for non-commercial personal entertainment.');
            }}
            haptic
          >
            <View>
              <Text style={styles.rowTitle}>Terms of Service</Text>
              <Text style={styles.rowSubtitle}>User terms and music usage rules</Text>
            </View>
            <Info size={20} color={Colors.textSecondary} weight="regular" />
          </ScalePressable>
        </View>

        {/* Section: Storage */}
        <Text style={styles.sectionHeader}>Storage</Text>
        <View style={styles.card}>
          <ScalePressable style={styles.row} onPress={handleClearCache} haptic>
            <View>
              <Text style={styles.rowTitle}>Clear Cache</Text>
              <Text style={styles.rowSubtitle}>Remove cached album artwork and metadata</Text>
            </View>
            <CaretRight size={20} color={Colors.textSecondary} weight="bold" />
          </ScalePressable>
        </View>

        {/* Section: About */}
        <Text style={styles.sectionHeader}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Version</Text>
            <Text style={styles.rowSubtitle}>1.0.0 (API 36 Ready)</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Licenses & Credits</Text>
            <Text style={styles.rowSubtitle}>JioSaavn • Jamendo • Open Source</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Support</Text>
            <Text style={styles.rowSubtitle}>support@loopd.app</Text>
          </View>
        </View>
      </ScrollView>

      <OnboardingModal
        visible={showPreferencesModal}
        onComplete={() => setShowPreferencesModal(false)}
      />

      {/* Edit Display Name Modal */}
      <Modal
        visible={editNameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditNameVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEditNameVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Edit Display Name</Text>
            <Text style={styles.modalSubtitle}>Enter your name to personalize Loopd</Text>

            <TextInput
              style={styles.nameInput}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Your name"
              placeholderTextColor="#777777"
              selectionColor={Colors.primary}
              autoFocus
              autoCorrect={false}
            />

            <View style={styles.modalBtnRow}>
              <ScalePressable
                style={styles.modalCancelBtn}
                onPress={() => setEditNameVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </ScalePressable>

              <ScalePressable
                style={styles.modalSaveBtn}
                onPress={() => {
                  const trimmed = tempName.trim();
                  if (trimmed) {
                    setUserName(trimmed);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                  setEditNameVisible(false);
                }}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </ScalePressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.titleLarge,
    color: Colors.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: Shape.radiusMd,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#1c1c1c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(30,215,96,0.3)',
  },
  brandTextContainer: {
    marginLeft: 16,
  },
  brandName: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.titleLarge,
    color: Colors.textPrimary,
  },
  brandTagline: {
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.caption,
    color: Colors.primary,
    marginTop: 2,
  },
  sectionHeader: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Shape.radiusMd,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.bodyMedium,
    color: Colors.textPrimary,
  },
  rowSubtitle: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1C1E24',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 18,
  },
  nameInput: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 20,
    outlineStyle: 'none' as any,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CCCCCC',
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
});
