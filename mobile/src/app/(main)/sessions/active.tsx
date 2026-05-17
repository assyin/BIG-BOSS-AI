import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { useSessionStore } from '@/store/session.store';
import OfflineSyncIndicator from '@/components/ui/OfflineSyncIndicator';

const REST_OPTIONS = [60, 90, 120];

interface SetInput {
  weight: string;
  reps: string;
  completed: boolean;
}

export default function ActiveWorkoutScreen() {
  const {
    currentSession,
    activeExerciseIndex,
    nextExercise,
    logSet,
    skipExercise,
    completeSession,
    abandonSession,
    restTimerSeconds,
    isRestTimerActive,
    startRestTimer,
    stopRestTimer,
    refreshPendingCount,
    syncPendingOps,
  } = useSessionStore();

  // Sprint 3.2 — sync les ops offline au focus de l'écran
  useFocusEffect(
    useCallback(() => {
      refreshPendingCount().catch(() => {});
      syncPendingOps().catch(() => {});
    }, [])
  );

  const [setInputs, setSetInputs] = useState<SetInput[]>([]);
  const [selectedRestDuration, setSelectedRestDuration] = useState(90);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const exercises = currentSession?.exercises || [];
  const currentExercise = exercises[activeExerciseIndex];
  const totalExercises = exercises.length;
  const isLastExercise = activeExerciseIndex >= totalExercises - 1;

  // Initialize set inputs when exercise changes
  useEffect(() => {
    if (currentExercise) {
      const existingSets = currentExercise.completedSets ?? [];
      const inputs: SetInput[] = [];
      for (let i = 0; i < currentExercise.setsPlanned; i++) {
        const existing = existingSets.find((s) => s.setNumber === i + 1);
        inputs.push({
          weight: existing
            ? String(existing.weightKg)
            : currentExercise.weightPlannedKg != null
            ? String(currentExercise.weightPlannedKg)
            : '',
          reps: existing
            ? String(existing.reps)
            : String(currentExercise.repsPlanned),
          completed: !!existing,
        });
      }
      setSetInputs(inputs);
    }
  }, [activeExerciseIndex, currentExercise?.id]);

  // Rest timer countdown
  useEffect(() => {
    if (isRestTimerActive && restTimerSeconds > 0) {
      timerRef.current = setInterval(() => {
        const currentSeconds = useSessionStore.getState().restTimerSeconds;
        if (currentSeconds <= 1) {
          stopRestTimer();
        } else {
          useSessionStore.setState({ restTimerSeconds: currentSeconds - 1 });
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRestTimerActive]);

  const handleValidateSet = useCallback(
    async (setIndex: number) => {
      if (!currentExercise) return;

      const input = setInputs[setIndex];
      const weight = parseFloat(input.weight) || 0;
      const reps = parseInt(input.reps, 10) || 0;

      if (reps === 0) {
        Alert.alert('Erreur', 'Indique le nombre de reps');
        return;
      }

      try {
        await logSet({
          sessionExerciseId: currentExercise.id,
          reps,
          weightKg: weight,
          restSeconds: selectedRestDuration,
        });

        // Mark set as completed locally
        setSetInputs((prev) => {
          const updated = [...prev];
          updated[setIndex] = { ...updated[setIndex], completed: true };
          return updated;
        });

        // Start rest timer
        startRestTimer(selectedRestDuration);
      } catch {
        Alert.alert('Erreur', 'Impossible de sauvegarder le set');
      }
    },
    [currentExercise, setInputs, selectedRestDuration, logSet, startRestTimer]
  );

  const updateSetInput = (index: number, field: 'weight' | 'reps', value: string) => {
    setSetInputs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n${message}`)) onConfirm();
    } else {
      Alert.alert(title, message, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'OK', onPress: onConfirm },
      ]);
    }
  };

  const handleSkip = () => {
    if (!currentExercise) return;
    confirmAction('Passer cet exercice ?', 'Tu pourras y revenir plus tard.', async () => {
      try {
        await skipExercise(currentExercise.id, 'Skipped by user');
      } catch {
        Alert.alert('Erreur', 'Impossible de passer cet exercice');
      }
    });
  };

  const handleNext = () => {
    stopRestTimer();
    nextExercise();
  };

  const handleFinish = () => {
    confirmAction('Terminer la seance ?', 'Ta seance sera sauvegardee.', async () => {
      try {
        const summary = await completeSession();
        router.replace({
          pathname: '/sessions/summary',
          params: { data: JSON.stringify(summary) },
        });
      } catch (err) {
        console.error('Complete error:', err);
        Alert.alert('Erreur', 'Impossible de terminer la seance');
      }
    });
  };

  const handleAbandon = () => {
    confirmAction('Abandonner la seance ?', 'Ta progression sera perdue.', async () => {
      try {
        await abandonSession();
        router.replace('/sessions');
      } catch {
        Alert.alert('Erreur', 'Impossible d\'abandonner la seance');
      }
    });
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!currentSession || !currentExercise) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucune seance active</Text>
          <TouchableOpacity onPress={() => router.replace('/sessions')}>
            <Text style={styles.linkText}>Retour aux seances</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const completedSetsCount = setInputs.filter((s) => s.completed).length;
  const progressPercent = ((activeExerciseIndex + 1) / totalExercises) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleAbandon} activeOpacity={0.7}>
          <Ionicons name="close" size={28} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.progressLabel}>
          Exercice {activeExerciseIndex + 1} / {totalExercises}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      {/* Sprint 3.2 — Offline sync badge */}
      <OfflineSyncIndicator />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Exercise Header */}
        <View style={styles.exerciseHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.exerciseName}>{currentExercise.exerciseName}</Text>
            <Text style={styles.exercisePlan}>
              {currentExercise.setsPlanned} sets x {currentExercise.repsPlanned} reps
              {currentExercise.weightPlannedKg != null &&
                ` · ${currentExercise.weightPlannedKg} kg`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.coachVisionBtn}
            onPress={() => router.push({ pathname: '/(main)/sessions/coach-vision', params: { exerciseName: currentExercise.exerciseName } } as any)}
          >
            <Ionicons name="body-outline" size={18} color={Colors.primary} />
            <Text style={styles.coachVisionText}>Vision</Text>
          </TouchableOpacity>
        </View>

        {/* Video Player */}
        {(currentExercise as any).videoDemoUrl ? (
          Platform.OS === 'web' ? (
            <View style={styles.videoPlaceholder}>
              <video
                key={currentExercise.exerciseId + '-' + activeExerciseIndex}
                src={(currentExercise as any).videoDemoUrl}
                controls
                playsInline
                poster={currentExercise.thumbnailUrl || undefined}
                style={{ width: '100%', maxHeight: 300, borderRadius: 16, backgroundColor: '#000' } as any}
              />
            </View>
          ) : (
            <View style={styles.videoPlaceholder}>
              <Video
                key={currentExercise.exerciseId + '-' + activeExerciseIndex}
                source={{ uri: (currentExercise as any).videoDemoUrl }}
                style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 16 }}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
              />
            </View>
          )
        ) : (
          <View style={styles.videoPlaceholder}>
            <View style={styles.playIconBox}>
              <Ionicons name="play" size={32} color={Colors.white} />
            </View>
            <Text style={styles.videoText}>Demo video</Text>
          </View>
        )}

        {/* Rest Timer */}
        {isRestTimerActive && (
          <View style={styles.restTimerCard}>
            <Ionicons name="timer-outline" size={24} color={Colors.primary} />
            <Text style={styles.restTimerTime}>{formatTimer(restTimerSeconds)}</Text>
            <Text style={styles.restTimerLabel}>Repos</Text>
            <TouchableOpacity
              style={styles.restTimerSkip}
              onPress={stopRestTimer}
              activeOpacity={0.7}
            >
              <Text style={styles.restTimerSkipText}>Passer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Rest Duration Selector */}
        {!isRestTimerActive && (
          <View style={styles.restSelectRow}>
            <Text style={styles.restSelectLabel}>Repos:</Text>
            {REST_OPTIONS.map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[
                  styles.restChip,
                  selectedRestDuration === sec && styles.restChipSelected,
                ]}
                onPress={() => setSelectedRestDuration(sec)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.restChipText,
                    selectedRestDuration === sec && styles.restChipTextSelected,
                  ]}
                >
                  {sec}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Set Logging */}
        <View style={styles.setsSection}>
          <View style={styles.setsHeader}>
            <Text style={[styles.setHeaderCol, { flex: 0.5 }]}>Set</Text>
            <Text style={[styles.setHeaderCol, { flex: 1 }]}>Poids (kg)</Text>
            <Text style={[styles.setHeaderCol, { flex: 1 }]}>Reps</Text>
            <Text style={[styles.setHeaderCol, { flex: 0.5 }]} />
          </View>

          {setInputs.map((input, index) => (
            <View
              key={index}
              style={[styles.setRow, input.completed && styles.setRowCompleted]}
            >
              <View style={[styles.setCol, { flex: 0.5 }]}>
                <View
                  style={[
                    styles.setNumberBadge,
                    input.completed && styles.setNumberBadgeCompleted,
                  ]}
                >
                  <Text
                    style={[
                      styles.setNumberText,
                      input.completed && styles.setNumberTextCompleted,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
              </View>
              <View style={[styles.setCol, { flex: 1 }]}>
                <TextInput
                  style={[styles.setInput, input.completed && styles.setInputCompleted]}
                  value={input.weight}
                  onChangeText={(v) => updateSetInput(index, 'weight', v)}
                  keyboardType="decimal-pad"
                  editable={!input.completed}
                  placeholder="0"
                  placeholderTextColor={Colors.lightGray}
                />
              </View>
              <View style={[styles.setCol, { flex: 1 }]}>
                <TextInput
                  style={[styles.setInput, input.completed && styles.setInputCompleted]}
                  value={input.reps}
                  onChangeText={(v) => updateSetInput(index, 'reps', v)}
                  keyboardType="number-pad"
                  editable={!input.completed}
                  placeholder="0"
                  placeholderTextColor={Colors.lightGray}
                />
              </View>
              <View style={[styles.setCol, { flex: 0.5, alignItems: 'center' }]}>
                {input.completed ? (
                  <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
                ) : (
                  <TouchableOpacity
                    style={styles.validateButton}
                    onPress={() => handleValidateSet(index)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark" size={20} color={Colors.white} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        {isLastExercise && completedSetsCount >= currentExercise.setsPlanned ? (
          <TouchableOpacity
            style={styles.finishButton}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Ionicons name="trophy-outline" size={22} color={Colors.white} />
            <Text style={styles.finishButtonText}>Terminer la seance</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.bottomRow}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Ionicons name="play-skip-forward-outline" size={18} color={Colors.gray} />
              <Text style={styles.skipButtonText}>Passer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.nextButton,
                isLastExercise && styles.nextButtonDisabled,
              ]}
              onPress={isLastExercise ? handleFinish : handleNext}
              activeOpacity={0.85}
              disabled={false}
            >
              <Text style={styles.nextButtonText}>
                {isLastExercise ? 'Terminer' : 'Suivant'}
              </Text>
              <Ionicons
                name={isLastExercise ? 'trophy-outline' : 'arrow-forward'}
                size={18}
                color={Colors.white}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 12,
    paddingBottom: 8,
  },
  progressLabel: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  coachVisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryDim,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  coachVisionText: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.bold,
    color: Colors.primary,
  },
  exerciseName: {
    ...Typography.h3,
    color: Colors.dark,
  },
  exercisePlan: {
    ...Typography.body,
    color: Colors.gray,
    marginTop: 4,
  },
  videoPlaceholder: {
    minHeight: 180,
    backgroundColor: Colors.darkGray,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
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
  videoText: {
    ...Typography.caption,
    color: Colors.lightGray,
  },
  restTimerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryDim,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  restTimerTime: {
    fontSize: Fonts.size['2xl'],
    fontWeight: Fonts.weight.bold,
    color: Colors.primary,
  },
  restTimerLabel: {
    ...Typography.body,
    color: Colors.primary,
    flex: 1,
  },
  restTimerSkip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  restTimerSkipText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.primary,
  },
  restSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  restSelectLabel: {
    ...Typography.caption,
    color: Colors.gray,
    fontWeight: Fonts.weight.semiBold,
  },
  restChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  restChipSelected: {
    backgroundColor: Colors.primary,
  },
  restChipText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  restChipTextSelected: {
    color: Colors.white,
  },
  setsSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 8,
  },
  setHeaderCol: {
    ...Typography.caption,
    color: Colors.gray,
    fontWeight: Fonts.weight.semiBold,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  setRowCompleted: {
    backgroundColor: Colors.successLight,
    borderRadius: 10,
    borderBottomWidth: 0,
    marginBottom: 4,
  },
  setCol: {
    paddingHorizontal: 4,
  },
  setNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  setNumberBadgeCompleted: {
    backgroundColor: Colors.success,
  },
  setNumberText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.bold,
    color: Colors.primary,
  },
  setNumberTextCompleted: {
    color: Colors.white,
  },
  setInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    textAlign: 'center',
  },
  setInputCompleted: {
    backgroundColor: 'transparent',
    color: Colors.success,
  },
  validateButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    gap: 6,
  },
  skipButtonText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.gray,
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: Colors.primary,
  },
  nextButtonText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.white,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.success,
    gap: 8,
  },
  finishButtonText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.bold,
    color: Colors.white,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.gray,
  },
  linkText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: Fonts.weight.semiBold,
  },
});
