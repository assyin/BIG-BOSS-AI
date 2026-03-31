import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { ExerciseDetail, DifficultyLevel, Exercise } from '@/types/exercise.types';
import ExerciseService from '@/services/exercise.service';

type TabKey = 'demo' | 'form' | 'mistakes' | 'tips';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'demo', label: 'Demo', icon: 'play-circle-outline' },
  { key: 'form', label: 'Forme', icon: 'body-outline' },
  { key: 'mistakes', label: 'Erreurs', icon: 'warning-outline' },
  { key: 'tips', label: 'Tips', icon: 'bulb-outline' },
];

const MUSCLE_LABELS: Record<string, string> = {
  Chest: 'Poitrine',
  Back: 'Dos',
  Quadriceps: 'Jambes',
  Hamstrings: 'Ischio',
  Glutes: 'Fessiers',
  Calves: 'Mollets',
  Shoulders: 'Epaules',
  Biceps: 'Biceps',
  Triceps: 'Triceps',
  Abs: 'Abdos',
  Cardio: 'Cardio',
  Mobility: 'Mobilite',
  Bodyweight: 'Poids du corps',
};

const DIFFICULTY_CONFIG: Record<DifficultyLevel, { label: string; color: string; bg: string }> = {
  Beginner: { label: 'Debutant', color: Colors.success, bg: Colors.successLight },
  Intermediate: { label: 'Intermediaire', color: Colors.info, bg: Colors.infoLight },
  Advanced: { label: 'Avance', color: Colors.warning, bg: Colors.warningLight },
  Expert: { label: 'Expert', color: Colors.error, bg: Colors.errorLight },
};

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [alternatives, setAlternatives] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('demo');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    setVideoError(false);
    setVideoLoading(false);
  }, []);

  const handleVideoLoadStart = useCallback(() => {
    setVideoLoading(true);
    setVideoError(false);
  }, []);

  const handleVideoLoad = useCallback(() => {
    setVideoLoading(false);
  }, []);

  const handleVideoError = useCallback(() => {
    setVideoLoading(false);
    setVideoError(true);
  }, []);

  useEffect(() => {
    if (id) {
      loadExercise();
    }
  }, [id]);

  const loadExercise = async () => {
    try {
      const [data, alts] = await Promise.all([
        ExerciseService.getExercise(id!),
        ExerciseService.getAlternatives(id!).catch(() => []),
      ]);
      setExercise(data);
      setAlternatives(alts);
    } catch {
      // Error state
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Exercice introuvable</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const diffConfig = DIFFICULTY_CONFIG[exercise.difficulty];
  const muscleLabel = MUSCLE_LABELS[exercise.primaryMuscle] ?? exercise.primaryMuscle;

  const getVideoUrl = (): string | null => {
    if (!exercise.videos) return null;
    switch (activeTab) {
      case 'demo': return exercise.videos.demoUrl;
      case 'form': return exercise.videos.formUrl;
      case 'mistakes': return exercise.videos.mistakesUrl;
      case 'tips': return exercise.videos.tipsUrl;
    }
    return null;
  };

  const getVideoLabel = (): string => {
    switch (activeTab) {
      case 'demo': return 'Video de demonstration';
      case 'form': return 'Video de forme correcte';
      case 'mistakes': return 'Video des erreurs courantes';
      case 'tips': return 'Video de conseils';
    }
  };

  const currentVideoUrl = getVideoUrl();
  const thumbnailUrl = exercise.videos?.thumbnailUrl || exercise.thumbnailUrl;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/exercises')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Detail
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Exercise Name & Badges */}
        <Text style={styles.exerciseName}>{exercise.nameFr || exercise.name}</Text>
        {exercise.nameAr && (
          <Text style={styles.exerciseNameAr}>{exercise.nameAr}</Text>
        )}
        {exercise.descriptionFr && (
          <Text style={styles.exerciseDescription}>{exercise.descriptionFr}</Text>
        )}
        <View style={styles.badgeRow}>
          <View style={[styles.muscleBadge, { backgroundColor: Colors.primaryDim }]}>
            <Text style={[styles.muscleBadgeText, { color: Colors.primary }]}>
              {muscleLabel}
            </Text>
          </View>
          <View style={[styles.diffBadge, { backgroundColor: diffConfig.bg }]}>
            <Text style={[styles.diffBadgeText, { color: diffConfig.color }]}>
              {diffConfig.label}
            </Text>
          </View>
          {exercise.secondaryMuscles.map((m) => (
            <View key={m} style={[styles.muscleBadge, { backgroundColor: Colors.background }]}>
              <Text style={[styles.muscleBadgeText, { color: Colors.gray }]}>
                {MUSCLE_LABELS[m] ?? m}
              </Text>
            </View>
          ))}
        </View>

        {/* Video Tabs */}
        <View style={styles.tabsRow}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => handleTabChange(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={isActive ? Colors.white : Colors.gray}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Video Section */}
        <View style={styles.videoContainer}>
          {currentVideoUrl ? (
            Platform.OS === 'web' ? (
              <View style={styles.videoPlayer}>
                <video
                  key={currentVideoUrl}
                  src={currentVideoUrl}
                  controls
                  playsInline
                  style={{ width: '100%', maxHeight: 500, borderRadius: 12, backgroundColor: '#000' } as any}
                />
              </View>
            ) : (
              <View style={styles.videoPlaceholderInner}>
                {thumbnailUrl ? (
                  <Image source={{ uri: thumbnailUrl }} style={styles.videoThumbnail} resizeMode="cover" />
                ) : null}
                <View style={[styles.playIconBox, thumbnailUrl && styles.playIconOverlay]}>
                  <Ionicons name="play-circle" size={48} color={Colors.white} />
                </View>
              </View>
            )
          ) : (
            <View style={styles.videoPlaceholderInner}>
              {thumbnailUrl ? (
                <Image source={{ uri: thumbnailUrl }} style={styles.videoThumbnail} resizeMode="cover" />
              ) : null}
              <View style={[styles.playIconBox, thumbnailUrl && styles.playIconOverlay]}>
                <Ionicons name="videocam-off-outline" size={32} color={Colors.white} />
              </View>
              <Text style={styles.videoText}>Aucune video disponible</Text>
            </View>
          )}
          <Text style={styles.videoLabel}>{getVideoLabel()}</Text>
        </View>

        {/* Instructions */}
        {exercise.instructionsFr && exercise.instructionsFr.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Instructions</Text>
            </View>
            <View style={styles.sectionCard}>
              {exercise.instructionsFr.map((instruction, i) => (
                <View key={i} style={styles.bulletItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.bulletText}>{instruction}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Coaching Cues */}
        {exercise.coachingCues && exercise.coachingCues.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle-outline" size={20} color={Colors.success} />
              <Text style={styles.sectionTitle}>Coaching Cues</Text>
            </View>
            <View style={styles.sectionCard}>
              {exercise.coachingCues.map((cue, i) => (
                <View key={i} style={styles.bulletItem}>
                  <View style={[styles.bulletDot, { backgroundColor: Colors.success }]} />
                  <Text style={styles.bulletText}>{cue}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Common Mistakes (merge backend fields) */}
        {((exercise.commonMistakes && exercise.commonMistakes.length > 0) ||
          (exercise.erreursCourantesFr && exercise.erreursCourantesFr.length > 0)) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle-outline" size={20} color={Colors.error} />
              <Text style={styles.sectionTitle}>Erreurs courantes</Text>
            </View>
            <View style={styles.sectionCard}>
              {[
                ...(exercise.erreursCourantesFr || []),
                ...(exercise.commonMistakes || []).filter(
                  (m) => !(exercise.erreursCourantesFr || []).includes(m)
                ),
              ].map((mistake, i) => (
                <View key={i} style={styles.bulletItem}>
                  <View style={[styles.bulletDot, { backgroundColor: Colors.error }]} />
                  <Text style={styles.bulletText}>{mistake}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tips du Coach */}
        {exercise.tipsCoachFr && exercise.tipsCoachFr.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb-outline" size={20} color={Colors.warning} />
              <Text style={styles.sectionTitle}>Conseils du Coach</Text>
            </View>
            <View style={styles.sectionCard}>
              {exercise.tipsCoachFr.map((tip, i) => (
                <View key={i} style={styles.bulletItem}>
                  <View style={[styles.bulletDot, { backgroundColor: Colors.warning }]} />
                  <Text style={styles.bulletText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Rep Ranges */}
        {exercise.repRanges && <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Plages de Repetitions</Text>
          </View>
          <View style={styles.repRangesRow}>
            <View style={styles.repRangeCard}>
              <View style={[styles.repRangeIcon, { backgroundColor: Colors.primaryDim }]}>
                <Ionicons name="resize-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.repRangeTitle}>Hypertrophie</Text>
              <Text style={styles.repRangeValue}>
                {exercise.repRanges.hypertrophy.min}-{exercise.repRanges.hypertrophy.max} reps
              </Text>
            </View>
            <View style={styles.repRangeCard}>
              <View style={[styles.repRangeIcon, { backgroundColor: Colors.errorLight }]}>
                <Ionicons name="barbell-outline" size={18} color={Colors.error} />
              </View>
              <Text style={styles.repRangeTitle}>Force</Text>
              <Text style={styles.repRangeValue}>
                {exercise.repRanges.strength.min}-{exercise.repRanges.strength.max} reps
              </Text>
            </View>
            <View style={styles.repRangeCard}>
              <View style={[styles.repRangeIcon, { backgroundColor: Colors.successLight }]}>
                <Ionicons name="heart-outline" size={18} color={Colors.success} />
              </View>
              <Text style={styles.repRangeTitle}>Endurance</Text>
              <Text style={styles.repRangeValue}>
                {exercise.repRanges.endurance.min}-{exercise.repRanges.endurance.max} reps
              </Text>
            </View>
          </View>
        </View>}

        {/* Equipment */}
        {exercise.requiredEquipmentList && exercise.requiredEquipmentList.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="construct-outline" size={20} color={Colors.warning} />
              <Text style={styles.sectionTitle}>Equipement</Text>
            </View>
            <View style={styles.equipmentRow}>
              {exercise.requiredEquipmentList.map((eq) => (
                <View key={eq} style={styles.equipmentChip}>
                  <Text style={styles.equipmentChipText}>{eq}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recommended Tempo */}
        {exercise.recommendedTempo && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="speedometer-outline" size={20} color={Colors.info} />
              <Text style={styles.sectionTitle}>Tempo recommande</Text>
            </View>
            <View style={styles.tempoCard}>
              <Text style={styles.tempoText}>{exercise.recommendedTempo}</Text>
            </View>
          </View>
        )}

        {/* Alternative Exercises */}
        {alternatives.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="swap-horizontal-outline" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Alternatives</Text>
            </View>
            {alternatives.map((alt) => (
              <TouchableOpacity
                key={alt.id}
                style={styles.altCard}
                onPress={() => router.push(`/exercises/${alt.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.altIconBox}>
                  <Ionicons name="barbell-outline" size={18} color={Colors.primary} />
                </View>
                <View style={styles.altInfo}>
                  <Text style={styles.altName}>{alt.name}</Text>
                  <Text style={styles.altMuscle}>
                    {MUSCLE_LABELS[alt.primaryMuscle] ?? alt.primaryMuscle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.lightGray} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Contraindications */}
        {exercise.contraindications && exercise.contraindications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-outline" size={20} color={Colors.error} />
              <Text style={styles.sectionTitle}>Contre-indications</Text>
            </View>
            <View style={[styles.sectionCard, { backgroundColor: Colors.errorLight }]}>
              {exercise.contraindications.map((ci, i) => (
                <View key={i} style={styles.bulletItem}>
                  <Ionicons name="alert-outline" size={14} color={Colors.error} />
                  <Text style={[styles.bulletText, { color: Colors.error }]}>{ci}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    color: Colors.dark,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    ...Typography.body,
    color: Colors.gray,
  },
  linkText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: Fonts.weight.semiBold,
  },
  exerciseName: {
    ...Typography.h2,
    color: Colors.dark,
    marginBottom: 4,
  },
  exerciseNameAr: {
    fontSize: Fonts.size.lg,
    color: Colors.gray,
    marginBottom: 12,
    textAlign: 'right',
  },
  exerciseDescription: {
    ...Typography.body,
    color: Colors.gray,
    marginBottom: 12,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  muscleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  muscleBadgeText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
  },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  diffBadgeText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.white,
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.gray,
  },
  tabTextActive: {
    color: Colors.white,
  },
  videoContainer: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    backgroundColor: '#000',
    alignItems: 'center',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    gap: 8,
  },
  videoOverlayText: {
    ...Typography.caption,
    color: Colors.white,
  },
  videoPlaceholderInner: {
    height: 200,
    backgroundColor: Colors.darkGray,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  videoThumbnail: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  playIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  playIconOverlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  videoText: {
    ...Typography.caption,
    color: Colors.lightGray,
  },
  videoLabel: {
    ...Typography.caption,
    color: Colors.lightGray,
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: '#111',
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.bold,
    color: Colors.white,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.dark,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    ...Typography.body,
    color: Colors.dark,
    flex: 1,
    lineHeight: 20,
  },
  repRangesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  repRangeCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  repRangeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  repRangeTitle: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.gray,
    marginBottom: 2,
  },
  repRangeValue: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  equipmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipmentChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  equipmentChipText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.medium,
    color: Colors.dark,
  },
  tempoCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  tempoText: {
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    color: Colors.primary,
    letterSpacing: 4,
  },
  altCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  altIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  altInfo: {
    flex: 1,
  },
  altName: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  altMuscle: {
    ...Typography.caption,
    color: Colors.gray,
  },
});
