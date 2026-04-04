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
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { useAuthStore } from '@/store/auth.store';
import { useSessionStore } from '@/store/session.store';
import { useGamificationStore } from '@/store/gamification.store';
import ProgrammeService, {
  Programme,
  ProgrammeSession,
  ProgrammeProgress,
} from '@/services/programme.service';

// ---------------------------------------------------------------------------
// Day labels (Monday-first)
// ---------------------------------------------------------------------------
const DAY_LABELS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

/** JS Date.getDay() is 0=Sun..6=Sat. Convert to 0=Mon..6=Sun. */
function jsToMondayIndex(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function HomeScreen() {
  const { profile, user, loadProfile, loadStats } = useAuthStore();
  const sessionStore = useSessionStore();
  const { balance: gamifBalance, streak: gamifStreak, loadGamification } = useGamificationStore();

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Programme data
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [todaySession, setTodaySession] = useState<ProgrammeSession | null>(null);
  const [weekSessions, setWeekSessions] = useState<ProgrammeSession[]>([]);
  const [progress, setProgress] = useState<ProgrammeProgress | null>(null);
  const [generating, setGenerating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [resuming, setResuming] = useState(false);

  const firstName = (user?.name || profile?.name || 'Champion').split(' ')[0];

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------
  const loadProgrammeData = useCallback(async () => {
    try {
      const prog = await ProgrammeService.getActiveProgramme();
      setProgramme(prog);

      if (prog) {
        const [today, week, prog_progress] = await Promise.all([
          ProgrammeService.getTodaySession(prog.id),
          ProgrammeService.getWeekSessions(prog.id, prog.currentWeek),
          ProgrammeService.getProgress(prog.id),
        ]);
        setTodaySession(today);
        setWeekSessions(week);
        setProgress(prog_progress);
      } else {
        setTodaySession(null);
        setWeekSessions([]);
        setProgress(null);
      }
    } catch (err) {
      console.error('Failed to load programme data:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([loadProfile(), loadStats(), loadProgrammeData(), loadGamification()]);
  }, [loadProfile, loadStats, loadProgrammeData]);

  // Reload every time the screen receives focus
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadData().finally(() => {
        if (active) setInitialLoading(false);
      });
      return () => {
        active = false;
      };
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newProg = await ProgrammeService.generateProgramme();
      setProgramme(newProg);
      // Reload full data for the new programme
      if (newProg) {
        const [today, week, prog_progress] = await Promise.all([
          ProgrammeService.getTodaySession(newProg.id),
          ProgrammeService.getWeekSessions(newProg.id, newProg.currentWeek),
          ProgrammeService.getProgress(newProg.id),
        ]);
        setTodaySession(today);
        setWeekSessions(week);
        setProgress(prog_progress);
      }
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('Impossible de generer le programme. Reessaie plus tard.');
      } else {
        Alert.alert('Erreur', 'Impossible de generer le programme. Reessaie plus tard.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleStartSession = async () => {
    if (!programme || !todaySession) return;
    setStarting(true);
    try {
      const session = await ProgrammeService.startSession(programme.id, todaySession.id);
      // Put session in the session store so active screen picks it up
      sessionStore.clearSession();
      useSessionStore.setState({
        currentSession: session,
        activeExerciseIndex: 0,
        programmeContext: { programmeId: programme.id, programmeSessionId: todaySession.id },
      });
      router.push('/(main)/sessions/active');
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('Impossible de demarrer la seance.');
      } else {
        Alert.alert('Erreur', 'Impossible de demarrer la seance.');
      }
    } finally {
      setStarting(false);
    }
  };

  const handleResumeSession = async () => {
    if (!todaySession?.sessionId) return;
    setResuming(true);
    try {
      // Load the existing real session into the store
      await sessionStore.loadCurrentSession();
      router.push('/(main)/sessions/active');
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('Impossible de reprendre la seance.');
      } else {
        Alert.alert('Erreur', 'Impossible de reprendre la seance.');
      }
    } finally {
      setResuming(false);
    }
  };

  const handleResumeProgramme = async () => {
    if (!programme) return;
    try {
      await ProgrammeService.resumeProgramme(programme.id);
      await loadProgrammeData();
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('Impossible de reprendre le programme.');
      } else {
        Alert.alert('Erreur', 'Impossible de reprendre le programme.');
      }
    }
  };

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // -----------------------------------------------------------------------
  // Helpers for weekly calendar
  // -----------------------------------------------------------------------
  const todayMondayIndex = jsToMondayIndex(new Date().getDay());

  function getSessionForDay(dayIndex: number): ProgrammeSession | undefined {
    return weekSessions.find((s) => s.dayOfWeek === dayIndex);
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.webWrapper}>
          {/* ==================== HEADER ==================== */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>Salut {firstName} !</Text>
              {programme && programme.status === 'Active' && (
                <Text style={styles.subGreeting}>
                  Semaine {progress?.currentWeek ?? programme.currentWeek}/
                  {progress?.durationWeeks ?? programme.durationWeeks} -{' '}
                  {programme.title}
                </Text>
              )}
              {!programme && <Text style={styles.subGreeting}>Pret a commencer ?</Text>}
            </View>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={() => router.push('/(main)/profile')}
            >
              <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {/* ==================== GAMIFICATION WIDGETS ==================== */}
          {gamifBalance && (
            <TouchableOpacity
              style={styles.gamifRow}
              activeOpacity={0.7}
              onPress={() => router.push('/(main)/points/history' as any)}
            >
              <View style={styles.gamifCard}>
                <Ionicons name="star" size={20} color={Colors.warning} />
                <Text style={styles.gamifValue}>{gamifBalance.balance}</Text>
                <Text style={styles.gamifLabel}>Points</Text>
              </View>
              <View style={styles.gamifCard}>
                <Ionicons name="flame" size={20} color={Colors.error} />
                <Text style={styles.gamifValue}>{gamifStreak?.currentStreak || 0}</Text>
                <Text style={styles.gamifLabel}>Streak</Text>
              </View>
              <View style={styles.gamifCard}>
                <Ionicons name="trophy" size={20} color={Colors.primary} />
                <Text style={styles.gamifValue}>{gamifBalance.totalEarned}</Text>
                <Text style={styles.gamifLabel}>Total</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ==================== PAUSED BANNER ==================== */}
          {programme && programme.status === 'Paused' && (
            <View style={styles.pausedBanner}>
              <View style={styles.pausedBannerLeft}>
                <Ionicons name="pause-circle" size={24} color={Colors.warning} />
                <Text style={styles.pausedBannerText}>Programme en pause</Text>
              </View>
              <TouchableOpacity style={styles.resumeBtn} onPress={handleResumeProgramme}>
                <Text style={styles.resumeBtnText}>Reprendre</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ==================== NO PROGRAMME ==================== */}
          {!programme && (
            <View style={styles.noProgrammeCard}>
              <Ionicons name="barbell-outline" size={56} color={Colors.primaryLight} />
              <Text style={styles.noProgrammeTitle}>Tu n'as pas encore de programme</Text>
              <Text style={styles.noProgrammeDesc}>
                Laisse l'IA creer un programme d'entrainement et nutrition adapte a tes objectifs, ton
                niveau et tes disponibilites.
              </Text>
              <TouchableOpacity
                style={styles.generateBtn}
                activeOpacity={0.85}
                onPress={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color={Colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.generateBtnText}>Generer mon programme personnalise</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ==================== ACTIVE PROGRAMME ==================== */}
          {programme && programme.status === 'Active' && (
            <>
              {/* ---------- Seance du jour ---------- */}
              {todaySession ? (
                <View style={styles.todayCard}>
                  <Text style={styles.todayLabel}>SEANCE DU JOUR</Text>
                  <Text style={styles.todayTitle}>{todaySession.title}</Text>

                  {/* Muscle group badges */}
                  {todaySession.muscleGroups && todaySession.muscleGroups.length > 0 && (
                    <View style={styles.badgesRow}>
                      {todaySession.muscleGroups.map((mg) => (
                        <View key={mg} style={styles.badge}>
                          <Text style={styles.badgeText}>{mg}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Meta */}
                  <Text style={styles.todayMeta}>
                    {(() => {
                      try {
                        const exs = JSON.parse(todaySession.exercisesJson || '[]');
                        return `${exs.length} exercices`;
                      } catch {
                        return '';
                      }
                    })()}
                    {todaySession.estimatedDuration ? ` · ${todaySession.estimatedDuration} min` : ''}
                  </Text>

                  {/* Action button */}
                  {todaySession.status === 'InProgress' ? (
                    <TouchableOpacity
                      style={styles.resumeSessionBtn}
                      activeOpacity={0.85}
                      onPress={handleResumeSession}
                      disabled={resuming}
                    >
                      {resuming ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <>
                          <Ionicons name="play-forward" size={22} color={Colors.white} />
                          <Text style={styles.startBtnText}>REPRENDRE LA SEANCE</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.startBtn}
                      activeOpacity={0.85}
                      onPress={handleStartSession}
                      disabled={starting}
                    >
                      {starting ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <>
                          <Ionicons name="play" size={22} color={Colors.white} />
                          <Text style={styles.startBtnText}>COMMENCER LA SEANCE</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                /* ---------- Rest day ---------- */
                <View style={styles.restDayCard}>
                  <Text style={styles.restDayEmoji}>🧘</Text>
                  <Text style={styles.restDayTitle}>Jour de repos</Text>
                  <Text style={styles.restDayDesc}>Profite de ta recuperation !</Text>
                </View>
              )}

              {/* ---------- Weekly calendar ---------- */}
              <View style={styles.weekSection}>
                <Text style={styles.sectionTitle}>Cette semaine</Text>
                <View style={styles.weekRow}>
                  {DAY_LABELS.map((label, idx) => {
                    const ps = getSessionForDay(idx);
                    const isToday = idx === todayMondayIndex;

                    let circleStyle: object = styles.dayCircleRest;
                    let iconNode: React.ReactNode = (
                      <Text style={styles.dayDot}>·</Text>
                    );

                    if (ps) {
                      if (ps.status === 'Completed') {
                        circleStyle = styles.dayCircleCompleted;
                        iconNode = <Ionicons name="checkmark" size={14} color={Colors.white} />;
                      } else if (ps.status === 'Missed') {
                        circleStyle = styles.dayCircleMissed;
                        iconNode = <Ionicons name="close" size={14} color={Colors.white} />;
                      } else if (isToday) {
                        circleStyle = styles.dayCircleToday;
                        iconNode = <Ionicons name="barbell-outline" size={14} color={Colors.white} />;
                      } else {
                        circleStyle = styles.dayCirclePlanned;
                        iconNode = <Ionicons name="barbell-outline" size={14} color={Colors.gray} />;
                      }
                    }

                    return (
                      <View key={idx} style={styles.dayColumn}>
                        <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                          {label}
                        </Text>
                        <View style={[styles.dayCircle, circleStyle, isToday && styles.dayCircleTodayBorder]}>
                          {iconNode}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* ---------- Progress bar ---------- */}
              {progress && (
                <TouchableOpacity
                  style={styles.progressSection}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/(main)/programme',
                      params: { id: programme.id },
                    })
                  }
                >
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>
                      {progress.completedSessions}/{progress.totalSessions} seances completees
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={styles.progressPercent}>
                        {Math.round(progress.progressPercent)}%
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                    </View>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(progress.progressPercent, 100)}%` },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              )}

              {/* ---------- Separator ---------- */}
              <View style={styles.separatorRow}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>ou</Text>
                <View style={styles.separatorLine} />
              </View>

              {/* ---------- Seance libre ---------- */}
              <TouchableOpacity
                style={styles.freeSessionBtn}
                activeOpacity={0.85}
                onPress={() => router.push('/(main)/sessions/generate')}
              >
                <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                <Text style={styles.freeSessionBtnText}>Creer une seance libre</Text>
              </TouchableOpacity>

              {/* ---------- Nutrition ---------- */}
              {programme.dailyCalories > 0 && (
                <View style={styles.nutritionCard}>
                  <View style={styles.nutritionHeader}>
                    <Text style={styles.nutritionTitle}>Nutrition du jour</Text>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/(main)/programme/nutrition-plan',
                          params: { programmeId: programme.id },
                        })
                      }
                    >
                      <Text style={styles.nutritionSeeAll}>Plan semaine</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.nutritionKcal}>
                    Objectif : {programme.dailyCalories} kcal
                  </Text>

                  {/* Macro mini bars */}
                  <View style={styles.macrosRow}>
                    <MacroBar label="P" value={programme.dailyProtein} color={Colors.primary} unit="g" />
                    <MacroBar label="G" value={programme.dailyCarbs} color={Colors.warning} unit="g" />
                    <MacroBar label="L" value={programme.dailyFat} color={Colors.info} unit="g" />
                  </View>

                  {/* Today's meal suggestions */}
                  <TodayMeals mealPlanJson={programme.mealPlanJson} />

                  <TouchableOpacity
                    style={styles.nutritionLink}
                    onPress={() => router.push('/(main)/nutrition')}
                  >
                    <Text style={styles.nutritionLinkText}>Mon journal nutrition</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Mini macro bar component
// ---------------------------------------------------------------------------
function MacroBar({
  label,
  value,
  color,
  unit,
}: {
  label: string;
  value: number;
  color: string;
  unit: string;
}) {
  return (
    <View style={styles.macroItem}>
      <View style={[styles.macroIndicator, { backgroundColor: color }]} />
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>
        {Math.round(value)}
        {unit}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Today's meal suggestions from the plan
// ---------------------------------------------------------------------------
const MEAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  snack: 'cafe-outline',
};
const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Petit-dej',
  lunch: 'Dejeuner',
  dinner: 'Diner',
  snack: 'Collation',
};

function TodayMeals({ mealPlanJson }: { mealPlanJson: string | null }) {
  if (!mealPlanJson) return null;

  let mealPlan: any[] = [];
  try { mealPlan = JSON.parse(mealPlanJson); } catch { return null; }
  if (!Array.isArray(mealPlan) || mealPlan.length === 0) return null;

  // Get today's day (1=Monday...7=Sunday)
  const jsDay = new Date().getDay();
  const mondayDay = jsDay === 0 ? 7 : jsDay; // 1-7
  const todayPlan = mealPlan.find((d: any) => d.day === mondayDay) || mealPlan[0];
  if (!todayPlan) return null;

  const meals = ['breakfast', 'lunch', 'dinner', 'snack']
    .map((key) => ({ key, recipe: todayPlan[key] }))
    .filter((m) => m.recipe != null);

  if (meals.length === 0) return null;

  return (
    <View style={styles.todayMealsContainer}>
      <Text style={styles.todayMealsLabel}>Repas suggeres</Text>
      {meals.map((m) => (
        <View key={m.key} style={styles.mealRow}>
          <Ionicons
            name={MEAL_ICONS[m.key] || 'restaurant-outline'}
            size={18}
            color={Colors.primary}
            style={{ marginRight: 8 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.mealName} numberOfLines={1}>{m.recipe.title}</Text>
            <Text style={styles.mealMacros}>
              {m.recipe.calories} kcal · P:{m.recipe.protein}g · G:{m.recipe.carbs}g · L:{m.recipe.fat}g
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 40,
  },
  webWrapper: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center' as const,
  },

  // ---- Header ----
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    ...Typography.h3,
    color: Colors.dark,
  },
  subGreeting: {
    ...Typography.body,
    color: Colors.gray,
    marginTop: 4,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  avatarText: {
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    color: Colors.white,
  },

  // ---- Gamification widgets ----
  gamifRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  gamifCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  gamifValue: {
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  gamifLabel: {
    fontSize: Fonts.size.xs,
    color: Colors.gray,
  },

  // ---- Paused banner ----
  pausedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.warningLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  pausedBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pausedBannerText: {
    ...Typography.bodyLarge,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.warning,
  },
  resumeBtn: {
    backgroundColor: Colors.warning,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resumeBtnText: {
    ...Typography.button,
    color: Colors.white,
  },

  // ---- No programme ----
  noProgrammeCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  noProgrammeTitle: {
    ...Typography.h4,
    color: Colors.dark,
    marginTop: 16,
    textAlign: 'center',
  },
  noProgrammeDesc: {
    ...Typography.body,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 22,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  generateBtnText: {
    ...Typography.button,
    color: Colors.white,
  },

  // ---- Today session card ----
  todayCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  todayLabel: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.bold,
    color: Colors.primary,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  todayTitle: {
    ...Typography.h4,
    color: Colors.dark,
    marginBottom: 10,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  badge: {
    backgroundColor: Colors.primaryDim,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  badgeText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.primary,
  },
  todayMeta: {
    ...Typography.caption,
    color: Colors.gray,
    marginBottom: 16,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resumeSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.info,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    shadowColor: Colors.info,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startBtnText: {
    ...Typography.button,
    color: Colors.white,
    letterSpacing: 0.5,
  },

  // ---- Rest day card ----
  restDayCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 32,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  restDayEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  restDayTitle: {
    ...Typography.h4,
    color: Colors.dark,
    marginBottom: 4,
  },
  restDayDesc: {
    ...Typography.body,
    color: Colors.gray,
  },

  // ---- Weekly calendar ----
  weekSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.dark,
    marginBottom: 14,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dayLabel: {
    ...Typography.caption,
    color: Colors.gray,
    marginBottom: 8,
  },
  dayLabelToday: {
    color: Colors.primary,
    fontWeight: Fonts.weight.bold,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleRest: {
    backgroundColor: Colors.background,
  },
  dayCircleCompleted: {
    backgroundColor: Colors.success,
  },
  dayCircleMissed: {
    backgroundColor: Colors.error,
  },
  dayCircleToday: {
    backgroundColor: Colors.primary,
  },
  dayCirclePlanned: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dayCircleTodayBorder: {
    borderWidth: 2,
    borderColor: Colors.primaryDark,
  },
  dayDot: {
    fontSize: 20,
    color: Colors.lightGray,
    lineHeight: 22,
  },

  // ---- Progress ----
  progressSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    ...Typography.body,
    color: Colors.gray,
  },
  progressPercent: {
    ...Typography.body,
    fontWeight: Fonts.weight.bold,
    color: Colors.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },

  // ---- Separator ----
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  separatorText: {
    ...Typography.caption,
    color: Colors.lightGray,
    marginHorizontal: 12,
  },

  // ---- Free session ----
  freeSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 24,
  },
  freeSessionBtnText: {
    ...Typography.button,
    color: Colors.primary,
  },

  // ---- Nutrition ----
  nutritionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nutritionSeeAll: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: Fonts.weight.semiBold,
  },
  nutritionTitle: {
    ...Typography.h4,
    color: Colors.dark,
  },
  nutritionKcal: {
    ...Typography.bodyLarge,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    marginBottom: 12,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    ...Typography.caption,
    fontWeight: Fonts.weight.bold,
    color: Colors.gray,
  },
  macroValue: {
    ...Typography.caption,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  nutritionLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutritionLinkText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: Fonts.weight.semiBold,
  },

  // Today meals
  todayMealsContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    paddingTop: 12,
    marginBottom: 12,
  },
  todayMealsLabel: {
    ...Typography.caption,
    fontWeight: Fonts.weight.bold,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  mealName: {
    ...Typography.body,
    fontWeight: Fonts.weight.medium,
    color: Colors.dark,
  },
  mealMacros: {
    ...Typography.caption,
    color: Colors.gray,
  },
});
