import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import {
  EXERCISE_CONFIGS,
  calculateFormScore,
  KEYPOINTS,
  type Keypoint,
  type FeedbackItem,
  type ExerciseConfig,
} from '@/utils/pose-engine';
import { initTfjs, loadMoveNet, inferFromBase64 } from '@/utils/pose-detector';
import { PoseOverlay } from '@/components/coach/PoseOverlay';

const AUTO_STOP_REPS = 30; // auto-stop pour économie batterie
const AUTO_STOP_DURATION_MS = 5 * 60 * 1000; // 5 minutes max

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Exercise type mapping from exercise names to config keys
const EXERCISE_TYPE_MAP: Record<string, string> = {
  // Squat
  squat: 'squat', 'back squat': 'squat', 'front squat': 'squat', 'goblet squat': 'squat', 'bulgarian': 'squat',
  // Push-up
  'push-up': 'pushup', 'push up': 'pushup', pushup: 'pushup', pompe: 'pushup', pompes: 'pushup',
  // Curl
  curl: 'curl', 'bicep curl': 'curl', 'barbell curl': 'curl', 'dumbbell curl': 'curl', 'hammer curl': 'curl', 'concentration': 'curl',
  // Deadlift
  deadlift: 'deadlift', 'soulevé de terre': 'deadlift', 'romanian deadlift': 'deadlift',
  // Overhead press
  'overhead press': 'overhead_press', 'shoulder press': 'overhead_press', 'military press': 'overhead_press', 'développé épaules': 'overhead_press',
  // Bench press
  'bench press': 'bench_press', 'développé couché': 'bench_press', 'chest press': 'bench_press', 'incline press': 'bench_press', 'decline press': 'bench_press',
  // Rowing
  row: 'rowing', rowing: 'rowing', 'barbell row': 'rowing', 'dumbbell row': 'rowing', 'cable row': 'rowing', 'seated row': 'rowing',
  // Lunge
  lunge: 'lunge', fente: 'lunge', fentes: 'lunge', 'walking lunge': 'lunge', 'reverse lunge': 'lunge',
  // Dips
  dip: 'dips', dips: 'dips', 'tricep dip': 'dips', 'chest dip': 'dips',
  // Pull-up
  'pull-up': 'pullup', 'pull up': 'pullup', pullup: 'pullup', traction: 'pullup', tractions: 'pullup', 'chin-up': 'pullup', 'chin up': 'pullup',
  // Hip thrust
  'hip thrust': 'hip_thrust', 'glute bridge': 'hip_thrust',
  // Plank
  plank: 'plank', planche: 'plank', 'side plank': 'plank',
  // Crunch
  crunch: 'crunch', 'sit-up': 'crunch', 'sit up': 'crunch', abdominal: 'crunch', abdos: 'crunch',
  // Lateral raise
  'lateral raise': 'lateral_raise', 'élévation latérale': 'lateral_raise', 'side raise': 'lateral_raise',
  // Tricep extension
  'tricep extension': 'tricep_extension', 'triceps': 'tricep_extension', 'skull crusher': 'tricep_extension', pushdown: 'tricep_extension',
  // Calf raise
  'calf raise': 'calf_raise', mollet: 'calf_raise', mollets: 'calf_raise',
  // Front raise
  'front raise': 'front_raise', 'élévation frontale': 'front_raise',
  // Leg curl
  'leg curl': 'leg_curl', 'hamstring curl': 'leg_curl', ischio: 'leg_curl',
  // Leg press
  'leg press': 'leg_press', 'presse': 'leg_press',
  // Face pull
  'face pull': 'face_pull',
};

function getExerciseConfig(exerciseName: string): ExerciseConfig | null {
  const lower = exerciseName.toLowerCase();
  for (const [key, configKey] of Object.entries(EXERCISE_TYPE_MAP)) {
    if (lower.includes(key)) {
      return EXERCISE_CONFIGS[configKey] || null;
    }
  }
  return null;
}

