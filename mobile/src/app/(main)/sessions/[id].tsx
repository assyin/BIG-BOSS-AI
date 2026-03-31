import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { Session, SessionStatus } from '@/types/session.types';
import SessionService from '@/services/session.service';
import { useSessionStore } from '@/store/session.store';
import { Button } from '@/components/ui/Button';

const STATUS_CONFIG: Record<SessionStatus, { label: string; color: string; bg: string }> = {
  Generated: { label: 'Generee', color: Colors.info, bg: Colors.infoLight },
  InProgress: { label: 'En cours', color: Colors.warning, bg: Colors.warningLight },
  Completed: { label: 'Terminee', color: Colors.success, bg: Colors.successLight },
  Abandoned: { label: 'Abandonnee', color: Colors.error, bg: Colors.errorLight },
};

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { startSession, isLoading: actionLoading } = useSessionStore();

  useEffect(() => {
    if (id) {
      loadSession();
    }
  }, [id]);

  const loadSession = async () => {
    try {
      setError(null);
      const data = await SessionService.getSession(id!);
      setSession(data);
    } catch (err) {
      setError('Impossible de charger la seance');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!session) return;
    try {
      await startSession(session.id);
      router.push('/sessions/active');
    } catch {
      // Error handled in store
    }
  };

  const handleContinue = () => {
    if (!session) return;
    // Load session into store and navigate
    const nextIndex = (session.exercises || []).findIndex((e) => !e.isCompleted);
    useSessionStore.setState({
      currentSession: session,
      activeExerciseIndex: nextIndex >= 0 ? nextIndex : 0,
    });
    router.push('/sessions/active');
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

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error || 'Seance introuvable'}</Text>
          <Button title="Retour" onPress={() => router.canGoBack() ? router.back() : router.replace('/sessions')} variant="outline" />
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_CONFIG[session.status];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/sessions')}
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
        {/* Session Info */}
        <View style={styles.sessionHeader}>
          <View style={styles.sessionTitleRow}>
            <Text style={styles.sessionTitle}>{session.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
          {session.description && (
            <Text style={styles.sessionDescription}>{session.description}</Text>
          )}

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Ionicons name="time-outline" size={18} color={Colors.primary} />
              <Text style={styles.quickStatValue}>
                {session.stats?.actualDurationMinutes ?? session.plannedDurationMinutes} min
              </Text>
              <Text style={styles.quickStatLabel}>Duree</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Ionicons name="barbell-outline" size={18} color={Colors.primary} />
              <Text style={styles.quickStatValue}>{(session.exercises || []).length}</Text>
              <Text style={styles.quickStatLabel}>Exercices</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Ionicons name="layers-outline" size={18} color={Colors.primary} />
              <Text style={styles.quickStatValue}>
                {session.stats?.totalSets ??
                  (session.exercises || []).reduce((a, e) => a + e.setsPlanned, 0)}
              </Text>
              <Text style={styles.quickStatLabel}>Sets</Text>
            </View>
            {session.stats && (
              <>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStatItem}>
                  <Ionicons name="fitness-outline" size={18} color={Colors.primary} />
                  <Text style={styles.quickStatValue}>
                    {session.stats.totalVolumeKg.toLocaleString()}
                  </Text>
                  <Text style={styles.quickStatLabel}>kg</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Exercises List */}
        <Text style={styles.sectionTitle}>Exercices</Text>
        {(session.exercises || [])
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((exercise, index) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseIndex}>
                <Text style={styles.exerciseIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                <View style={styles.exerciseDetails}>
                  <Text style={styles.exerciseDetailText}>
                    {exercise.setsPlanned} x {exercise.repsPlanned} reps
                  </Text>
                  {exercise.weightPlannedKg != null && (
                    <Text style={styles.exerciseDetailText}>
                      {' '}
                      · {exercise.weightPlannedKg} kg
                    </Text>
                  )}
                </View>
                {exercise.restSecondsPlanned > 0 && (
                  <Text style={styles.exerciseRest}>
                    Repos: {exercise.restSecondsPlanned}s
                  </Text>
                )}
              </View>
              {exercise.isCompleted && (
                <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              )}
            </View>
          ))}

        {/* Completed Summary */}
        {session.status === 'Completed' && session.stats && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Resume</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Duree effective</Text>
                <Text style={styles.summaryValue}>
                  {session.stats.actualDurationMinutes} min
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Volume total</Text>
                <Text style={styles.summaryValue}>
                  {session.stats.totalVolumeKg.toLocaleString()} kg
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Sets completes</Text>
                <Text style={styles.summaryValue}>{session.stats.totalSets}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Reps totales</Text>
                <Text style={styles.summaryValue}>{session.stats.totalReps}</Text>
              </View>
              {session.stats.averageFormScore != null && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Score de forme</Text>
                  <Text style={styles.summaryValue}>
                    {session.stats.averageFormScore}/10
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {session.status === 'Generated' && (
            <Button
              title="Commencer"
              onPress={handleStart}
              variant="primary"
              size="lg"
              fullWidth
              loading={actionLoading}
            />
          )}
          {session.status === 'InProgress' && (
            <Button
              title="Continuer"
              onPress={handleContinue}
              variant="primary"
              size="lg"
              fullWidth
            />
          )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    ...Typography.body,
    color: Colors.gray,
  },
  sessionHeader: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sessionTitle: {
    ...Typography.h3,
    color: Colors.dark,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
  },
  sessionDescription: {
    ...Typography.body,
    color: Colors.gray,
    marginBottom: 16,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
    marginTop: 4,
  },
  quickStatLabel: {
    ...Typography.caption,
    color: Colors.gray,
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.dark,
    marginBottom: 14,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  exerciseIndex: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseIndexText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.bold,
    color: Colors.primary,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  exerciseDetails: {
    flexDirection: 'row',
    marginTop: 2,
  },
  exerciseDetailText: {
    ...Typography.caption,
    color: Colors.gray,
  },
  exerciseRest: {
    ...Typography.caption,
    color: Colors.lightGray,
    marginTop: 2,
  },
  summarySection: {
    marginTop: 10,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...Typography.body,
    color: Colors.gray,
  },
  summaryValue: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  actionContainer: {
    marginTop: 24,
  },
});
