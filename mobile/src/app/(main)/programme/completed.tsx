import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import ProgrammeService, { Programme, ProgrammeProgress } from '@/services/programme.service';

export default function ProgrammeCompletedScreen() {
  const { programmeId } = useLocalSearchParams<{ programmeId: string }>();

  const [programme, setProgramme] = useState<Programme | null>(null);
  const [progress, setProgress] = useState<ProgrammeProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function load() {
      if (!programmeId) return;
      try {
        const [prog, prog_progress] = await Promise.all([
          ProgrammeService.getProgramme(programmeId),
          ProgrammeService.getProgress(programmeId),
        ]);
        setProgramme(prog);
        setProgress(prog_progress);
      } catch (err) {
        console.error('Failed to load completed programme:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [programmeId]);

  useEffect(() => {
    if (!loading) {
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const handleNewProgramme = async () => {
    setGenerating(true);
    try {
      await ProgrammeService.generateProgramme();
      router.replace('/');
    } catch {
      // error handled by global handler
    } finally {
      setGenerating(false);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.webWrapper}>
          {/* Trophy animation */}
          <Animated.View style={[styles.trophyContainer, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.trophyCircle}>
              <Text style={styles.trophyEmoji}>{'\u{1F3C6}'}</Text>
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.congratsTitle}>Felicitations !</Text>
            <Text style={styles.congratsSubtitle}>
              Tu as termine ton programme{'\n'}
              <Text style={styles.programmeName}>{programme?.title}</Text>
            </Text>

            {/* Stats */}
            {progress && (
              <View style={styles.statsCard}>
                <View style={styles.statsGrid}>
                  <StatItem
                    icon="checkmark-circle"
                    color={Colors.success}
                    value={`${progress.completedSessions}`}
                    label="Seances faites"
                  />
                  <StatItem
                    icon="calendar"
                    color={Colors.info}
                    value={`${progress.durationWeeks}`}
                    label="Semaines"
                  />
                  <StatItem
                    icon="trending-up"
                    color={Colors.primary}
                    value={`${Math.round(progress.adherencePercent)}%`}
                    label="Adherence"
                  />
                  <StatItem
                    icon="close-circle"
                    color={Colors.error}
                    value={`${progress.missedSessions}`}
                    label="Manquees"
                  />
                </View>
              </View>
            )}

            {/* Actions */}
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={handleNewProgramme}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color={Colors.white} />
                  <Text style={styles.primaryBtnText}>Generer un nouveau programme</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.85}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.secondaryBtnText}>Retour au dashboard</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({
  icon,
  color,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statItemValue}>{value}</Text>
      <Text style={styles.statItemLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 80 : 60,
    paddingBottom: 40,
  },
  webWrapper: { width: '100%', maxWidth: 500, alignSelf: 'center' as const },

  trophyContainer: { alignItems: 'center', marginBottom: 24 },
  trophyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyEmoji: { fontSize: 56 },

  congratsTitle: {
    ...Typography.h2,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 8,
  },
  congratsSubtitle: {
    ...Typography.bodyLarge,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  programmeName: { fontWeight: Fonts.weight.bold, color: Colors.primary },

  statsCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 20,
  },
  statItem: { alignItems: 'center', width: '40%' },
  statItemValue: { ...Typography.h3, color: Colors.dark, marginTop: 6 },
  statItemLabel: { ...Typography.caption, color: Colors.gray, marginTop: 2 },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: { ...Typography.button, color: Colors.white },

  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryBtnText: { ...Typography.body, color: Colors.gray, fontWeight: Fonts.weight.semiBold },
});
