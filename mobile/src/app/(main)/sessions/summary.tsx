import { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { SessionSummary } from '@/types/session.types';
import { Button } from '@/components/ui/Button';
import { useSessionStore } from '@/store/session.store';
import ProgrammeService from '@/services/programme.service';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color: string;
  bg: string;
}

function StatCard({ icon, value, label, color, bg }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function SummaryScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const programmeContext = useSessionStore((s) => s.programmeContext);
  const [programmeCompleted, setProgrammeCompleted] = useState(false);
  const [programmeId, setProgrammeId] = useState<string | null>(null);

  const summary: SessionSummary | null = useMemo(() => {
    try {
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }, [data]);

  // Check if the programme was completed after this session
  useEffect(() => {
    if (!programmeContext) return;
    setProgrammeId(programmeContext.programmeId);
    ProgrammeService.getProgress(programmeContext.programmeId)
      .then((prog) => {
        if (prog.progressPercent >= 100) {
          setProgrammeCompleted(true);
        }
      })
      .catch(() => {});
  }, [programmeContext]);

  if (!summary) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucun resume disponible</Text>
          <Button title="Retour" onPress={() => router.replace('/sessions')} variant="outline" />
        </View>
      </SafeAreaView>
    );
  }

  const { stats } = summary;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={styles.successContainer}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={48} color={Colors.white} />
          </View>
          <Text style={styles.successTitle}>Seance terminee !</Text>
          <Text style={styles.successSubtitle}>{summary.title}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="time-outline"
            value={`${stats.actualDurationMinutes} min`}
            label="Duree"
            color={Colors.primary}
            bg={Colors.primaryDim}
          />
          <StatCard
            icon="fitness-outline"
            value={`${stats.totalVolumeKg.toLocaleString()} kg`}
            label="Volume"
            color={Colors.success}
            bg={Colors.successLight}
          />
          <StatCard
            icon="layers-outline"
            value={String(stats.totalSets)}
            label="Sets"
            color={Colors.info}
            bg={Colors.infoLight}
          />
          <StatCard
            icon="barbell-outline"
            value={String(stats.exercisesCompleted)}
            label="Exercices"
            color={Colors.warning}
            bg={Colors.warningLight}
          />
        </View>

        {/* AI Motivational Message */}
        {summary.aiMotivationalMessage && (
          <View style={styles.aiMessageCard}>
            <View style={styles.aiMessageHeader}>
              <Ionicons name="sparkles" size={18} color={Colors.primary} />
              <Text style={styles.aiMessageTitle}>Message du Coach IA</Text>
            </View>
            <Text style={styles.aiMessageText}>{summary.aiMotivationalMessage}</Text>
          </View>
        )}

        {/* Personal Records */}
        {summary.newPersonalRecords && summary.newPersonalRecords.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy" size={20} color={Colors.warning} />
              <Text style={styles.sectionTitle}>Records Personnels</Text>
            </View>
            {summary.newPersonalRecords.map((pr, i) => (
              <View key={i} style={styles.prCard}>
                <View style={styles.prIconBox}>
                  <Ionicons name="medal-outline" size={20} color={Colors.warning} />
                </View>
                <View style={styles.prInfo}>
                  <Text style={styles.prExercise}>{pr.exerciseName}</Text>
                  <Text style={styles.prType}>{pr.recordType}</Text>
                </View>
                <View style={styles.prValues}>
                  <Text style={styles.prOldValue}>
                    {pr.previousValue} {pr.unit}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.success} />
                  <Text style={styles.prNewValue}>
                    {pr.newValue} {pr.unit}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* AI Recommendations */}
        {summary.aiRecommendations && summary.aiRecommendations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb-outline" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Recommandations</Text>
            </View>
            <View style={styles.recommendationsCard}>
              {summary.aiRecommendations.map((rec, i) => (
                <View key={i} style={styles.recItem}>
                  <View style={styles.recBullet} />
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Session Comparison */}
        {summary.comparisonWithLastSession && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="analytics-outline" size={20} color={Colors.info} />
              <Text style={styles.sectionTitle}>Comparaison</Text>
            </View>
            <View style={styles.comparisonCard}>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Volume</Text>
                <Text
                  style={[
                    styles.comparisonValue,
                    {
                      color:
                        summary.comparisonWithLastSession.volumeChangePercent >= 0
                          ? Colors.success
                          : Colors.error,
                    },
                  ]}
                >
                  {summary.comparisonWithLastSession.volumeChangePercent >= 0 ? '+' : ''}
                  {summary.comparisonWithLastSession.volumeChangePercent.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Intensite</Text>
                <Text
                  style={[
                    styles.comparisonValue,
                    {
                      color:
                        summary.comparisonWithLastSession.intensityChangePercent >= 0
                          ? Colors.success
                          : Colors.error,
                    },
                  ]}
                >
                  {summary.comparisonWithLastSession.intensityChangePercent >= 0 ? '+' : ''}
                  {summary.comparisonWithLastSession.intensityChangePercent.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Nutrition Recommendation */}
        {summary.postWorkoutNutrition && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="nutrition-outline" size={20} color={Colors.success} />
              <Text style={styles.sectionTitle}>Nutrition Post-Seance</Text>
            </View>
            <View style={styles.nutritionCard}>
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Calories</Text>
                <Text style={styles.nutritionValue}>
                  {summary.postWorkoutNutrition.recommendedCalories} kcal
                </Text>
              </View>
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Proteines</Text>
                <Text style={styles.nutritionValue}>
                  {summary.postWorkoutNutrition.recommendedProteinG}g
                </Text>
              </View>
              {summary.postWorkoutNutrition.suggestedFoods && summary.postWorkoutNutrition.suggestedFoods.length > 0 && (
                <View style={styles.suggestedFoods}>
                  <Text style={styles.nutritionLabel}>Suggestions:</Text>
                  <Text style={styles.suggestedFoodsText}>
                    {summary.postWorkoutNutrition.suggestedFoods.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Programme completed banner */}
        {programmeCompleted && programmeId && (
          <View style={styles.programmeCompletedCard}>
            <Text style={styles.programmeCompletedEmoji}>{'\u{1F3C6}'}</Text>
            <Text style={styles.programmeCompletedTitle}>Programme termine !</Text>
            <Text style={styles.programmeCompletedDesc}>
              Tu as complete toutes les seances de ton programme. Bravo !
            </Text>
            <Button
              title="Voir les resultats"
              onPress={() =>
                router.replace({
                  pathname: '/(main)/programme/completed',
                  params: { programmeId },
                })
              }
              variant="primary"
              size="lg"
              fullWidth
            />
          </View>
        )}

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <Button
            title="Retour a l'accueil"
            onPress={() => router.replace('/(main)')}
            variant={programmeCompleted ? 'outline' : 'primary'}
            size="lg"
            fullWidth
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.gray,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  successTitle: {
    ...Typography.h2,
    color: Colors.dark,
    marginBottom: 4,
  },
  successSubtitle: {
    ...Typography.body,
    color: Colors.gray,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.gray,
    marginTop: 2,
  },
  aiMessageCard: {
    backgroundColor: Colors.primaryDim,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  aiMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiMessageTitle: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.primary,
  },
  aiMessageText: {
    ...Typography.body,
    color: Colors.dark,
    lineHeight: 22,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.dark,
  },
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  prIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  prInfo: {
    flex: 1,
  },
  prExercise: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  prType: {
    ...Typography.caption,
    color: Colors.gray,
  },
  prValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prOldValue: {
    ...Typography.caption,
    color: Colors.gray,
    textDecorationLine: 'line-through',
  },
  prNewValue: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.bold,
    color: Colors.success,
  },
  recommendationsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  recBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 7,
  },
  recText: {
    ...Typography.body,
    color: Colors.dark,
    flex: 1,
    lineHeight: 20,
  },
  comparisonCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonLabel: {
    ...Typography.body,
    color: Colors.gray,
  },
  comparisonValue: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.bold,
  },
  nutritionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutritionLabel: {
    ...Typography.body,
    color: Colors.gray,
  },
  nutritionValue: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  suggestedFoods: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  suggestedFoodsText: {
    ...Typography.body,
    color: Colors.dark,
    marginTop: 4,
  },
  programmeCompletedCard: {
    backgroundColor: Colors.warningLight,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  programmeCompletedEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  programmeCompletedTitle: {
    ...Typography.h3,
    color: Colors.dark,
    marginBottom: 6,
  },
  programmeCompletedDesc: {
    ...Typography.body,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 16,
  },
  actionContainer: {
    marginTop: 12,
  },
});
