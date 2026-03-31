import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { useSessionStore } from '@/store/session.store';
import ProgrammeService, { ProgrammeSession } from '@/services/programme.service';

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function WeekScreen() {
  const { programmeId, weekNumber } = useLocalSearchParams<{
    programmeId: string;
    weekNumber: string;
  }>();
  const sessionStore = useSessionStore();

  const [sessions, setSessions] = useState<ProgrammeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  const week = parseInt(weekNumber || '1', 10);

  const loadData = useCallback(async () => {
    if (!programmeId) return;
    try {
      const data = await ProgrammeService.getWeekSessions(programmeId, week);
      setSessions(data);
    } catch (err) {
      console.error('Failed to load week sessions:', err);
    }
  }, [programmeId, week]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      loadData().finally(() => {
        if (active) setLoading(false);
      });
      return () => { active = false; };
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStartSession = async (ps: ProgrammeSession) => {
    if (!programmeId) return;
    setStartingId(ps.id);
    try {
      const session = await ProgrammeService.startSession(programmeId, ps.id);
      sessionStore.clearSession();
      useSessionStore.setState({
        currentSession: session,
        activeExerciseIndex: 0,
        programmeContext: { programmeId, programmeSessionId: ps.id },
      });
      router.push('/(main)/sessions/active');
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de demarrer la seance.');
    } finally {
      setStartingId(null);
    }
  };

  const handleResumeSession = async (ps: ProgrammeSession) => {
    try {
      await sessionStore.loadCurrentSession();
      router.push('/(main)/sessions/active');
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de reprendre la seance.');
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Completed': return { icon: 'checkmark-circle' as const, color: Colors.success, bg: Colors.successLight, label: 'Terminee' };
      case 'Missed': return { icon: 'close-circle' as const, color: Colors.error, bg: Colors.errorLight, label: 'Manquee' };
      case 'InProgress': return { icon: 'play-circle' as const, color: Colors.info, bg: Colors.infoLight, label: 'En cours' };
      case 'Skipped': return { icon: 'remove-circle' as const, color: Colors.lightGray, bg: Colors.background, label: 'Passee' };
      default: return { icon: 'ellipse-outline' as const, color: Colors.gray, bg: Colors.background, label: 'Planifiee' };
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

  const completedCount = sessions.filter((s) => s.status === 'Completed').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Semaine {week}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.webWrapper}>
          {/* Week summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              {completedCount}/{sessions.length} seances completees
            </Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${sessions.length > 0 ? (completedCount / sessions.length) * 100 : 0}%` },
                ]}
              />
            </View>
          </View>

          {/* Sessions */}
          {sessions.map((ps) => {
            const statusCfg = getStatusConfig(ps.status);
            let exercises: any[] = [];
            try { exercises = JSON.parse(ps.exercisesJson || '[]'); } catch {}

            const canStart = ps.status === 'Planned';
            const canResume = ps.status === 'InProgress';

            return (
              <View key={ps.id} style={styles.sessionCard}>
                {/* Status badge */}
                <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                  <Ionicons name={statusCfg.icon} size={16} color={statusCfg.color} />
                  <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                </View>

                {/* Title + day */}
                <Text style={styles.sessionDay}>{DAY_NAMES[ps.dayOfWeek] || `Jour ${ps.dayOfWeek + 1}`}</Text>
                <Text style={styles.sessionTitle}>{ps.title}</Text>

                {/* Muscle groups */}
                {ps.muscleGroups && ps.muscleGroups.length > 0 && (
                  <View style={styles.badgesRow}>
                    {ps.muscleGroups.map((mg) => (
                      <View key={mg} style={styles.badge}>
                        <Text style={styles.badgeText}>{mg}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Exercise list */}
                <View style={styles.exercisesList}>
                  {exercises.map((ex: any, idx: number) => (
                    <View key={idx} style={styles.exerciseRow}>
                      <Text style={styles.exerciseIndex}>{idx + 1}</Text>
                      <View style={styles.exerciseInfo}>
                        <Text style={styles.exerciseName} numberOfLines={1}>{ex.name || ex.Name}</Text>
                        <Text style={styles.exerciseSetsReps}>
                          {ex.sets || ex.Sets}x{ex.reps || ex.Reps}
                          {(ex.weightKg || ex.WeightKg) ? ` · ${ex.weightKg || ex.WeightKg}kg` : ''}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Meta */}
                <Text style={styles.sessionMeta}>
                  {exercises.length} exercices · {ps.estimatedDuration} min
                </Text>

                {/* Action button */}
                {canStart && (
                  <TouchableOpacity
                    style={styles.startBtn}
                    activeOpacity={0.85}
                    onPress={() => handleStartSession(ps)}
                    disabled={startingId === ps.id}
                  >
                    {startingId === ps.id ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <Ionicons name="play" size={18} color={Colors.white} />
                        <Text style={styles.startBtnText}>COMMENCER</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                {canResume && (
                  <TouchableOpacity
                    style={[styles.startBtn, { backgroundColor: Colors.info }]}
                    activeOpacity={0.85}
                    onPress={() => handleResumeSession(ps)}
                  >
                    <Ionicons name="play-forward" size={18} color={Colors.white} />
                    <Text style={styles.startBtnText}>REPRENDRE</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {sessions.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={Colors.lightGray} />
              <Text style={styles.emptyText}>Aucune seance cette semaine</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 12,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  headerTitle: { ...Typography.h4, color: Colors.dark, flex: 1, textAlign: 'center' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  webWrapper: { width: '100%', maxWidth: 500, alignSelf: 'center' as const },

  // Summary
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryText: { ...Typography.body, color: Colors.gray, marginBottom: 8 },
  progressBarBg: { height: 6, backgroundColor: Colors.background, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },

  // Session card
  sessionCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  statusText: { fontSize: Fonts.size.xs, fontWeight: Fonts.weight.semiBold },

  sessionDay: { ...Typography.caption, color: Colors.gray, textTransform: 'uppercase', letterSpacing: 1 },
  sessionTitle: { ...Typography.h4, color: Colors.dark, marginTop: 2, marginBottom: 10 },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  badge: { backgroundColor: Colors.primaryDim, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  badgeText: { fontSize: Fonts.size.xs, fontWeight: Fonts.weight.semiBold, color: Colors.primary },

  exercisesList: { marginBottom: 10 },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  exerciseIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.background,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.bold,
    color: Colors.gray,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { ...Typography.body, fontWeight: Fonts.weight.medium, color: Colors.dark },
  exerciseSetsReps: { ...Typography.caption, color: Colors.gray },

  sessionMeta: { ...Typography.caption, color: Colors.lightGray, marginBottom: 12 },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  startBtnText: { ...Typography.button, color: Colors.white, letterSpacing: 0.5 },

  emptyState: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyText: { ...Typography.body, color: Colors.gray },
});
