import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { MuscleGroup } from '@/types/exercise.types';
import { useSessionStore } from '@/store/session.store';
import { Button } from '@/components/ui/Button';

interface MuscleOption {
  key: string;
  label: string;
  group: number;
  icon: keyof typeof Ionicons.glyphMap;
}

const MUSCLE_OPTIONS: MuscleOption[] = [
  { key: 'chest', label: 'Poitrine', group: 1, icon: 'body-outline' },
  { key: 'back', label: 'Dos', group: 2, icon: 'arrow-back-outline' },
  { key: 'legs', label: 'Jambes', group: 3, icon: 'walk-outline' },
  { key: 'shoulders', label: 'Epaules', group: 7, icon: 'resize-outline' },
  { key: 'arms', label: 'Bras', group: 8, icon: 'fitness-outline' },
  { key: 'abs', label: 'Abdos', group: 10, icon: 'diamond-outline' },
  { key: 'fullbody', label: 'Full Body', group: 13, icon: 'people-outline' },
  { key: 'cardio', label: 'Cardio', group: 11, icon: 'heart-outline' },
];

const DURATION_OPTIONS = [30, 45, 60, 75, 90];

const ENERGY_EMOJIS = [
  { level: 1, emoji: '😴', label: 'Epuise' },
  { level: 2, emoji: '😐', label: 'Fatigue' },
  { level: 3, emoji: '🙂', label: 'Normal' },
  { level: 4, emoji: '💪', label: 'Energique' },
  { level: 5, emoji: '🔥', label: 'En feu' },
];

const LOADING_MESSAGES = [
  "L'IA prepare ta seance...",
  'Analyse de ton profil...',
  'Selection des exercices...',
  'Optimisation du programme...',
];

export default function GenerateSessionScreen() {
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [duration, setDuration] = useState(60);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const { generateSession, isLoading } = useSessionStore();

  const handleGenerate = async () => {
    const muscleOption = MUSCLE_OPTIONS.find((m) => m.key === selectedMuscle);

    // Cycle loading messages
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    try {
      const session = await generateSession({
        preferredMuscleGroup: muscleOption?.group,
        durationMinutes: duration,
        energyLevel: energyLevel * 2, // Scale 1-5 to 2-10 for backend
      });

      clearInterval(interval);
      router.replace(`/sessions/${session.id}`);
    } catch (err) {
      clearInterval(interval);
      Alert.alert(
        'Erreur',
        err instanceof Error ? err.message : 'Impossible de generer la seance. Verifie ta connexion.'
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
          <Text style={styles.loadingTitle}>{LOADING_MESSAGES[loadingMessageIndex]}</Text>
          <Text style={styles.loadingSubtitle}>Cela peut prendre quelques secondes</Text>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.loadingDot,
                  i <= loadingMessageIndex % 3 && styles.loadingDotActive,
                ]}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle Seance</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Muscle Group Selection */}
        <Text style={styles.sectionTitle}>Groupe musculaire</Text>
        <Text style={styles.sectionSubtitle}>Choisis le focus de ta seance</Text>
        <View style={styles.muscleGrid}>
          {MUSCLE_OPTIONS.map((option) => {
            const isSelected = selectedMuscle === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.muscleCard, isSelected && styles.muscleCardSelected]}
                onPress={() =>
                  setSelectedMuscle(isSelected ? null : option.key)
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.muscleIconBox,
                    isSelected && styles.muscleIconBoxSelected,
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={isSelected ? Colors.white : Colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.muscleLabel,
                    isSelected && styles.muscleLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Duration Selection */}
        <Text style={styles.sectionTitle}>Duree</Text>
        <Text style={styles.sectionSubtitle}>Combien de temps as-tu ?</Text>
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((d) => {
            const isSelected = duration === d;
            return (
              <TouchableOpacity
                key={d}
                style={[
                  styles.durationChip,
                  isSelected && styles.durationChipSelected,
                ]}
                onPress={() => setDuration(d)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.durationChipText,
                    isSelected && styles.durationChipTextSelected,
                  ]}
                >
                  {d} min
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Energy Level */}
        <Text style={styles.sectionTitle}>Niveau d'energie</Text>
        <Text style={styles.sectionSubtitle}>Comment te sens-tu ?</Text>
        <View style={styles.energyRow}>
          {ENERGY_EMOJIS.map((item) => {
            const isSelected = energyLevel === item.level;
            return (
              <TouchableOpacity
                key={item.level}
                style={[styles.energyItem, isSelected && styles.energyItemSelected]}
                onPress={() => setEnergyLevel(item.level)}
                activeOpacity={0.7}
              >
                <Text style={styles.energyEmoji}>{item.emoji}</Text>
                <Text
                  style={[
                    styles.energyLabel,
                    isSelected && styles.energyLabelSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Generate Button */}
        <View style={styles.generateButtonContainer}>
          <Button
            title="Generer ma seance"
            onPress={handleGenerate}
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
          />
        </View>
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
  sectionTitle: {
    ...Typography.h4,
    color: Colors.dark,
    marginTop: 24,
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.gray,
    marginBottom: 14,
  },
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  muscleCard: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  muscleCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryDim,
  },
  muscleIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  muscleIconBoxSelected: {
    backgroundColor: Colors.primary,
  },
  muscleLabel: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  muscleLabelSelected: {
    color: Colors.primary,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  durationChipSelected: {
    backgroundColor: Colors.primary,
  },
  durationChipText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  durationChipTextSelected: {
    color: Colors.white,
  },
  energyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  energyItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  energyItemSelected: {
    backgroundColor: Colors.primaryDim,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  energyEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  energyLabel: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.medium,
    color: Colors.gray,
  },
  energyLabelSelected: {
    color: Colors.primary,
    fontWeight: Fonts.weight.semiBold,
  },
  generateButtonContainer: {
    marginTop: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loadingTitle: {
    ...Typography.h4,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubtitle: {
    ...Typography.body,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  loadingDotActive: {
    backgroundColor: Colors.primary,
  },
});