export default function CoachVisionScreen() {
  const { exerciseName } = useLocalSearchParams<{ exerciseName?: string }>();
  const [permission, requestPermission] = useCameraPermissions();

  const [isActive, setIsActive] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [formScore, setFormScore] = useState(100);
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackItem[]>([]);
  const [selectedExercise, setSelectedExercise] = useState(exerciseName || '');
  const [exerciseConfig, setExerciseConfig] = useState<ExerciseConfig | null>(null);
  const [phase, setPhase] = useState('neutral');
  const [showExercisePicker, setShowExercisePicker] = useState(!exerciseName);

  // ─── Sprint 1.4 Jour 1+2+3: TF.js + MoveNet + SVG overlay ───
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // Jour 3: state pour overlay SVG + auto-stop
  const [lastKeypoints, setLastKeypoints] = useState<Keypoint[] | null>(null);
  const [sourceDims, setSourceDims] = useState<{ w: number; h: number }>({ w: 480, h: 640 });
  const startedAtRef = useRef<number>(0);
  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

  // Countdown 3-2-1-Go avant de démarrer la détection
  const [countdown, setCountdown] = useState<number | null>(null);

  // Load TF.js + MoveNet at mount (background, ~3-5s on first run)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initTfjs();
        await loadMoveNet('lightning');
        if (!cancelled) {
          setModelReady(true);
          console.log('[CoachVision] MoveNet ready');
        }
      } catch (err: any) {
        if (!cancelled) {
          setModelError(err?.message || 'Failed to load pose model');
          console.error('[CoachVision] load failed:', err);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sprint 1.4 Jour 2: boucle continue d'inférence + branchement pose-engine
  // Démarrée quand isActive + modelReady + exerciseConfig OK
  useEffect(() => {
    if (!isActive || !modelReady || !exerciseConfig || !cameraRef.current) return;

    let cancelled = false;
    let prevPhase = 'neutral';
    const scoresWindow: number[] = []; // moyenne mobile sur 10 frames
    let tickCount = 0;
    let totalLatency = 0;

    const tick = async () => {
      if (cancelled || !cameraRef.current) return;

      try {
        const t0 = Date.now();
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.35,
          skipProcessing: true,
        });
        if (!photo?.base64 || cancelled) return;

        // Track source dims for SVG overlay scaling
        if (photo.width && photo.height && (photo.width !== sourceDims.w || photo.height !== sourceDims.h)) {
          setSourceDims({ w: photo.width, h: photo.height });
        }

        const keypoints = await inferFromBase64(photo.base64);
        const latency = Date.now() - t0;
        if (cancelled) return;

        if (!keypoints) {
          setLastKeypoints(null);
          setCurrentFeedback([
            { type: 'warning', message: `Aucune pose (${latency}ms) — recule pour cadrer ton corps`, messageAr: 'رجع لور باش يبان الجسد كامل' },
          ]);
        } else {
          setLastKeypoints(keypoints);
          // Apply pose-engine
          const issues = exerciseConfig.checkPoints(keypoints);
          const repResult = exerciseConfig.detectRep(keypoints, prevPhase);
          prevPhase = repResult.phase;

          if (repResult.counted) {
            setRepCount((r) => r + 1);
          }
          setPhase(repResult.phase);

          // Score: 100 - (errors * 25) - (warnings * 10), moving avg sur 10
          const errCount = issues.filter((i) => i.type === 'error').length;
          const warnCount = issues.filter((i) => i.type === 'warning').length;
          const frameScore = Math.max(0, 100 - errCount * 25 - warnCount * 10);
          scoresWindow.push(frameScore);
          if (scoresWindow.length > 10) scoresWindow.shift();
          const avgScore = Math.round(scoresWindow.reduce((a, b) => a + b, 0) / scoresWindow.length);
          setFormScore(avgScore);

          // Feedback: si issues, montre les 2 plus urgentes (errors d'abord)
          if (issues.length > 0) {
            const sorted = [
              ...issues.filter((i) => i.type === 'error'),
              ...issues.filter((i) => i.type === 'warning'),
              ...issues.filter((i) => i.type === 'good'),
            ].slice(0, 2);
            setCurrentFeedback(sorted);
          } else {
            setCurrentFeedback([{ type: 'good', message: 'Bonne forme ! 💪', messageAr: 'شكل مزيان 💪' }]);
          }

          // Debug log every 20 frames
          tickCount++;
          totalLatency += latency;
          if (tickCount % 20 === 0) {
            console.log(`[loop] ${tickCount} frames, avg latency ${Math.round(totalLatency / tickCount)}ms, reps=${repResult.counted ? 'YES' : 'no'}, phase=${repResult.phase}`);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[loop] tick failed:', err?.message || err);
        }
      } finally {
        if (!cancelled) {
          // Schedule next tick (setTimeout récursif vs setInterval = pas d'overlap si tick lent)
          setTimeout(tick, 100);
        }
      }
    };

    // Démarre la première inférence (warmup gracieux)
    console.log('[CoachVision] starting detection loop');
    tick();

    return () => {
      cancelled = true;
      console.log('[CoachVision] stopping detection loop');
    };
  }, [isActive, modelReady, exerciseConfig]);

  const availableExercises = Object.entries(EXERCISE_CONFIGS).map(([key, config]) => ({
    key,
    name: config.name,
  }));

  useEffect(() => {
    if (selectedExercise) {
      const config = getExerciseConfig(selectedExercise) || EXERCISE_CONFIGS[selectedExercise];
      setExerciseConfig(config || null);
    }
  }, [selectedExercise]);

  const handleSelectExercise = (key: string) => {
    setSelectedExercise(key);
    setShowExercisePicker(false);
    setRepCount(0);
    setFormScore(100);
    setPhase('neutral');
    setCurrentFeedback([]);
  };

  const handleStart = () => {
    setRepCount(0);
    setFormScore(100);
    setLastKeypoints(null);
    setCurrentFeedback([]);
    // Countdown 3 → 2 → 1 → Go, puis activate la détection
    setCountdown(3);
  };

  // Tick countdown 3→2→1→Go puis active la détection
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      // Go ! Active la détection
      const t = setTimeout(() => {
        setCountdown(null);
        setIsActive(true);
        startedAtRef.current = Date.now();
        setCurrentFeedback([{ type: 'good', message: 'Yallah champion 💪', messageAr: 'يالاه شامبيون 💪' }]);
      }, 700); // affiche "GO!" 700ms avant de passer en mode détection
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleStop = useCallback(() => {
    setIsActive(false);
    setLastKeypoints(null);
    setCountdown(null); // cancel countdown si en cours
    if (repCount > 0) {
      Alert.alert(
        'Seance terminee',
        `${repCount} reps - Score: ${formScore}/100`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [repCount, formScore]);

  // Auto-stop: 30 reps ou 5 min (économie batterie)
  useEffect(() => {
    if (!isActive) return;
    if (repCount >= AUTO_STOP_REPS) {
      Alert.alert('🏆 Bravo !', `Tu as atteint ${AUTO_STOP_REPS} reps — score moyen ${formScore}/100`, [
        { text: 'OK', onPress: handleStop },
      ]);
      return;
    }
    const elapsed = Date.now() - startedAtRef.current;
    if (elapsed > AUTO_STOP_DURATION_MS) {
      Alert.alert('Temps écoulé', `Session de 5 min terminée — ${repCount} reps, score ${formScore}/100`, [
        { text: 'OK', onPress: handleStop },
      ]);
    }
  }, [repCount, isActive, formScore, handleStop]);

  // Permission not granted
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.permText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={64} color={Colors.primary} />
          <Text style={styles.permTitle}>Coach Vision</Text>
          <Text style={styles.permText}>
            L'app a besoin de la camera pour analyser ta posture en temps reel.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Autoriser la camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Exercise picker
  if (showExercisePicker) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Coach Vision</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.pickerContainer} showsVerticalScrollIndicator={false}>
          <Ionicons name="body-outline" size={64} color={Colors.primary} />
          <Text style={styles.pickerTitle}>Choisis ton exercice</Text>
          <Text style={styles.pickerSubtitle}>Le coach IA analysera ta posture en temps reel · {availableExercises.length} exercices</Text>

          {availableExercises.map((ex) => (
            <TouchableOpacity
              key={ex.key}
              style={styles.exerciseOption}
              activeOpacity={0.7}
              onPress={() => handleSelectExercise(ex.key)}
            >
              <Ionicons name="barbell-outline" size={22} color={Colors.primary} />
              <Text style={styles.exerciseOptionText}>{ex.name}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.lightGray} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Camera */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
        >
          {/* Sprint 1.4 Jour 3: SVG overlay keypoints + squelette */}
          {isActive && lastKeypoints && (
            <PoseOverlay
              keypoints={lastKeypoints}
              sourceWidth={sourceDims.w}
              sourceHeight={sourceDims.h}
              displayWidth={SCREEN_W}
              displayHeight={SCREEN_H * 0.8}
              mirrored={true}
            />
          )}

          {/* Overlay */}
          <View style={styles.overlay}>
            {/* Top bar */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                <Ionicons name="close" size={28} color={Colors.white} />
              </TouchableOpacity>
              <View style={styles.exerciseBadge}>
                <Text style={styles.exerciseBadgeText}>
                  {exerciseConfig?.name || selectedExercise}
                </Text>
              </View>
              <View style={{ width: 40 }} />
            </View>

            {/* Rep counter */}
            <View style={styles.repCounter}>
              <Text style={styles.repNumber}>{repCount}</Text>
              <Text style={styles.repLabel}>REPS</Text>
            </View>

            {/* Form score */}
            <View style={[
              styles.scoreCircle,
              { borderColor: formScore >= 80 ? Colors.success : formScore >= 50 ? Colors.warning : Colors.error }
            ]}>
              <Text style={styles.scoreNumber}>{formScore}</Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>

            {/* Feedback messages */}
            <View style={styles.feedbackContainer}>
              {currentFeedback.map((item, i) => (
                <View
                  key={i}
                  style={[
                    styles.feedbackBubble,
                    item.type === 'good' && styles.feedbackGood,
                    item.type === 'warning' && styles.feedbackWarning,
                    item.type === 'error' && styles.feedbackError,
                  ]}
                >
                  <Ionicons
                    name={item.type === 'good' ? 'checkmark-circle' : item.type === 'warning' ? 'alert-circle' : 'close-circle'}
                    size={18}
                    color={Colors.white}
                  />
                  <Text style={styles.feedbackText}>{item.message}</Text>
                </View>
              ))}
            </View>

            {/* Bottom controls */}
            <View style={styles.bottomControls}>
              {!isActive ? (
                <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
                  <Ionicons name="play" size={32} color={Colors.white} />
                  <Text style={styles.startBtnText}>COMMENCER</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
                  <Ionicons name="stop" size={32} color={Colors.white} />
                  <Text style={styles.stopBtnText}>ARRETER</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.switchExBtn}
                onPress={() => setShowExercisePicker(true)}
              >
                <Ionicons name="swap-horizontal" size={20} color={Colors.white} />
                <Text style={styles.switchExText}>Changer exercice</Text>
              </TouchableOpacity>
            </View>

            {/* Sprint 1.4 Jour 2: status modèle pill TOP center */}
            <View style={styles.statusRow}>
              {!modelReady && !modelError && (
                <View style={styles.modelLoadingPill}>
                  <ActivityIndicator size="small" color={Colors.white} />
                  <Text style={styles.modelLoadingText}>Chargement MoveNet...</Text>
                </View>
              )}
              {modelError && (
                <View style={[styles.modelLoadingPill, { backgroundColor: 'rgba(180,40,58,0.8)' }]}>
                  <Ionicons name="alert-circle" size={16} color={Colors.white} />
                  <Text style={styles.modelLoadingText}>{modelError}</Text>
                </View>
              )}
              {modelReady && isActive && (
                <View style={[styles.modelLoadingPill, { backgroundColor: 'rgba(74,124,89,0.85)' }]}>
                  <View style={styles.liveDot} />
                  <Text style={styles.modelLoadingText}>Détection live · {phase}</Text>
                </View>
              )}
            </View>

            {/* Countdown overlay 3-2-1-Go (au centre de l'écran) */}
            {countdown !== null && (
              <View style={styles.countdownOverlay} pointerEvents="none">
                <View style={styles.countdownCircle}>
                  <Text style={styles.countdownNumber}>
                    {countdown === 0 ? 'GO!' : countdown}
                  </Text>
                </View>
                <Text style={styles.countdownLabel}>
                  {countdown === 0 ? 'Yallah! 💪' : 'Prépare-toi...'}
                </Text>
              </View>
            )}
          </View>
        </CameraView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },

  // Permission
  permTitle: { ...Typography.h3, color: Colors.dark, textAlign: 'center' },
  permText: { ...Typography.body, color: Colors.gray, textAlign: 'center', lineHeight: 22 },
  permBtn: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8,
  },
  permBtnText: { ...Typography.button, color: Colors.white },
  backLink: { ...Typography.body, color: Colors.primary, fontWeight: Fonts.weight.semiBold, marginTop: 8 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 48 : 12, paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  headerTitle: { ...Typography.h4, color: Colors.dark },

  // Exercise picker
  pickerContainer: { alignItems: 'center', padding: 24, paddingTop: 40, paddingBottom: 80, gap: 12, backgroundColor: Colors.background },
  pickerTitle: { ...Typography.h3, color: Colors.dark, marginTop: 16 },
  pickerSubtitle: { ...Typography.body, color: Colors.gray, textAlign: 'center', marginBottom: 16 },
  exerciseOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%',
    backgroundColor: Colors.white, borderRadius: 14, padding: 18, marginBottom: 8,
  },
  exerciseOptionText: { ...Typography.bodyLarge, fontWeight: Fonts.weight.semiBold, color: Colors.dark, flex: 1 },

  // Camera
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },

  // Overlay
  overlay: { flex: 1, justifyContent: 'space-between' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 48 : 16,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  exerciseBadge: {
    backgroundColor: 'rgba(255,107,43,0.9)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  exerciseBadgeText: { fontSize: Fonts.size.base, fontWeight: Fonts.weight.bold, color: Colors.white },

  // Rep counter
  repCounter: {
    position: 'absolute', top: Platform.OS === 'android' ? 110 : 80, right: 20,
    alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, padding: 16, width: 80,
  },
  repNumber: { fontSize: 36, fontWeight: Fonts.weight.bold, color: Colors.white },
  repLabel: { fontSize: Fonts.size.xs, fontWeight: Fonts.weight.bold, color: Colors.lightGray, letterSpacing: 2 },

  // Score
  scoreCircle: {
    position: 'absolute', top: Platform.OS === 'android' ? 110 : 80, left: 20,
    alignItems: 'center', justifyContent: 'center',
    width: 70, height: 70, borderRadius: 35, borderWidth: 3, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scoreNumber: { fontSize: 22, fontWeight: Fonts.weight.bold, color: Colors.white },
  scoreLabel: { fontSize: Fonts.size.xs, color: Colors.lightGray },

  // Feedback
  feedbackContainer: {
    position: 'absolute', bottom: 180, left: 16, right: 16, gap: 6,
  },
  feedbackBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
  },
  feedbackGood: { backgroundColor: 'rgba(0,168,120,0.85)' },
  feedbackWarning: { backgroundColor: 'rgba(217,119,6,0.85)' },
  feedbackError: { backgroundColor: 'rgba(224,32,32,0.85)' },
  feedbackText: { fontSize: Fonts.size.base, fontWeight: Fonts.weight.semiBold, color: Colors.white },

  // Bottom controls
  bottomControls: {
    alignItems: 'center', paddingBottom: Platform.OS === 'android' ? 48 : 32, gap: 12,
  },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: 30, paddingVertical: 16, paddingHorizontal: 32,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  startBtnText: { fontSize: Fonts.size.lg, fontWeight: Fonts.weight.bold, color: Colors.white, letterSpacing: 1 },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.error, borderRadius: 30, paddingVertical: 16, paddingHorizontal: 32,
  },
  stopBtnText: { fontSize: Fonts.size.lg, fontWeight: Fonts.weight.bold, color: Colors.white, letterSpacing: 1 },
  switchExBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16,
  },
  switchExText: { fontSize: Fonts.size.sm, color: Colors.white },

  // Sprint 1.4 Jour 1
  testDetectionRow: {
    position: 'absolute',
    bottom: 130,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  // Status pill (loading/ready/error) — TOP center pour pas chevaucher boutons bottom
  statusRow: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 90 : 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  // Countdown 3-2-1-Go au centre de l'écran
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 100,
  },
  countdownCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(200,75,49,0.9)',
    borderWidth: 4,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  countdownNumber: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 96,
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    lineHeight: 110,
  },
  countdownLabel: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.xl,
    color: Colors.white,
    marginTop: 24,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  modelLoadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modelLoadingText: {
    fontFamily: Fonts.family.displayMedium,
    fontSize: Fonts.size.sm,
    color: Colors.white,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  testDetectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  testDetectionText: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.sm,
    color: Colors.white,
    letterSpacing: 0.3,
  },
});
