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
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import ProgrammeService, {
  Programme,
  ProgrammeSession,
  ProgrammeProgress,
} from '@/services/programme.service';
import { ZelligePattern } from '@/components/brand/ZelligePattern';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ProgrammeDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [programme, setProgramme] = useState<Programme | null>(null);
  const [progress, setProgress] = useState<ProgrammeProgress | null>(null);
  const [sessionsByWeek, setSessionsByWeek] = useState<Record<number, ProgrammeSession[]>>({});
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const prog = id
        ? await ProgrammeService.getProgramme(id)
        : await ProgrammeService.getActiveProgramme();
      if (!prog) {
        setProgramme(null);
        return;
      }
      setProgramme(prog);

      const [prog_progress] = await Promise.all([
        ProgrammeService.getProgress(prog.id),
      ]);
      setProgress(prog_progress);

      // Load sessions for all weeks
      const weekMap: Record<number, ProgrammeSession[]> = {};
      const weekPromises = [];
      for (let w = 1; w <= prog.durationWeeks; w++) {
        weekPromises.push(
          ProgrammeService.getWeekSessions(prog.id, w).then((sessions) => {
            weekMap[w] = sessions;
          }),
        );
      }
      await Promise.all(weekPromises);
      setSessionsByWeek(weekMap);

      // Auto-expand current week
      setExpandedWeeks(new Set([prog.currentWeek]));
    } catch (err) {
      console.error('Failed to load programme detail:', err);
    }
  }, [id]);

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

  const toggleWeek = (week: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  };

  const handlePause = async () => {
    if (!programme) return;
    const doIt = async () => {
      await ProgrammeService.pauseProgramme(programme.id);
      await loadData();
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Mettre le programme en pause ?')) await doIt();
    } else {
      Alert.alert('Pause', 'Mettre le programme en pause ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Oui', onPress: doIt },
      ]);
    }
  };

  const handleAbandon = async () => {
    if (!programme) return;
    const doIt = async () => {
      await ProgrammeService.abandonProgramme(programme.id);
      router.replace('/');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Abandonner le programme ? Cette action est irreversible.')) await doIt();
    } else {
      Alert.alert('Abandonner', 'Abandonner le programme ? Cette action est irreversible.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Abandonner', style: 'destructive', onPress: doIt },
      ]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return { name: 'checkmark-circle' as const, color: Colors.success };
      case 'Missed': return { name: 'close-circle' as const, color: Colors.error };
      case 'InProgress': return { name: 'play-circle' as const, color: Colors.info };
      case 'Skipped': return { name: 'remove-circle' as const, color: Colors.lightGray };
      default: return { name: 'ellipse-outline' as const, color: Colors.border };
    }
  };

  const getWeekStatus = (week: number): { completed: number; total: number } => {
    const sessions = sessionsByWeek[week] || [];
    return {
      completed: sessions.filter((s) => s.status === 'Completed').length,
      total: sessions.length,
    };
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!programme) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="barbell-outline" size={56} color={Colors.lightGray} />
          <Text style={styles.emptyText}>Aucun programme trouve</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header gradient médina */}
      <LinearGradient
        colors={Colors.gradientHero as unknown as readonly [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <ZelligePattern width={420} height={120} color={Colors.white} opacity={0.07} tileSize={50} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Mon Programme</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.webWrapper}>
          {/* Programme info card */}
          <View style={styles.infoCard}>
            <Text style={styles.programmeTitle}>{programme.title}</Text>
            <Text style={styles.programmeSplit}>{programme.split}</Text>

            {progress && (
              <>
                <View style={styles.statsRow}>
                  <StatBox label="Semaine" value={`${progress.currentWeek}/${progress.durationWeeks}`} />
                  <StatBox label="Seances" value={`${progress.completedSessions}/${progress.totalSessions}`} />
                  <StatBox label="Adherence" value={`${Math.round(progress.adherencePercent)}%`} />
                </View>

                <View style={styles.progressBarBg}>
                  <LinearGradient
                    colors={Colors.gradientPrimary as unknown as readonly [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBarFill, { width: `${Math.min(progress.progressPercent, 100)}%` }]}
                  />
                </View>
                <Text style={styles.progressText}>{Math.round(progress.progressPercent)}% complete</Text>
              </>
            )}
          </View>

          {/* Actions */}
          {programme.status === 'Active' && (
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handlePause}>
                <Ionicons name="pause-circle-outline" size={20} color={Colors.warning} />
                <Text style={[styles.actionBtnText, { color: Colors.warning }]}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleAbandon}>
                <Ionicons name="stop-circle-outline" size={20} color={Colors.error} />
                <Text style={[styles.actionBtnText, { color: Colors.error }]}>Abandonner</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Weeks */}
          <Text style={styles.sectionTitle}>Toutes les semaines</Text>

          {Array.from({ length: programme.durationWeeks }, (_, i) => i + 1).map((week) => {
            const expanded = expandedWeeks.has(week);
            const sessions = sessionsByWeek[week] || [];
            const weekStatus = getWeekStatus(week);
            const isCurrent = week === programme.currentWeek;

            return (
              <View key={week} style={[styles.weekCard, isCurrent && styles.weekCardCurrent]}>
                <TouchableOpacity style={styles.weekHeader} onPress={() => toggleWeek(week)} activeOpacity={0.7}>
                  <View style={styles.weekHeaderLeft}>
                    <Text style={[styles.weekTitle, isCurrent && styles.weekTitleCurrent]}>
                      Semaine {week}
                    </Text>
                    {isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>En cours</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.weekHeaderRight}>
                    <Text style={styles.weekCount}>
                      {weekStatus.completed}/{weekStatus.total}
                    </Text>
                    <Ionicons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={Colors.gray}
                    />
                  </View>
                </TouchableOpacity>

                {expanded && (
                  <View style={styles.weekSessions}>
                    {sessions.length === 0 ? (
                      <Text style={styles.noSessionsText}>Aucune seance</Text>
                    ) : (
                      sessions.map((ps) => {
                        const statusIcon = getStatusIcon(ps.status);
                        let exerciseCount = 0;
                        try { exerciseCount = JSON.parse(ps.exercisesJson || '[]').length; } catch {}

                        return (
                          <TouchableOpacity
                            key={ps.id}
                            style={styles.sessionRow}
                            activeOpacity={0.7}
                            onPress={() =>
                              router.push({
                                pathname: '/(main)/programme/week',
                                params: { programmeId: programme.id, weekNumber: String(week) },
                              })
                            }
                          >
                            <Ionicons name={statusIcon.name} size={22} color={statusIcon.color} />
                            <View style={styles.sessionInfo}>
                              <Text style={styles.sessionTitle} numberOfLines={1}>{ps.title}</Text>
                              <Text style={styles.sessionMeta}>
                                {exerciseCount} exercices · {ps.estimatedDuration} min
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={Colors.lightGray} />
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// StatBox
// ---------------------------------------------------------------------------
function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { ...Typography.body, color: Colors.gray },
  linkText: { ...Typography.body, color: Colors.primary, fontWeight: Fonts.weight.semiBold },

  headerGradient: {
    paddingTop: Platform.OS === 'android' ? 48 : 12,
    paddingBottom: 16,
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  webWrapper: { width: '100%', maxWidth: 500, alignSelf: 'center' as const },

  // Info card — top accent gold safran
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
    borderTopWidth: 3,
    borderTopColor: Colors.gold,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  programmeTitle: { ...Typography.h2, color: Colors.dark, marginBottom: 4 },
  programmeSplit: { ...Typography.body, color: Colors.gray, marginBottom: 16 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  statBox: { alignItems: 'center' },
  statValue: {
    fontFamily: Fonts.family.displayBold,
    fontSize: Fonts.size.lg,
    color: Colors.goldDark,
  },
  statLabel: { ...Typography.caption, color: Colors.gray, marginTop: 2 },

  progressBarBg: {
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  progressText: { ...Typography.caption, color: Colors.gray, textAlign: 'right', marginTop: 4 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionBtnText: { ...Typography.body, fontWeight: Fonts.weight.semiBold },

  sectionTitle: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.sm,
    color: Colors.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 4,
    marginLeft: 4,
  },

  // Week card
  weekCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  weekCardCurrent: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    backgroundColor: Colors.goldDim,
    shadowColor: Colors.gold,
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  weekHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekTitle: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.md,
    color: Colors.dark,
  },
  weekTitleCurrent: { color: Colors.goldDark },
  currentBadge: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  currentBadgeText: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.xs,
    color: Colors.white,
    letterSpacing: 0.4,
  },
  weekCount: { ...Typography.caption, color: Colors.gray },

  weekSessions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  noSessionsText: { ...Typography.caption, color: Colors.lightGray, paddingVertical: 8, textAlign: 'center' },

  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  sessionInfo: { flex: 1 },
  sessionTitle: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.base,
    color: Colors.dark,
  },
  sessionMeta: { ...Typography.caption, color: Colors.gray, marginTop: 2 },
});
