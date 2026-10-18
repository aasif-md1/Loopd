/**
 * Onboarding Flow — Loopd
 * Redesigned per user reference screens:
 * 1. Language selector: 2-column vibrant cards with cultural artist portrait cutout, bold white title, checkmark badge.
 * 2. Artist picker: 3-column circle avatars with 100% verified real photos, category filter chips (For You, Hindi, Punjabi, Marathi, International), white pill search bar.
 * 3. "Great picks!" celebratory transition screen with 3 overlapping chosen artist avatars.
 * Strictly Phosphor icons, zero emojis, store-grade polish.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TextInput,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  MagnifyingGlass,
  ArrowRight,
  ArrowLeft,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, Shape } from '../../theme';
import { ScalePressable } from '../ui';
import { MusicService } from '../../api/musicService';
import type { Artist } from '../../types';

// Responsive grid defaults for mobile fallback
const ARTIST_GRID_PADDING = 20;
const ARTIST_COLUMN_GAP = 14;

export const ONBOARDING_COMPLETED_KEY = '@loopd_onboarding_completed';
export const USER_LANGUAGES_KEY = '@loopd_user_languages';
export const USER_ARTISTS_KEY = '@loopd_user_artists';

export interface LanguageCard {
  id: string;
  name: string;
  color: string;
  image: string;
}

export const LANGUAGES_CARD_DATA: LanguageCard[] = [
  {
    id: 'hindi',
    name: 'Hindi',
    color: '#D93829',
    image: 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg',
  },
  {
    id: 'international',
    name: 'International',
    color: '#E67E22',
    image: 'https://c.saavncdn.com/artists/Justin_Bieber_005_20201127112218_500x500.jpg',
  },
  {
    id: 'rajasthani',
    name: 'Rajasthani',
    color: '#D35400',
    image: 'https://c.saavncdn.com/artists/Seema_Mishra_500x500.jpg',
  },
  {
    id: 'haryanvi',
    name: 'Haryanvi',
    color: '#27AE60',
    image: 'https://c.saavncdn.com/artists/Badshah_006_20241118064015_500x500.jpg',
  },
  {
    id: 'punjabi',
    name: 'Punjabi',
    color: '#8E44AD',
    image: 'https://c.saavncdn.com/artists/Diljit_Dosanjh_005_20231025073054_500x500.jpg',
  },
  {
    id: 'god',
    name: 'God',
    color: '#C98822',
    image: 'https://c.saavncdn.com/artists/Jagjit_Singh_500x500.jpg',
  },
  {
    id: 'telugu',
    name: 'Telugu',
    color: '#16A085',
    image: 'https://c.saavncdn.com/artists/Sid_Sriram_002_20230616110931_500x500.jpg',
  },
  {
    id: 'malayalam',
    name: 'Malayalam',
    color: '#2E7D32',
    image: 'https://c.saavncdn.com/artists/K_J_Yesudas_500x500.jpg',
  },
  {
    id: 'marathi',
    name: 'Marathi',
    color: '#8A4C2E',
    image: 'https://c.saavncdn.com/artists/Bela_Shende_003_20240129070549_500x500.jpg',
  },
  {
    id: 'gujarati',
    name: 'Gujarati',
    color: '#D83264',
    image: 'https://c.saavncdn.com/artists/Sachin-Jigar_500x500.jpg',
  },
  {
    id: 'bengali',
    name: 'Bengali',
    color: '#1F618D',
    image: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_007_20241101074144_500x500.jpg',
  },
  {
    id: 'kannada',
    name: 'Kannada',
    color: '#922B21',
    image: 'https://c.saavncdn.com/artists/Vijay_Prakash_500x500.jpg',
  },
  {
    id: 'bhojpuri',
    name: 'Bhojpuri',
    color: '#E65100',
    image: 'https://c.saavncdn.com/artists/Khesari_Lal_Yadav_500x500.jpg',
  },
  {
    id: 'tamil',
    name: 'Tamil',
    color: '#F1C40F',
    image: 'https://c.saavncdn.com/artists/Anirudh_Ravichander_003_20260121134149_500x500.jpg',
  },
];

export interface CuratedArtist {
  id: string;
  name: string;
  image: string;
  categories: string[];
}

export const CURATED_ARTISTS_V2: CuratedArtist[] = [
  {
    id: 'jiosaavn-459320',
    name: 'Arijit Singh',
    image: 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg',
    categories: ['for_you', 'hindi'],
  },
  {
    id: 'jiosaavn-468245',
    name: 'Diljit Dosanjh',
    image: 'https://c.saavncdn.com/artists/Diljit_Dosanjh_005_20231025073054_500x500.jpg',
    categories: ['for_you', 'punjabi'],
  },
  {
    id: 'jiosaavn-459381',
    name: 'Ajay-Atul',
    image: 'https://c.saavncdn.com/artists/Ajay_Atul_003_20230228105414_500x500.jpg',
    categories: ['for_you', 'marathi', 'hindi'],
  },
  {
    id: 'jiosaavn-456323',
    name: 'Pritam',
    image: 'https://c.saavncdn.com/artists/Pritam_Chakraborty-20170711073326_500x500.jpg',
    categories: ['for_you', 'hindi'],
  },
  {
    id: 'jiosaavn-697691',
    name: 'Karan Aujla',
    image: 'https://c.saavncdn.com/artists/Karan_Aujla_005_20260925061936_500x500.jpg',
    categories: ['for_you', 'punjabi'],
  },
  {
    id: 'jiosaavn-455939',
    name: 'Bela Shende',
    image: 'https://c.saavncdn.com/artists/Bela_Shende_003_20240129070549_500x500.jpg',
    categories: ['marathi', 'hindi'],
  },
  {
    id: 'jiosaavn-455130',
    name: 'Shreya Ghoshal',
    image: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_007_20241101074144_500x500.jpg',
    categories: ['for_you', 'hindi'],
  },
  {
    id: 'jiosaavn-3319750',
    name: 'Sidhu Moosewala',
    image: 'https://c.saavncdn.com/artists/Sidhu_Moose_Wala_004_20250617183705_500x500.jpg',
    categories: ['punjabi'],
  },
  {
    id: 'jiosaavn-1926984',
    name: 'Aadarsh Shinde',
    image: 'https://c.saavncdn.com/artists/Adarsh_Shinde_004_20240205115913_500x500.jpg',
    categories: ['marathi'],
  },
  {
    id: 'jiosaavn-atifaslam',
    name: 'Atif Aslam',
    image: 'https://c.saavncdn.com/artists/Atif_Aslam_500x500.jpg',
    categories: ['for_you', 'hindi'],
  },
  {
    id: 'jiosaavn-681966',
    name: 'AP Dhillon',
    image: 'https://c.saavncdn.com/artists/AP_Dhillon_004_20251023102150_500x500.jpg',
    categories: ['for_you', 'punjabi'],
  },
  {
    id: 'jiosaavn-455863',
    name: 'Swapnil Bandodkar',
    image: 'https://c.saavncdn.com/artists/Swapnil_Bandodkar_500x500.jpg',
    categories: ['marathi'],
  },
  {
    id: 'jiosaavn-459880',
    name: 'Vishal-Shekhar',
    image: 'https://c.saavncdn.com/artists/Vishal-Shekhar_20191130071357_500x500.jpg',
    categories: ['hindi'],
  },
  {
    id: 'jiosaavn-485956',
    name: 'Yo Yo Honey Singh',
    image: 'https://c.saavncdn.com/artists/Yo_Yo_Honey_Singh_004_20260811095253_500x500.jpg',
    categories: ['for_you', 'punjabi', 'hindi'],
  },
  {
    id: 'jiosaavn-456863',
    name: 'Badshah',
    image: 'https://c.saavncdn.com/artists/Badshah_006_20241118064015_500x500.jpg',
    categories: ['punjabi', 'hindi'],
  },
  {
    id: 'jiosaavn-464932',
    name: 'Neha Kakkar',
    image: 'https://c.saavncdn.com/artists/Neha_Kakkar_007_20241212115832_500x500.jpg',
    categories: ['hindi', 'punjabi'],
  },
  {
    id: 'jiosaavn-455125',
    name: 'Sonu Nigam',
    image: 'https://c.saavncdn.com/artists/Sonu_Nigam_003_20260813182013_500x500.jpg',
    categories: ['hindi'],
  },
  {
    id: 'jiosaavn-455782',
    name: 'KK',
    image: 'https://c.saavncdn.com/artists/KK_500x500.jpg',
    categories: ['hindi'],
  },
  {
    id: 'jiosaavn-455129',
    name: 'Sunidhi Chauhan',
    image: 'https://c.saavncdn.com/artists/Sunidhi_Chauhan_005_20250515061617_500x500.jpg',
    categories: ['hindi'],
  },
  {
    id: 'jiosaavn-881158',
    name: 'Jubin Nautiyal',
    image: 'https://c.saavncdn.com/artists/Jubin_Nautiyal_003_20231130204020_500x500.jpg',
    categories: ['hindi'],
  },
  {
    id: 'jiosaavn-4878402',
    name: 'Anuv Jain',
    image: 'https://c.saavncdn.com/artists/Anuv_Jain_001_20231206073013_500x500.jpg',
    categories: ['hindi'],
  },
  {
    id: 'jiosaavn-565990',
    name: 'Taylor Swift',
    image: 'https://c.saavncdn.com/artists/Taylor_Swift_003_20200226074119_500x500.jpg',
    categories: ['international'],
  },
  {
    id: 'jiosaavn-615155',
    name: 'The Weeknd',
    image: 'https://c.saavncdn.com/artists/The_Weeknd_002_20241003071400_500x500.jpg',
    categories: ['international'],
  },
  {
    id: 'jiosaavn-578407',
    name: 'Ed Sheeran',
    image: 'https://c.saavncdn.com/artists/Ed_Sheeran_002_20250625073038_500x500.jpg',
    categories: ['international'],
  },
  {
    id: 'jiosaavn-512453',
    name: 'Drake',
    image: 'https://c.saavncdn.com/artists/Drake_006_20260520062317_500x500.jpg',
    categories: ['international'],
  },
  {
    id: 'jiosaavn-568565',
    name: 'Justin Bieber',
    image: 'https://c.saavncdn.com/artists/Justin_Bieber_005_20201127112218_500x500.jpg',
    categories: ['international'],
  },
  {
    id: 'jiosaavn-1918741',
    name: 'Billie Eilish',
    image: 'https://c.saavncdn.com/artists/Billie_Eilish_20190211151539_500x500.jpg',
    categories: ['international'],
  },
  {
    id: 'jiosaavn-1274170',
    name: 'Dua Lipa',
    image: 'https://c.saavncdn.com/artists/Dua_Lipa_004_20231120090922_500x500.jpg',
    categories: ['international'],
  },
];

const ARTIST_FILTER_CHIPS = [
  { id: 'for_you', label: 'For You' },
  { id: 'hindi', label: 'Hindi' },
  { id: 'punjabi', label: 'Punjabi' },
  { id: 'marathi', label: 'Marathi' },
  { id: 'international', label: 'International' },
];

interface OnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
}

export function OnboardingModal({ visible, onComplete }: OnboardingModalProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  const contentWidth = isDesktop ? Math.min(windowWidth - 48, 880) : windowWidth;

  // Responsive Grid Geometry
  const langCols = isDesktop ? 3 : 2;
  const langGap = 14;
  const langHorizontalPad = isDesktop ? 20 : 16;
  const langCardWidth = Math.floor(
    (contentWidth - langHorizontalPad * 2 - (langCols - 1) * langGap) / langCols
  );

  const artistCols = isDesktop ? 5 : 3;
  const artistGap = isDesktop ? 18 : 14;
  const artistHorizontalPad = isDesktop ? 20 : 16;
  const artistItemWidth = Math.floor(
    (contentWidth - artistHorizontalPad * 2 - (artistCols - 1) * artistGap) / artistCols
  );
  const artistAvatarSize = isDesktop ? 104 : Math.min(artistItemWidth - 8, 92);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Selections
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [activeChip, setActiveChip] = useState('for_you');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [limitToast, setLimitToast] = useState<string | null>(null);

  // Toggle Language
  const toggleLanguage = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLanguages((prev) => {
      if (prev.includes(id)) {
        setLimitToast(null);
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 6) {
        setLimitToast('You can pick up to 6 languages');
        setTimeout(() => setLimitToast(null), 2500);
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  // Toggle Artist Selection
  const toggleArtist = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedArtistIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  // Debounced search for artists
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await MusicService.search(searchQuery, 15);
        setSearchResults(res.artists);
      } catch (err) {
        console.warn('Artist search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtered artists by category or search
  const displayArtists = useMemo(() => {
    if (searchQuery.trim().length >= 2) {
      return searchResults;
    }
    if (activeChip === 'for_you') {
      return CURATED_ARTISTS_V2;
    }
    return CURATED_ARTISTS_V2.filter((a) => a.categories.includes(activeChip));
  }, [searchQuery, searchResults, activeChip]);

  // Chosen artist objects for "Great picks!" screen
  const chosenArtists = useMemo(() => {
    return selectedArtistIds
      .map((id) => {
        const found =
          CURATED_ARTISTS_V2.find((a) => a.id === id) ||
          searchResults.find((a) => a.id === id);
        return found || { id, name: 'Artist', image: 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg' };
      })
      .slice(0, 3);
  }, [selectedArtistIds, searchResults]);

  // Trigger celebratory transition then finish
  const handleProceedToPicks = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep(3);
    setTimeout(async () => {
      await handleFinish();
    }, 1800);
  };

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      await AsyncStorage.setItem(USER_LANGUAGES_KEY, JSON.stringify(selectedLanguages));
      await AsyncStorage.setItem(USER_ARTISTS_KEY, JSON.stringify(selectedArtistIds));
    } catch (err) {
      console.warn('Error saving onboarding preferences:', err);
    }
    onComplete();
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    } catch (_) {}
    onComplete();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" />

        {/* STEP 1: WHAT MUSIC DO YOU LIKE? (Screenshot 1) */}
        {step === 1 && (
          <View style={[styles.stepContainer, isDesktop && styles.stepContainerDesktop]}>
            <View style={styles.langHeader}>
              <Text style={styles.langTitle}>What music do you like?</Text>
              {limitToast && (
                <View style={styles.toastBadge}>
                  <Text style={styles.toastText}>{limitToast}</Text>
                </View>
              )}
            </View>

            <ScrollView
              style={styles.langScroll}
              contentContainerStyle={[
                styles.langGrid,
                {
                  gap: langGap,
                  paddingHorizontal: langHorizontalPad,
                  justifyContent: isDesktop ? 'flex-start' : 'space-between',
                },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {LANGUAGES_CARD_DATA.map((card) => {
                const isSelected = selectedLanguages.includes(card.id);
                return (
                  <ScalePressable
                    key={card.id}
                    style={[
                      styles.langCard,
                      { width: langCardWidth, backgroundColor: card.color },
                      isSelected && styles.langCardSelected,
                    ]}
                    onPress={() => toggleLanguage(card.id)}
                    scaleValue={0.97}
                  >
                    <View style={styles.langCardContent}>
                      <Text style={styles.langCardTitle}>{card.name}</Text>
                    </View>

                    {/* Right side circular artist portrait with subtle ring */}
                    <View style={styles.langAvatarContainer}>
                      <Image
                        source={{ uri: card.image }}
                        style={styles.langAvatarImage}
                        contentFit="cover"
                        transition={200}
                      />
                    </View>

                    {/* Top right check badge if selected */}
                    {isSelected && (
                      <View style={styles.langCheckBadge}>
                        <Check size={14} color="#000000" weight="bold" />
                      </View>
                    )}
                  </ScalePressable>
                );
              })}
            </ScrollView>

            {/* Bottom Cyan Action Pill */}
            <View style={styles.langBottomBar}>
              <View style={[styles.bottomBarInner, isDesktop && styles.bottomBarInnerDesktop]}>
                <ScalePressable
                  style={[
                    styles.cyanContinueBtn,
                    selectedLanguages.length === 0 && styles.cyanBtnDisabled,
                  ]}
                  disabled={selectedLanguages.length === 0}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setStep(2);
                  }}
                >
                  <Text style={styles.cyanContinueBtnText}>
                    {selectedLanguages.length > 0
                      ? `Next: Choose Artists (${selectedLanguages.length} selected)`
                      : 'Next: Choose Artists'}
                  </Text>
                  <ArrowRight size={18} color="#000000" weight="bold" />
                </ScalePressable>
              </View>
            </View>
          </View>
        )}

        {/* STEP 2: CHOOSE 3 OR MORE ARTISTS YOU LIKE (Screenshot 3) */}
        {step === 2 && (
          <View style={[styles.stepContainer, isDesktop && styles.stepContainerDesktop]}>
            {/* Top Bar with Back and Skip */}
            <View style={styles.artistTopBar}>
              <ScalePressable
                onPress={() => setStep(1)}
                style={styles.backIconButton}
              >
                <ArrowLeft size={24} color="#FFFFFF" weight="bold" />
              </ScalePressable>

              <ScalePressable onPress={handleSkip}>
                <Text style={styles.skipButtonText}>Skip</Text>
              </ScalePressable>
            </View>

            {/* Header */}
            <View style={styles.artistHeader}>
              <Text style={styles.artistTitle}>Choose 3 or more artists you like.</Text>
            </View>

            {/* White Pill Search Input */}
            <View style={[styles.searchPillWrapper, isDesktop && styles.searchPillWrapperDesktop]}>
              <View style={styles.searchPill}>
                <MagnifyingGlass size={20} color="#666666" weight="regular" />
                <TextInput
                  style={styles.searchPillInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search"
                  placeholderTextColor="#777777"
                  selectionColor="#1ED760"
                  autoCorrect={false}
                />
                {isSearching && (
                  <ActivityIndicator size="small" color="#1ED760" />
                )}
              </View>
            </View>

            {/* Category Filter Chips */}
            {!searchQuery && (
              <View style={[styles.chipsRow, isDesktop && styles.chipsRowDesktop]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsScrollContent}
                >
                  {ARTIST_FILTER_CHIPS.map((chip) => {
                    const isActive = activeChip === chip.id;
                    return (
                      <ScalePressable
                        key={chip.id}
                        style={[
                          styles.filterChip,
                          isActive && styles.filterChipActive,
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setActiveChip(chip.id);
                        }}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            isActive && styles.filterChipTextActive,
                          ]}
                        >
                          {chip.label}
                        </Text>
                      </ScalePressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Multi-Column Equal Artist Circle Grid */}
            <ScrollView
              style={styles.artistScroll}
              contentContainerStyle={[
                styles.artistGrid,
                {
                  gap: artistGap,
                  paddingHorizontal: artistHorizontalPad,
                  justifyContent: isDesktop ? 'flex-start' : 'space-between',
                },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {displayArtists.map((artist) => {
                const isSelected = selectedArtistIds.includes(artist.id);
                return (
                  <ScalePressable
                    key={artist.id}
                    style={[styles.artistGridItem, { width: artistItemWidth }]}
                    onPress={() => toggleArtist(artist.id)}
                    scaleValue={0.96}
                  >
                    <View
                      style={[
                        styles.artistAvatarWrapper,
                        {
                          width: artistAvatarSize,
                          height: artistAvatarSize,
                          borderRadius: artistAvatarSize / 2,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: artist.image }}
                        style={[
                          styles.artistAvatarImage,
                          { borderRadius: artistAvatarSize / 2 },
                          isSelected && styles.artistAvatarSelected,
                        ]}
                        contentFit="cover"
                        transition={200}
                      />

                      {/* Selection Ring & Checkmark */}
                      {isSelected && (
                        <View style={styles.artistCheckBadge}>
                          <Check size={12} color="#000000" weight="bold" />
                        </View>
                      )}
                    </View>

                    <Text style={styles.artistGridName} numberOfLines={2}>
                      {artist.name}
                    </Text>
                  </ScalePressable>
                );
              })}
            </ScrollView>

            {/* Bottom Cyan Action Pill */}
            <View style={styles.artistBottomBar}>
              <View style={[styles.bottomBarInner, isDesktop && styles.bottomBarInnerDesktop]}>
                <ScalePressable
                  style={[
                    styles.cyanContinueBtn,
                    selectedArtistIds.length < 3 && styles.cyanBtnDisabled,
                  ]}
                  disabled={selectedArtistIds.length < 3}
                  onPress={handleProceedToPicks}
                >
                  <Text style={styles.cyanContinueBtnText}>Continue</Text>
                  <Check size={18} color="#000000" weight="bold" />
                </ScalePressable>
              </View>
            </View>
          </View>
        )}

        {/* STEP 3: "GREAT PICKS!" TRANSITION SCREEN (Screenshot 2) */}
        {step === 3 && (
          <View style={styles.greatPicksContainer}>
            {/* Overlapping Artist Circles */}
            <View style={styles.overlappingCirclesRow}>
              {chosenArtists.map((artist, idx) => {
                const zIndex = idx === 1 ? 3 : 2;
                return (
                  <View
                    key={artist.id}
                    style={[
                      styles.overlappingCircleItem,
                      idx === 1 && styles.overlappingCircleCenter,
                      { zIndex },
                    ]}
                  >
                    <Image
                      source={{ uri: artist.image }}
                      style={styles.overlappingImage}
                      contentFit="cover"
                    />
                  </View>
                );
              })}
            </View>

            <Text style={styles.greatPicksTitle}>Great picks!</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0E11',
  },
  stepContainer: {
    flex: 1,
  },
  stepContainerDesktop: {
    maxWidth: 880,
    width: '100%',
    alignSelf: 'center',
  },

  /* Step 1: Language Screen */
  langHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  langTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  toastBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  toastText: {
    fontSize: 13,
    color: '#1ED760',
    fontWeight: '600',
  },
  langScroll: {
    flex: 1,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 90,
  },
  langCard: {
    height: 98,
    borderRadius: 14,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  langCardSelected: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  langCardContent: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 56,
    zIndex: 2,
  },
  langCardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  langAvatarContainer: {
    position: 'absolute',
    right: 12,
    top: 15,
    bottom: 15,
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    elevation: 3,
  },
  langAvatarImage: {
    width: '100%',
    height: '100%',
  },
  langCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1ED760',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 4,
  },
  langBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#0D0E11',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  bottomBarInner: {
    width: '100%',
  },
  bottomBarInnerDesktop: {
    maxWidth: 480,
    alignSelf: 'center',
  },
  cyanContinueBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1ED760',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 6,
    shadowColor: '#1ED760',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  cyanBtnDisabled: {
    backgroundColor: 'rgba(30, 215, 96, 0.3)',
    elevation: 0,
    shadowOpacity: 0,
  },
  cyanContinueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.2,
  },

  /* Step 2: Artist Picker */
  artistTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backIconButton: {
    padding: 6,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingRight: 6,
  },
  artistHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  artistTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  searchPillWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchPillWrapperDesktop: {
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    height: 44,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchPillInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
    paddingVertical: 0,
  },
  chipsRow: {
    paddingVertical: 10,
  },
  chipsRowDesktop: {
    maxWidth: 880,
    width: '100%',
    alignSelf: 'center',
  },
  chipsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipActive: {
    backgroundColor: '#1ED760',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterChipTextActive: {
    color: '#000000',
  },
  artistScroll: {
    flex: 1,
  },
  artistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 90,
  },
  artistGridItem: {
    alignItems: 'center',
    marginBottom: 16,
  },
  artistAvatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  artistAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
  },
  artistAvatarSelected: {
    borderWidth: 3,
    borderColor: '#1ED760',
  },
  artistCheckBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1ED760',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0D0E11',
  },
  artistGridName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 17,
  },
  artistBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#0D0E11',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },

  /* Step 3: "Great picks!" Screen */
  greatPicksContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlappingCirclesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  overlappingCircleItem: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#000000',
    overflow: 'hidden',
    marginHorizontal: -14,
    elevation: 8,
  },
  overlappingCircleCenter: {
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  overlappingImage: {
    width: '100%',
    height: '100%',
  },
  greatPicksTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
});
