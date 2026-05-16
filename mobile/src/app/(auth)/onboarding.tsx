import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  TextInput,
  Platform,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  StatusBar,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import api, { handleApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOTAL_DATA_STEPS = 12;

// ─── BACKEND ENUM MAPPINGS ───

const GOAL_MAP: Record<string, number> = {
  LoseFat: 2,
  BuildMuscle: 1,
  BuildStrength: 3,
  Endurance: 4,
  Recomposition: 6,
  GeneralHealth: 5,
};

const LEVEL_MAP: Record<string, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
  Expert: 4,
};

const EQUIPMENT_MAP: Record<string, number> = {
  full_gym: 1 | 2 | 4 | 8 | 512 | 1024 | 256,
  home_equipped: 2 | 64 | 128 | 512 | 256,
  home_basic: 2 | 64 | 128,
  bodyweight: 16 | 256,
  outdoor: 16,
};

// ─── STEP DATA ───

const GOALS = [
  { value: 'LoseFat', icon: 'flame' as const, label: 'Perdre du gras', desc: 'Bruler les graisses' },
  { value: 'BuildMuscle', icon: 'barbell' as const, label: 'Prendre de la masse', desc: 'Hypertrophie musculaire' },
  { value: 'BuildStrength', icon: 'fitness' as const, label: 'Gagner en force', desc: 'Powerlifting / Force' },
  { value: 'Endurance', icon: 'walk' as const, label: 'Ameliorer l\'endurance', desc: 'Cardio et stamina' },
  { value: 'Recomposition', icon: 'swap-horizontal' as const, label: 'Recomposition', desc: 'Muscle + perte de gras' },
  { value: 'GeneralHealth', icon: 'heart' as const, label: 'Sante generale', desc: 'Equilibre et bien-etre' },
];

const LEVELS = [
  { value: 'Beginner', label: 'Debutant', desc: '0-6 mois d\'experience' },
  { value: 'Intermediate', label: 'Intermediaire', desc: '6-24 mois d\'experience' },
  { value: 'Advanced', label: 'Avance', desc: '2-5 ans d\'experience' },
  { value: 'Expert', label: 'Expert', desc: '5+ ans d\'experience' },
];

const EQUIPMENT_OPTIONS = [
  { value: 'full_gym', icon: 'business' as const, label: 'Salle complete' },
  { value: 'home_equipped', icon: 'home' as const, label: 'Maison equipee' },
  { value: 'home_basic', icon: 'cube' as const, label: 'Maison basique' },
  { value: 'bodyweight', icon: 'body' as const, label: 'Poids du corps' },
  { value: 'outdoor', icon: 'leaf' as const, label: 'Exterieur' },
];

const INJURY_OPTIONS = ['Dos', 'Epaules', 'Genoux', 'Poignets', 'Aucune'];
const MEDICAL_OPTIONS = ['Diabete', 'Hypertension', 'Asthme', 'Stress', 'Aucune'];
const ALLERGY_OPTIONS = ['Gluten', 'Lactose', 'Arachides', 'Aucune'];

const DIET_TYPES = [
  { value: 'omnivore', icon: 'restaurant' as const, label: 'Omnivore' },
  { value: 'vegetarian', icon: 'nutrition' as const, label: 'Vegetarien' },
  { value: 'vegan', icon: 'leaf' as const, label: 'Vegan' },
  { value: 'pescatarian', icon: 'fish' as const, label: 'Pescatarien' },
];

const CUISINE_OPTIONS = [
  { value: 'moroccan', label: 'Marocaine' },
  { value: 'mediterranean', label: 'Mediterraneenne' },
  { value: 'indian', label: 'Indienne' },
  { value: 'asian', label: 'Asiatique' },
  { value: 'mexican', label: 'Mexicaine' },
];

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentaire', desc: 'Travail de bureau' },
  { value: 'lightly_active', label: 'Peu actif', desc: 'Marche legere' },
  { value: 'moderately_active', label: 'Moderement actif', desc: 'Exercice 3-5x/sem' },
  { value: 'very_active', label: 'Tres actif', desc: 'Exercice quotidien' },
  { value: 'extremely_active', label: 'Athlete', desc: 'Entrainement intensif' },
];

const MOTIVATION_OPTIONS = [
  { value: 'performance', icon: 'trophy' as const, label: 'Performance' },
  { value: 'appearance', icon: 'eye' as const, label: 'Apparence' },
  { value: 'health', icon: 'heart' as const, label: 'Sante' },
  { value: 'confidence', icon: 'happy' as const, label: 'Confiance' },
  { value: 'energy', icon: 'flash' as const, label: 'Energie' },
  { value: 'family', icon: 'people' as const, label: 'Famille' },
];

const COACH_TONES = [
  { value: 'motivating', icon: 'flame' as const, label: 'Motivant', desc: 'Energie et push!' },
  { value: 'technical', icon: 'analytics' as const, label: 'Technique', desc: 'Precis et detaille' },
  { value: 'supportive', icon: 'heart-circle' as const, label: 'Supportif', desc: 'Doux et encourageant' },
];

const STRESS_EMOJIS = ['\u{1F60C}', '\u{1F60C}', '\u{1F642}', '\u{1F642}', '\u{1F610}', '\u{1F610}', '\u{1F615}', '\u{1F623}', '\u{1F630}', '\u{1F630}'];

// ─── PHASES ───
type Phase =
  | 'splash'
  | 'intro'
  | 'data'
  | 'emotional1'
  | 'emotional2'
  | 'loading'
  | 'summary';

// ─── ANIMATED COMPONENTS ───

function AnimatedPressable({
  onPress,
  style,
  children,
  disabled,
}: {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

function BounceSelectCard({
  selected,
  onPress,
  style,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (selected) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.03, duration: 100, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
      ]).start();
    }
  }, [selected]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

function CountUpText({ target, suffix, style }: { target: number; suffix?: string; style?: any }) {
  const [display, setDisplay] = useState(0);
  const animRef = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animRef.setValue(0);
    const listener = animRef.addListener(({ value }) => {
      setDisplay(Math.round(value));
    });
    Animated.timing(animRef, {
      toValue: target,
      duration: 1500,
      useNativeDriver: false,
    }).start();
    return () => animRef.removeListener(listener);
  }, [target]);

  return <Text style={style}>{display.toLocaleString()}{suffix || ''}</Text>;
}

function DotSpinner() {
  const dots = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={spinnerStyles.container}>
      {dots.map((dot, i) => {
        const angle = (i / 6) * 2 * Math.PI - Math.PI / 2;
        const radius = 28;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const scale = dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0.6, 1.2],
        });
        const opacity = dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 1],
        });
        return (
          <Animated.View
            key={i}
            style={[
              spinnerStyles.dot,
              {
                transform: [
                  { translateX: x },
                  { translateY: y },
                  { scale },
                ],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const spinnerStyles = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
});

// ─── INFO BOX COMPONENT ───

function InfoBox({ icon, text }: { icon: string; text: string }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.infoBox, { opacity: fadeAnim }]}>
      <Ionicons name={icon as any} size={18} color={Colors.primary} style={{ marginRight: 10, marginTop: 1 }} />
      <Text style={styles.infoBoxText}>{text}</Text>
    </Animated.View>
  );
}

// ─── MAIN COMPONENT ───

export default function OnboardingScreen() {
  // Phase management
  const [phase, setPhase] = useState<Phase>('splash');
  const [splashIndex, setSplashIndex] = useState(0);
  const [dataStep, setDataStep] = useState(1);

  // Animation refs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  // Loading screen state
  const [loadingChecks, setLoadingChecks] = useState<number[]>([]);
  const [loadingDone, setLoadingDone] = useState(false);

  // ── All onboarding state ──
  const [name, setName] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [weight, setWeight] = useState(75);
  const [height, setHeight] = useState(175);
  const [goals, setGoals] = useState<string[]>([]);
  const [level, setLevel] = useState('');
  const [frequency, setFrequency] = useState(4);
  const [duration, setDuration] = useState(60);
  const [preferredTime, setPreferredTime] = useState('');
  const [equipmentSelections, setEquipmentSelections] = useState<string[]>([]);
  const [injuries, setInjuries] = useState<string[]>([]);
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [foodAllergies, setFoodAllergies] = useState<string[]>([]);
  const [dietType, setDietType] = useState('');
  const [mealsPerDay, setMealsPerDay] = useState(4);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [activityLevel, setActivityLevel] = useState('');
  const [sleepHours, setSleepHours] = useState(7);
  const [stressLevel, setStressLevel] = useState(5);
  const [targetWeight, setTargetWeight] = useState(70);
  const [motivations, setMotivations] = useState<string[]>([]);
  const [coachTone, setCoachTone] = useState('');

  // Level slider
  const [levelSliderValue, setLevelSliderValue] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const { loadProfile } = useAuthStore();

  // ── Slide transition ──
  const animateTransition = useCallback((callback: () => void, direction: 'forward' | 'back') => {
    const exitX = direction === 'forward' ? -SCREEN_WIDTH * 0.3 : SCREEN_WIDTH * 0.3;
    const enterX = direction === 'forward' ? SCREEN_WIDTH * 0.3 : -SCREEN_WIDTH * 0.3;
    scrollRef.current?.scrollTo({ y: 0, animated: false });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: exitX, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      callback();
      slideAnim.setValue(enterX);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }),
      ]).start();
    });
  }, []);

  const animateProgress = useCallback((step: number) => {
    Animated.timing(progressAnim, {
      toValue: step / TOTAL_DATA_STEPS,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, []);

  // ── Navigation handlers ──
  const goToPhase = (newPhase: Phase, direction: 'forward' | 'back' = 'forward') => {
    animateTransition(() => setPhase(newPhase), direction);
  };

  const nextSplash = () => {
    if (splashIndex < 2) {
      animateTransition(() => setSplashIndex((p) => p + 1), 'forward');
    } else {
      goToPhase('intro');
    }
  };

  const nextDataStep = () => {
    if (dataStep === 4) {
      // After goals -> emotional1
      animateTransition(() => setPhase('emotional1'), 'forward');
    } else if (dataStep === 7) {
      // After equipment -> emotional2
      animateTransition(() => setPhase('emotional2'), 'forward');
    } else if (dataStep < TOTAL_DATA_STEPS) {
      const newStep = dataStep + 1;
      animateTransition(() => setDataStep(newStep), 'forward');
      animateProgress(newStep);
    } else {
      // After step 12 -> loading
      goToPhase('loading');
    }
  };

  const prevDataStep = () => {
    if (dataStep === 5) {
      // Before step 5, emotional1 was shown. Go back to emotional1 which goes back to step 4
      animateTransition(() => {
        setDataStep(4);
        animateProgress(4);
      }, 'back');
    } else if (dataStep === 8) {
      animateTransition(() => {
        setDataStep(7);
        animateProgress(7);
      }, 'back');
    } else if (dataStep > 1) {
      const newStep = dataStep - 1;
      animateTransition(() => setDataStep(newStep), 'back');
      animateProgress(newStep);
    } else {
      goToPhase('intro', 'back');
    }
  };

  const handleEmotional1Next = () => {
    animateTransition(() => {
      setPhase('data');
      setDataStep(5);
      animateProgress(5);
    }, 'forward');
  };

  const handleEmotional2Next = () => {
    animateTransition(() => {
      setPhase('data');
      setDataStep(8);
      animateProgress(8);
    }, 'forward');
  };

  // ── Validation ──
  const canNext = (): boolean => {
    switch (dataStep) {
      case 1: return name.trim().length >= 2;
      case 2: return !!gender;
      case 3: return weight > 20 && height > 80;
      case 4: return goals.length > 0;
      case 5: return !!level;
      case 6: return !!preferredTime;
      case 7: return equipmentSelections.length > 0;
      case 8: return true;
      case 9: return !!dietType;
      case 10: return !!activityLevel;
      case 11: return true;
      case 12: return true;
      default: return false;
    }
  };

  const toggleMultiSelect = (
    list: string[],
    setList: (v: string[]) => void,
    value: string,
    noneValue: string = 'Aucune'
  ) => {
    if (value === noneValue) {
      setList(list.includes(noneValue) ? [] : [noneValue]);
      return;
    }
    const without = list.filter((v) => v !== noneValue);
    if (without.includes(value)) {
      setList(without.filter((v) => v !== value));
    } else {
      setList([...without, value]);
    }
  };

  const toggleOrderedSelect = (
    list: string[],
    setList: (v: string[]) => void,
    value: string,
    max: number
  ) => {
    if (list.includes(value)) {
      setList(list.filter((v) => v !== value));
    } else if (list.length < max) {
      setList([...list, value]);
    }
  };

  // Level slider mapping
  useEffect(() => {
    if (levelSliderValue <= 25) setLevel('Beginner');
    else if (levelSliderValue <= 50) setLevel('Intermediate');
    else if (levelSliderValue <= 75) setLevel('Advanced');
    else setLevel('Expert');
  }, [levelSliderValue]);

  const getLevelText = (): string => {
    if (levelSliderValue <= 25) return 'Je debute';
    if (levelSliderValue <= 50) return 'Je m\'entraine regulierement';
    if (levelSliderValue <= 75) return 'Je suis avance';
    return 'Je suis un expert';
  };

  const getLevelDesc = (): string => {
    if (levelSliderValue <= 25) return '0-6 mois d\'experience';
    if (levelSliderValue <= 50) return '6-24 mois d\'experience';
    if (levelSliderValue <= 75) return '2-5 ans d\'experience';
    return '5+ ans d\'experience';
  };

  // ── Loading screen logic ──
  useEffect(() => {
    if (phase !== 'loading') return;
    setLoadingChecks([]);
    setLoadingDone(false);

    const t1 = setTimeout(() => setLoadingChecks([1]), 0);
    const t2 = setTimeout(() => setLoadingChecks([1, 2]), 1500);
    const t3 = setTimeout(() => setLoadingChecks([1, 2, 3]), 3000);
    const t4 = setTimeout(() => {
      setLoadingDone(true);
      // Auto-advance
      setTimeout(() => goToPhase('summary'), 500);
    }, 4000);

    // Fire actual API call
    handleComplete();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [phase]);

  // ── Emotional screen 1 auto-advance ──
  useEffect(() => {
    if (phase !== 'emotional1') return;
    const timer = setTimeout(() => handleEmotional1Next(), 3000);
    return () => clearTimeout(timer);
  }, [phase]);

  // ── Computed summary values ──
  const computeTDEE = (): number => {
    const w = weight;
    const h = height;
    const age = birthYear ? new Date().getFullYear() - parseInt(birthYear) : 25;
    let bmr: number;
    if (gender === 'female') {
      bmr = 10 * w + 6.25 * h - 5 * age - 161;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * age + 5;
    }
    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9,
    };
    return Math.round(bmr * (multipliers[activityLevel] || 1.55));
  };

  const computeMacros = () => {
    const primaryGoal = goals[0] || 'GeneralHealth';
    let tdee = computeTDEE();
    if (primaryGoal === 'LoseFat') tdee -= 400;
    if (primaryGoal === 'BuildMuscle') tdee += 300;
    const protein = Math.round((tdee * 0.3) / 4);
    const fat = Math.round((tdee * 0.25) / 9);
    const carbs = Math.round((tdee * 0.45) / 4);
    return { protein, fat, carbs, calories: tdee };
  };

  const getSplitName = (): string => {
    if (frequency <= 3) return 'Full Body';
    if (frequency === 4) return 'Upper/Lower';
    return 'Push/Pull/Legs';
  };

  const getGoalText = (): string => {
    const primaryGoal = goals[0];
    const g = GOALS.find((g) => g.value === primaryGoal);
    return g ? g.label.toLowerCase() : 'atteindre tes objectifs';
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const bd = birthDay && birthMonth && birthYear
        ? `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}T00:00:00Z`
        : undefined;

      const primaryEquipment = equipmentSelections[0] || 'bodyweight';
      const equipmentValue = EQUIPMENT_MAP[primaryEquipment] || 0;
      const primaryGoal = goals[0] || 'GeneralHealth';

      await api.post('/api/users/onboarding', {
        name: name.trim(),
        gender,
        birthDate: bd,
        weightKg: weight,
        heightCm: height,
        goal: GOAL_MAP[primaryGoal] ?? 1,
        level: LEVEL_MAP[level] ?? 1,
        trainingFrequency: frequency,
        preferredDuration: duration,
        preferredTime,
        availableEquipment: equipmentValue,
        injuries: injuries.filter((i) => i !== 'Aucune'),
        medicalConditions: medicalConditions.filter((m) => m !== 'Aucune'),
        foodAllergies: foodAllergies.filter((a) => a !== 'Aucune'),
        dietType,
        mealsPerDay,
        preferredCuisines: cuisines,
        activityLevel,
        sleepHours,
        stressLevel,
        targetWeightKg: targetWeight,
        motivationReasons: motivations,
        coachTonePreference: coachTone,
      });
      await loadProfile();
    } catch (err: unknown) {
      const apiError = handleApiError(err);
      Alert.alert('Erreur', apiError.message || 'Impossible de sauvegarder le profil');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    router.replace('/(main)');
  };

  // ═══════════════════════════════════════════
  // RENDER: SPLASH SCREENS
  // ═══════════════════════════════════════════

  const SPLASH_DATA = [
    {
      icon: 'barbell' as const,
      title: 'Ton coach IA personnel',
      desc: 'Programme d\'entrainement et nutrition concu par l\'IA, adapte a tes objectifs. Made in Morocco 🇲🇦',
      button: 'Continuer',
    },
    {
      icon: 'walk' as const,
      title: '15 minutes par jour suffisent',
      desc: 'شويا بشويا — petit a petit, ton corps se transforme. Meme courte, une seance reguliere change tout.',
      button: 'Continuer',
    },
    {
      icon: 'fitness' as const,
      title: 'Salle, dar, plage — partout',
      desc: 'Programmes adaptes a ton materiel et ton environnement, que tu sois a Casa, Marrakech ou ailleurs.',
      button: 'Yallah, on commence!',
    },
  ];

  const renderSplash = () => {
    const data = SPLASH_DATA[splashIndex];
    return (
      <View style={styles.splashContainer}>
        {/* Image top area */}
        <View style={styles.splashTop}>
          <Image
            source={
              splashIndex === 0 ? require('../../../assets/images/onboarding/splash_1.jpg') :
              splashIndex === 1 ? require('../../../assets/images/onboarding/splash_2.jpg') :
              require('../../../assets/images/onboarding/splash_3.jpg')
            }
            style={styles.splashImage}
            resizeMode="cover"
          />
          {/* Orange overlay */}
          <View style={styles.splashOverlay} />
          {/* Diagonal cut */}
          <View style={styles.splashDiagonal} />
        </View>

        {/* Content */}
        <View style={styles.splashContent}>
          <Text style={styles.splashTitle}>{data.title}</Text>
          <Text style={styles.splashDesc}>{data.desc}</Text>

          {/* Pagination dots */}
          <View style={styles.splashDots}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.splashDot,
                  i === splashIndex && styles.splashDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Bottom */}
        <View style={styles.splashBottom}>
          <AnimatedPressable onPress={nextSplash} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{data.button}</Text>
            {splashIndex === 2 && (
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            )}
          </AnimatedPressable>
          {splashIndex === 0 && (
            <TouchableOpacity
              onPress={() => router.replace('/(auth)/login')}
              style={styles.splashLoginLink}
            >
              <Text style={styles.splashLoginText}>J'ai deja un compte</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════
  // RENDER: INTRO SCREEN
  // ═══════════════════════════════════════════

  const renderIntro = () => (
    <View style={styles.introContainer}>
      <View style={styles.introContent}>
        <Text style={styles.introGreeting}>Ravis de faire ta connaissance! {'\u{1F4AA}'}</Text>
        <Text style={styles.introDesc}>
          Reponds a quelques questions pour que ton Coach IA cree ton programme personnalise
        </Text>
        <View style={styles.introDuration}>
          <Ionicons name="time-outline" size={16} color={Colors.gray} />
          <Text style={styles.introDurationText}>3 min</Text>
        </View>

        <View style={styles.introSteps}>
          <View style={styles.introStep}>
            <View style={styles.introStepIcon}>
              <Ionicons name="person" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.introStepLabel}>Etape 1</Text>
              <Text style={styles.introStepText}>Ton profil et tes objectifs</Text>
            </View>
          </View>
          <View style={styles.introStepLine} />
          <View style={styles.introStep}>
            <View style={styles.introStepIcon}>
              <Ionicons name="barbell" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.introStepLabel}>Etape 2</Text>
              <Text style={styles.introStepText}>Tes preferences d'entrainement</Text>
            </View>
          </View>
          <View style={styles.introStepLine} />
          <View style={styles.introStep}>
            <View style={styles.introStepIcon}>
              <Ionicons name="rocket" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.introStepLabel}>Etape 3</Text>
              <Text style={styles.introStepText}>Ton programme personnalise</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.introBottom}>
        <AnimatedPressable
          onPress={() => goToPhase('data')}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>Commencer</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </AnimatedPressable>
      </View>
    </View>
  );

  // ═══════════════════════════════════════════
  // RENDER: DATA COLLECTION STEPS 1-12
  // ═══════════════════════════════════════════

  // ─── STEP 1: NAME ───
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Bienvenue!</Text>
      <Text style={styles.stepSubtitle}>Comment tu t'appelles?</Text>
      <Text style={styles.stepDescription}>
        On va creer ton programme personnalise en quelques minutes.
      </Text>
      <View style={{ marginTop: 32 }}>
        <Text style={styles.fieldLabel}>Ton prenom</Text>
        <TextInput
          style={styles.textInputLarge}
          placeholder="Ex: Youssef"
          placeholderTextColor={Colors.lightGray}
          value={name}
          onChangeText={setName}
          autoFocus
          autoCapitalize="words"
          returnKeyType="next"
        />
      </View>
    </View>
  );

  // ─── STEP 2: GENDER + DOB ───
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Parle-nous de toi</Text>

      <InfoBox
        icon="information-circle"
        text="Cela permet a ton Coach de calculer ton metabolisme et d'adapter tes besoins caloriques."
      />

      <Text style={styles.fieldLabel}>Genre</Text>
      <View style={styles.cardRow}>
        {([
          { value: 'male', icon: 'man' as const, label: 'Homme' },
          { value: 'female', icon: 'woman' as const, label: 'Femme' },
          { value: 'other', icon: 'transgender' as const, label: 'Autre' },
        ]).map((item) => (
          <BounceSelectCard
            key={item.value}
            selected={gender === item.value}
            onPress={() => setGender(item.value)}
            style={[styles.genderCard, gender === item.value && styles.cardSelected]}
          >
            <View style={[styles.cardIconCircle, gender === item.value && styles.cardIconCircleSelected]}>
              <Ionicons name={item.icon} size={24} color={gender === item.value ? Colors.primary : Colors.gray} />
            </View>
            <Text style={[styles.cardLabel, gender === item.value && styles.cardLabelSelected]}>
              {item.label}
            </Text>
            {gender === item.value && (
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} style={styles.cardCheck} />
            )}
          </BounceSelectCard>
        ))}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 24 }]}>Date de naissance (optionnel)</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden', width: '100%' }}>
        <TextInput
          style={{ width: '30%', textAlign: 'center', paddingVertical: 14, fontSize: 16, color: Colors.dark }}
          placeholder="JJ"
          placeholderTextColor={Colors.lightGray}
          value={birthDay}
          onChangeText={(t) => setBirthDay(t.replace(/\D/g, '').slice(0, 2))}
          keyboardType="number-pad"
          maxLength={2}
        />
        <Text style={{ fontSize: 18, color: Colors.lightGray }}>/</Text>
        <TextInput
          style={{ width: '30%', textAlign: 'center', paddingVertical: 14, fontSize: 16, color: Colors.dark }}
          placeholder="MM"
          placeholderTextColor={Colors.lightGray}
          value={birthMonth}
          onChangeText={(t) => setBirthMonth(t.replace(/\D/g, '').slice(0, 2))}
          keyboardType="number-pad"
          maxLength={2}
        />
        <Text style={{ fontSize: 18, color: Colors.lightGray }}>/</Text>
        <TextInput
          style={{ width: '34%', textAlign: 'center', paddingVertical: 14, fontSize: 16, color: Colors.dark }}
          placeholder="AAAA"
          placeholderTextColor={Colors.lightGray}
          value={birthYear}
          onChangeText={(t) => setBirthYear(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>
    </View>
  );

  // ─── STEP 3: MEASUREMENTS ───
  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tes mensurations</Text>

      <InfoBox
        icon="calculator"
        text="On calcule ton metabolisme, tes macros et le volume d'entrainement optimal."
      />

      <View style={styles.heroCenter}>
        <View style={styles.measureIconWrap}>
          <Ionicons name="body" size={48} color={Colors.primary} />
        </View>
      </View>

      <Text style={styles.fieldLabel}>Poids (kg)</Text>
      <View style={styles.numberRow}>
        <AnimatedPressable
          onPress={() => setWeight((w) => Math.max(30, w - 1))}
          style={styles.numberBtn}
        >
          <Ionicons name="remove" size={24} color={Colors.primary} />
        </AnimatedPressable>
        <View style={styles.numberDisplay}>
          <Text style={styles.numberValue}>{weight}</Text>
          <Text style={styles.numberUnit}>kg</Text>
        </View>
        <AnimatedPressable
          onPress={() => setWeight((w) => Math.min(250, w + 1))}
          style={styles.numberBtn}
        >
          <Ionicons name="add" size={24} color={Colors.primary} />
        </AnimatedPressable>
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 24 }]}>Taille (cm)</Text>
      <View style={styles.numberRow}>
        <AnimatedPressable
          onPress={() => setHeight((h) => Math.max(100, h - 1))}
          style={styles.numberBtn}
        >
          <Ionicons name="remove" size={24} color={Colors.primary} />
        </AnimatedPressable>
        <View style={styles.numberDisplay}>
          <Text style={styles.numberValue}>{height}</Text>
          <Text style={styles.numberUnit}>cm</Text>
        </View>
        <AnimatedPressable
          onPress={() => setHeight((h) => Math.min(230, h + 1))}
          style={styles.numberBtn}
        >
          <Ionicons name="add" size={24} color={Colors.primary} />
        </AnimatedPressable>
      </View>

      <Text style={styles.bmiText}>
        IMC: {(weight / ((height / 100) ** 2)).toFixed(1)}
      </Text>
    </View>
  );

  // ─── STEP 4: GOALS (multi-select with order) ───
  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Quels sont tes objectifs?</Text>
      <Text style={styles.stepDescription}>
        Choisis jusqu'a 3 objectifs par ordre de priorite.
      </Text>

      <InfoBox
        icon="star"
        text="L'ordre compte! Ton 1er objectif sera la priorite de ton programme."
      />

      <View style={styles.goalGrid}>
        {GOALS.map((item) => {
          const idx = goals.indexOf(item.value);
          const selected = idx !== -1;
          return (
            <BounceSelectCard
              key={item.value}
              selected={selected}
              onPress={() => toggleOrderedSelect(goals, setGoals, item.value, 3)}
              style={[styles.goalCard, selected && styles.cardSelected]}
            >
              <View style={[styles.goalIconWrap, selected && styles.goalIconWrapSelected]}>
                <Ionicons name={item.icon} size={24} color={selected ? Colors.primary : Colors.gray} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.goalLabel, selected && styles.cardLabelSelected]}>
                  {item.label}
                </Text>
                <Text style={styles.goalDesc}>{item.desc}</Text>
              </View>
              {selected && (
                <View style={styles.goalOrderBadge}>
                  <Text style={styles.goalOrderText}>{idx + 1}</Text>
                </View>
              )}
            </BounceSelectCard>
          );
        })}
      </View>
    </View>
  );

  // ─── STEP 5: LEVEL (slider) ───
  const renderStep5 = () => {
    const sliderPositions = [
      { value: 1, label: 'Debutant', x: 0 },
      { value: 26, label: 'Intermediaire', x: 0.33 },
      { value: 51, label: 'Avance', x: 0.66 },
      { value: 76, label: 'Expert', x: 1 },
    ];

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Quel est ton niveau?</Text>

        <InfoBox
          icon="speedometer"
          text="On adapte l'intensite et la complexite des exercices a ton experience."
        />

        <View style={styles.sliderContainer}>
          <Text style={styles.sliderMainText}>{getLevelText()}</Text>
          <Text style={styles.sliderSubText}>{getLevelDesc()}</Text>

          {/* Visual slider track */}
          <View style={styles.sliderTrack}>
            <View
              style={[
                styles.sliderFill,
                { width: `${((levelSliderValue - 1) / 99) * 100}%` },
              ]}
            />
          </View>

          {/* Tap positions */}
          <View style={styles.sliderTaps}>
            {sliderPositions.map((pos) => (
              <TouchableOpacity
                key={pos.value}
                onPress={() => setLevelSliderValue(pos.value)}
                style={[
                  styles.sliderTapTarget,
                  { left: `${pos.x * 100}%`, marginLeft: pos.x === 1 ? -40 : pos.x === 0 ? 0 : -20 },
                ]}
              >
                <View style={[
                  styles.sliderDotMarker,
                  levelSliderValue >= pos.value && styles.sliderDotMarkerActive,
                ]} />
                <Text style={[
                  styles.sliderTapLabel,
                  levelSliderValue >= pos.value && styles.sliderTapLabelActive,
                ]}>
                  {pos.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // ─── STEP 6: FREQUENCY & SCHEDULE ───
  const renderStep6 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Ton planning</Text>
      <Text style={styles.stepDescription}>
        Combien de fois par semaine peux-tu t'entrainer?
      </Text>

      <Text style={styles.fieldLabel}>Jours par semaine</Text>
      <View style={styles.circleRow}>
        {[2, 3, 4, 5, 6].map((num) => (
          <BounceSelectCard
            key={num}
            selected={frequency === num}
            onPress={() => setFrequency(num)}
            style={[styles.circleBtn, frequency === num && styles.circleBtnSelected]}
          >
            <Text style={[styles.circleText, frequency === num && styles.circleTextSelected]}>
              {num}
            </Text>
          </BounceSelectCard>
        ))}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 28 }]}>Duree par seance</Text>
      <View style={styles.chipRow}>
        {[30, 45, 60, 75, 90].map((min) => (
          <BounceSelectCard
            key={min}
            selected={duration === min}
            onPress={() => setDuration(min)}
            style={[styles.chip, duration === min && styles.chipSelected]}
          >
            <Text style={[styles.chipText, duration === min && styles.chipTextSelected]}>
              {min}min
            </Text>
          </BounceSelectCard>
        ))}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 28 }]}>Moment prefere</Text>
      <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
        {([
          { value: 'morning', icon: 'sunny' as const, label: 'Matin' },
          { value: 'noon', icon: 'partly-sunny' as const, label: 'Midi' },
          { value: 'evening', icon: 'moon' as const, label: 'Soir' },
        ]).map((item) => (
          <BounceSelectCard
            key={item.value}
            selected={preferredTime === item.value}
            onPress={() => setPreferredTime(item.value)}
            style={[styles.timeCard, preferredTime === item.value && styles.cardSelected]}
          >
            <Ionicons
              name={item.icon}
              size={26}
              color={preferredTime === item.value ? Colors.primary : Colors.gray}
            />
            <Text style={[styles.cardLabel, preferredTime === item.value && styles.cardLabelSelected]}>
              {item.label}
            </Text>
          </BounceSelectCard>
        ))}
      </View>
    </View>
  );

  // ─── STEP 7: EQUIPMENT (ordered multi-select) ───
  const renderStep7 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Ton equipement</Text>
      <Text style={styles.stepDescription}>
        Ou est-ce que tu t'entraines? Selectionne par ordre de preference.
      </Text>

      <InfoBox
        icon="location"
        text="On adapte les exercices a l'equipement disponible dans ton environnement."
      />

      {EQUIPMENT_OPTIONS.map((item) => {
        const idx = equipmentSelections.indexOf(item.value);
        const selected = idx !== -1;
        return (
          <BounceSelectCard
            key={item.value}
            selected={selected}
            onPress={() => toggleOrderedSelect(equipmentSelections, setEquipmentSelections, item.value, 3)}
            style={[styles.levelCard, selected && styles.cardSelected]}
          >
            <View style={[styles.equipIconWrap, selected && styles.equipIconWrapSelected]}>
              <Ionicons name={item.icon} size={22} color={selected ? Colors.primary : Colors.gray} />
            </View>
            <Text style={[styles.levelLabel, { flex: 1 }, selected && styles.cardLabelSelected]}>
              {item.label}
            </Text>
            {selected ? (
              <View style={styles.equipOrderBadge}>
                <Text style={styles.equipOrderText}>{idx + 1}</Text>
              </View>
            ) : (
              <View style={styles.equipEmptyBadge} />
            )}
          </BounceSelectCard>
        );
      })}
    </View>
  );

  // ─── STEP 8: HEALTH ───
  const renderStep8 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Ta sante</Text>

      <InfoBox
        icon="shield-checkmark"
        text="On adapte les exercices pour proteger tes articulations et respecter tes contraintes."
      />

      <Text style={styles.fieldLabel}>As-tu des blessures?</Text>
      <View style={styles.chipRow}>
        {INJURY_OPTIONS.map((item) => {
          const sel = injuries.includes(item);
          return (
            <BounceSelectCard
              key={item}
              selected={sel}
              onPress={() => toggleMultiSelect(injuries, setInjuries, item)}
              style={[styles.chip, sel && styles.chipSelected]}
            >
              <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{item}</Text>
            </BounceSelectCard>
          );
        })}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 24 }]}>Conditions medicales?</Text>
      <View style={styles.chipRow}>
        {MEDICAL_OPTIONS.map((item) => {
          const sel = medicalConditions.includes(item);
          return (
            <BounceSelectCard
              key={item}
              selected={sel}
              onPress={() => toggleMultiSelect(medicalConditions, setMedicalConditions, item)}
              style={[styles.chip, sel && styles.chipSelected]}
            >
              <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{item}</Text>
            </BounceSelectCard>
          );
        })}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 24 }]}>Allergies alimentaires?</Text>
      <View style={styles.chipRow}>
        {ALLERGY_OPTIONS.map((item) => {
          const sel = foodAllergies.includes(item);
          return (
            <BounceSelectCard
              key={item}
              selected={sel}
              onPress={() => toggleMultiSelect(foodAllergies, setFoodAllergies, item)}
              style={[styles.chip, sel && styles.chipSelected]}
            >
              <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{item}</Text>
            </BounceSelectCard>
          );
        })}
      </View>
    </View>
  );

  // ─── STEP 9: DIET ───
  const renderStep9 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Ton alimentation</Text>
      <Text style={styles.stepDescription}>
        On personnalise tes recommandations nutritionnelles.
      </Text>

      <Text style={styles.fieldLabel}>Type d'alimentation</Text>
      <View style={styles.cardRow}>
        {DIET_TYPES.map((item) => (
          <BounceSelectCard
            key={item.value}
            selected={dietType === item.value}
            onPress={() => setDietType(item.value)}
            style={[styles.dietCard, dietType === item.value && styles.cardSelected]}
          >
            <Ionicons
              name={item.icon}
              size={28}
              color={dietType === item.value ? Colors.primary : Colors.gray}
            />
            <Text style={[styles.dietLabel, dietType === item.value && styles.cardLabelSelected]}>
              {item.label}
            </Text>
          </BounceSelectCard>
        ))}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 28 }]}>Repas par jour</Text>
      <View style={styles.circleRow}>
        {[3, 4, 5, 6].map((num) => (
          <BounceSelectCard
            key={num}
            selected={mealsPerDay === num}
            onPress={() => setMealsPerDay(num)}
            style={[styles.circleBtn, mealsPerDay === num && styles.circleBtnSelected]}
          >
            <Text style={[styles.circleText, mealsPerDay === num && styles.circleTextSelected]}>
              {num}
            </Text>
          </BounceSelectCard>
        ))}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 28 }]}>Cuisines preferees</Text>
      <View style={styles.chipRow}>
        {CUISINE_OPTIONS.map((item) => {
          const sel = cuisines.includes(item.value);
          return (
            <BounceSelectCard
              key={item.value}
              selected={sel}
              onPress={() => {
                setCuisines((prev) =>
                  prev.includes(item.value) ? prev.filter((c) => c !== item.value) : [...prev, item.value]
                );
              }}
              style={[styles.chip, sel && styles.chipSelected]}
            >
              <Text style={[styles.chipText, sel && styles.chipTextSelected]}>
                {item.label}
              </Text>
            </BounceSelectCard>
          );
        })}
      </View>
    </View>
  );

  // ─── STEP 10: LIFESTYLE ───
  const renderStep10 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Ton mode de vie</Text>

      <InfoBox
        icon="pulse"
        text="Ca nous aide a ajuster tes calories et ta recuperation optimale."
      />

      <Text style={styles.fieldLabel}>Niveau d'activite quotidienne</Text>
      {ACTIVITY_LEVELS.map((item) => (
        <BounceSelectCard
          key={item.value}
          selected={activityLevel === item.value}
          onPress={() => setActivityLevel(item.value)}
          style={[styles.activityCard, activityLevel === item.value && styles.cardSelected]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.activityLabel, activityLevel === item.value && styles.cardLabelSelected]}>
              {item.label}
            </Text>
            <Text style={styles.activityDesc}>{item.desc}</Text>
          </View>
          {activityLevel === item.value && (
            <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
          )}
        </BounceSelectCard>
      ))}

      <Text style={[styles.fieldLabel, { marginTop: 28 }]}>Heures de sommeil</Text>
      <View style={styles.numberRow}>
        <AnimatedPressable
          onPress={() => setSleepHours((h) => Math.max(3, h - 1))}
          style={styles.numberBtnSmall}
        >
          <Ionicons name="remove" size={20} color={Colors.primary} />
        </AnimatedPressable>
        <View style={styles.numberDisplaySmall}>
          <Text style={styles.numberValueSmall}>{sleepHours}h</Text>
        </View>
        <AnimatedPressable
          onPress={() => setSleepHours((h) => Math.min(12, h + 1))}
          style={styles.numberBtnSmall}
        >
          <Ionicons name="add" size={20} color={Colors.primary} />
        </AnimatedPressable>
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 28 }]}>Niveau de stress</Text>
      <View style={styles.stressRow}>
        <Text style={styles.stressEmoji}>{STRESS_EMOJIS[stressLevel - 1]}</Text>
        <View style={styles.stressSlider}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => setStressLevel(n)}
              style={[
                styles.stressDot,
                n <= stressLevel && styles.stressDotActive,
                n === stressLevel && styles.stressDotCurrent,
              ]}
            />
          ))}
        </View>
        <Text style={styles.stressValue}>{stressLevel}/10</Text>
      </View>
    </View>
  );

  // ─── STEP 11: TARGET ───
  const renderStep11 = () => {
    const diff = targetWeight - weight;
    const action = diff < 0 ? 'perdre' : diff > 0 ? 'prendre' : 'maintenir';
    const absDiff = Math.abs(diff);

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Ton objectif chiffre</Text>
        <Text style={styles.stepDescription}>
          Optionnel - tu peux passer cette etape.
        </Text>

        <Text style={styles.fieldLabel}>Poids cible (kg)</Text>
        <View style={styles.numberRow}>
          <AnimatedPressable
            onPress={() => setTargetWeight((w) => Math.max(30, w - 1))}
            style={styles.numberBtn}
          >
            <Ionicons name="remove" size={24} color={Colors.primary} />
          </AnimatedPressable>
          <View style={styles.numberDisplay}>
            <Text style={styles.numberValue}>{targetWeight}</Text>
            <Text style={styles.numberUnit}>kg</Text>
          </View>
          <AnimatedPressable
            onPress={() => setTargetWeight((w) => Math.min(250, w + 1))}
            style={styles.numberBtn}
          >
            <Ionicons name="add" size={24} color={Colors.primary} />
          </AnimatedPressable>
        </View>

        <View style={styles.targetInfo}>
          <Ionicons
            name={diff < 0 ? 'trending-down' : diff > 0 ? 'trending-up' : 'remove-outline'}
            size={24}
            color={Colors.primary}
          />
          <Text style={styles.targetText}>
            {diff === 0
              ? 'Maintenir ton poids actuel'
              : `Tu veux ${action} ${absDiff} kg`}
          </Text>
        </View>

        {absDiff > 0 && (
          <Text style={styles.targetHint}>
            Objectif realiste: ~{Math.ceil(absDiff / (diff < 0 ? 2 : 1.5))} semaines
          </Text>
        )}
      </View>
    );
  };

  // ─── STEP 12: MOTIVATION ───
  const renderStep12 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Qu'est-ce qui te motive?</Text>
      <Text style={styles.stepDescription}>
        On personnalise tes rappels et ton coaching.
      </Text>

      <Text style={styles.fieldLabel}>Tes motivations (plusieurs choix)</Text>
      <View style={styles.motivationGrid}>
        {MOTIVATION_OPTIONS.map((item) => {
          const sel = motivations.includes(item.value);
          return (
            <BounceSelectCard
              key={item.value}
              selected={sel}
              onPress={() => {
                setMotivations((prev) =>
                  prev.includes(item.value) ? prev.filter((m) => m !== item.value) : [...prev, item.value]
                );
              }}
              style={[styles.motivationCard, sel && styles.cardSelected]}
            >
              <Ionicons
                name={item.icon}
                size={24}
                color={sel ? Colors.primary : Colors.gray}
                style={{ marginBottom: 6 }}
              />
              <Text style={[styles.motivationLabel, sel && styles.cardLabelSelected]}>
                {item.label}
              </Text>
              {sel && (
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} style={styles.motivationCheck} />
              )}
            </BounceSelectCard>
          );
        })}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 28 }]}>Ton style de coach</Text>
      {COACH_TONES.map((item) => (
        <BounceSelectCard
          key={item.value}
          selected={coachTone === item.value}
          onPress={() => setCoachTone(item.value)}
          style={[styles.levelCard, coachTone === item.value && styles.cardSelected]}
        >
          <Ionicons
            name={item.icon}
            size={24}
            color={coachTone === item.value ? Colors.primary : Colors.gray}
            style={{ marginRight: 14 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.levelLabel, coachTone === item.value && styles.cardLabelSelected]}>
              {item.label}
            </Text>
            <Text style={styles.levelDesc}>{item.desc}</Text>
          </View>
          {coachTone === item.value && (
            <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
          )}
        </BounceSelectCard>
      ))}
    </View>
  );

  const renderDataStep = () => {
    switch (dataStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      case 8: return renderStep8();
      case 9: return renderStep9();
      case 10: return renderStep10();
      case 11: return renderStep11();
      case 12: return renderStep12();
      default: return null;
    }
  };

  // ═══════════════════════════════════════════
  // RENDER: EMOTIONAL SCREEN 1
  // ═══════════════════════════════════════════

  const renderEmotional1 = () => (
    <View style={styles.emotionalContainer}>
      <Image
        source={require('../../../assets/images/onboarding/splash_4.jpg')}
        style={{ width: '100%', height: 200, borderRadius: 16, marginBottom: 24 }}
        resizeMode="cover"
      />
      <View style={styles.emotionalContent}>
        <Text style={styles.emotionalTitle}>
          Yallah {name}! {'\u{1F389}'}
        </Text>
        <Text style={styles.emotionalSubtitle}>
          On va t'aider a {getGoalText()}!
        </Text>

        <View style={styles.emotionalCounter}>
          <Text style={styles.emotionalCounterLabel}>Plus de</Text>
          <CountUpText
            target={50000}
            style={styles.emotionalCounterNumber}
          />
          <Text style={styles.emotionalCounterLabel}>athletes marocains</Text>
        </View>

        <Text style={styles.emotionalWelcome}>
          Bienvenue dans l'equipe Big Boss
        </Text>
      </View>

      <View style={styles.emotionalBottom}>
        <AnimatedPressable onPress={handleEmotional1Next} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Suivant</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </AnimatedPressable>
      </View>
    </View>
  );

  // ═══════════════════════════════════════════
  // RENDER: EMOTIONAL SCREEN 2 (Projection)
  // ═══════════════════════════════════════════

  const renderEmotional2 = () => {
    const primaryGoal = goals[0] || 'GeneralHealth';

    // Dynamic projection config based on goal
    const goalProjection: Record<string, { title: string; metric: string; badge: string; badgeColor: string; badgeBg: string; icon: 'trending-down' | 'trending-up'; direction: 'down' | 'up'; labelSans: string; labelAvec: string }> = {
      LoseFat: { title: 'Evolution du poids', metric: 'Poids', badge: `-${Math.max(5, Math.round((weight - (targetWeight || weight - 10))))} kg`, badgeColor: '#4CAF50', badgeBg: '#E8F5E9', icon: 'trending-down', direction: 'down', labelSans: 'Ton poids sans Big Boss', labelAvec: 'Ton poids avec Big Boss' },
      BuildMuscle: { title: 'Prise de masse musculaire', metric: 'Masse', badge: `+${Math.round((targetWeight || weight + 5) - weight)} kg muscle`, badgeColor: Colors.primary, badgeBg: '#FFF3E0', icon: 'trending-up', direction: 'up', labelSans: 'Ta progression sans Big Boss', labelAvec: 'Ta progression avec Big Boss' },
      BuildStrength: { title: 'Evolution de la force', metric: 'Force', badge: '+40% 1RM', badgeColor: '#2196F3', badgeBg: '#E3F2FD', icon: 'trending-up', direction: 'up', labelSans: 'Ta force sans Big Boss', labelAvec: 'Ta force avec Big Boss' },
      Endurance: { title: 'Amelioration endurance', metric: 'VO2max', badge: '+30% cardio', badgeColor: '#9C27B0', badgeBg: '#F3E5F5', icon: 'trending-up', direction: 'up', labelSans: 'Ton endurance sans Big Boss', labelAvec: 'Ton endurance avec Big Boss' },
      Recomposition: { title: 'Recomposition corporelle', metric: 'Composition', badge: '-8% gras +5kg muscle', badgeColor: Colors.primary, badgeBg: '#FFF3E0', icon: 'trending-up', direction: 'up', labelSans: 'Sans Big Boss', labelAvec: 'Avec Big Boss' },
      GeneralHealth: { title: 'Amelioration sante', metric: 'Forme', badge: '+50% energie', badgeColor: '#4CAF50', badgeBg: '#E8F5E9', icon: 'trending-up', direction: 'up', labelSans: 'Ta forme sans Big Boss', labelAvec: 'Ta forme avec Big Boss' },
    };

    const proj = goalProjection[primaryGoal] || goalProjection.GeneralHealth;
    const isDown = proj.direction === 'down';

    return (
      <View style={styles.emotionalContainer}>
        <View style={{
          width: 220, height: 220, alignSelf: 'center', marginBottom: 20,
          borderRadius: 110, overflow: 'hidden',
          borderWidth: 4, borderColor: Colors.primary,
          backgroundColor: '#1A1A2E',
        }}>
          <Image
            source={require('../../../assets/images/onboarding/splash_5.jpg')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 50, backgroundColor: 'rgba(255,107,43,0.85)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>TRANSFORMATION</Text>
          </View>
        </View>
        <View style={styles.emotionalContent}>
          <Text style={styles.emotionalTitle}>
            Ton Coach IA elabore ton programme...
          </Text>

          {/* Freeletics-style Projection Graph - uses % positioning */}
          <View style={{ backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginTop: 20, maxWidth: 400, alignSelf: 'center', width: '100%' }}>
            <Text style={{ fontSize: 13, color: '#AAA', fontWeight: '600', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
              {proj.title}
            </Text>

            {/* Graph container with overflow hidden */}
            <View style={{ height: 180, position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
              {/* Subtle grid */}
              {[0,1,2,3].map(i => (
                <View key={i} style={{ position:'absolute', left:0, right:0, top: `${i * 33}%` as any, height: 1, backgroundColor:'#F0F0F5' }} />
              ))}

              {/* Orange area fill */}
              <View style={{
                position: 'absolute', left: '5%', right: '5%',
                top: isDown ? '25%' : '15%',
                bottom: isDown ? '0%' : '25%',
                backgroundColor: 'rgba(255,107,43,0.07)',
                borderRadius: 16,
              }} />

              {/* Gray line (stagnant) using percentage positions */}
              <View style={{ position: 'absolute', left: '5%', right: '5%', top: isDown ? '28%' : '65%', height: 3, borderRadius: 2, backgroundColor: '#E0E0E0', transform: [{rotate: isDown ? '2deg' : '-2deg'}] }} />

              {/* Orange line (improving) - moderate angle, stays inside */}
              <View style={{ position: 'absolute', left: '5%', right: '15%', top: isDown ? '28%' : '65%', height: 4, borderRadius: 2, backgroundColor: Colors.primary, transform: [{rotate: isDown ? '14deg' : '-14deg'}], transformOrigin: isDown ? 'left top' : 'left bottom' }} />

              {/* Gray end dot */}
              <View style={{ position: 'absolute', right: '8%', top: isDown ? '30%' : '58%', width: 10, height: 10, borderRadius: 5, backgroundColor: '#D5D5D5', borderWidth: 2, borderColor: '#FFF' }} />

              {/* Orange end dot */}
              <View style={{ position: 'absolute', right: '15%', top: isDown ? '58%' : '22%', width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.primary, borderWidth: 3, borderColor: '#FFF' }} />

              {/* Dotted difference line */}
              <View style={{ position: 'absolute', right: '20%', top: isDown ? '33%' : '25%', width: 1, height: isDown ? '25%' : '30%', backgroundColor: '#DDD' }} />

              {/* Difference badge */}
              <View style={{ position: 'absolute', right: '25%', top: isDown ? '42%' : '35%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: proj.badgeBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                  <Ionicons name={proj.icon} size={14} color={proj.badgeColor} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: proj.badgeColor }}>
                    {proj.badge}
                  </Text>
                </View>
              </View>

              {/* End labels */}
              <Text style={{ position: 'absolute', left: '8%', top: isDown ? '20%' : '60%', fontSize: 11, color: '#BBB' }}>{proj.labelSans}</Text>
              <Text style={{ position: 'absolute', left: '8%', top: isDown ? '62%' : '15%', fontSize: 11, color: proj.badgeColor, fontWeight: '700' }}>{proj.labelAvec}</Text>
            </View>

            {/* X axis */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 8 }}>
              {["Aujourd'hui", '1 mois', '3 mois', '6 mois'].map((l, i) => (
                <Text key={i} style={{ fontSize: 11, color: '#CCC', fontWeight: '500' }}>{l}</Text>
              ))}
            </View>
          </View>

          <Text style={{ textAlign: 'center', fontSize: 15, color: '#666', marginTop: 20, fontWeight: '600', fontStyle: 'italic' }}>
            Des resultats meilleurs, plus rapidement
          </Text>
        </View>

        <View style={styles.emotionalBottom}>
          <AnimatedPressable onPress={handleEmotional2Next} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Continuer</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </AnimatedPressable>
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════
  // RENDER: LOADING SCREEN
  // ═══════════════════════════════════════════

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <DotSpinner />
        <Text style={styles.loadingTitle}>
          Elaboration de ton programme personnalise
        </Text>

        <View style={styles.loadingChecklist}>
          {[
            { id: 1, text: 'Creation de ton profil' },
            { id: 2, text: 'Calcul de tes besoins nutritionnels' },
            { id: 3, text: 'Finalisation de ton programme' },
          ].map((item) => {
            const isDone = loadingChecks.includes(item.id);
            const isLast = item.id === 3;
            const isInProgress = !isDone && loadingChecks.length === item.id - 1;
            return (
              <View key={item.id} style={styles.loadingCheckItem}>
                {isDone ? (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                ) : isInProgress ? (
                  <Ionicons name="time" size={22} color={Colors.primary} />
                ) : (
                  <View style={styles.loadingCheckEmpty} />
                )}
                <Text style={[
                  styles.loadingCheckText,
                  isDone && styles.loadingCheckTextDone,
                  !isDone && !isInProgress && styles.loadingCheckTextPending,
                ]}>
                  {item.text}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );

  // ═══════════════════════════════════════════
  // RENDER: SUMMARY
  // ═══════════════════════════════════════════

  const renderSummary = () => {
    const macros = computeMacros();

    return (
      <View style={styles.stepContent}>
        <View style={styles.heroCenter}>
          <View style={styles.summaryIconWrap}>
            <Ionicons name="trophy" size={48} color={Colors.primary} />
          </View>
        </View>
        <Text style={styles.summaryTitle}>
          Ton profil Big Boss est pret!
        </Text>
        <Text style={styles.summarySubtitle}>
          {name}, voici ton programme personnalise.
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Calories quotidiennes</Text>
          <CountUpText
            target={macros.calories}
            suffix=" kcal"
            style={styles.summaryBigNumber}
          />
        </View>

        <View style={styles.macroRow}>
          <View style={[styles.macroItem, { borderLeftWidth: 3, borderLeftColor: '#4CAF50' }]}>
            <Text style={styles.macroLabel}>Proteines</Text>
            <CountUpText target={macros.protein} suffix="g" style={styles.macroValue} />
          </View>
          <View style={[styles.macroItem, { borderLeftWidth: 3, borderLeftColor: Colors.primary }]}>
            <Text style={styles.macroLabel}>Glucides</Text>
            <CountUpText target={macros.carbs} suffix="g" style={styles.macroValue} />
          </View>
          <View style={[styles.macroItem, { borderLeftWidth: 3, borderLeftColor: '#FF9800' }]}>
            <Text style={styles.macroLabel}>Lipides</Text>
            <CountUpText target={macros.fat} suffix="g" style={styles.macroValue} />
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Split recommande</Text>
          <Text style={styles.summaryBigText}>{getSplitName()}</Text>
          <Text style={styles.summaryDetail}>{frequency}x/semaine - {duration}min</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Tes infos</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Poids actuel</Text>
            <Text style={styles.summaryValue}>{weight} kg</Text>
          </View>
          {targetWeight !== weight && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Poids cible</Text>
              <Text style={styles.summaryValue}>{targetWeight} kg</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Objectif</Text>
            <Text style={styles.summaryValue}>
              {GOALS.find((g) => g.value === goals[0])?.label || goals[0]}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Niveau</Text>
            <Text style={styles.summaryValue}>
              {LEVELS.find((l) => l.value === level)?.label || level}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════
  // PROGRESS BAR (only for data phase)
  // ═══════════════════════════════════════════

  const renderProgressBar = () => {
    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          {dataStep > 1 ? (
            <TouchableOpacity onPress={prevDataStep} style={styles.backButton} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={Colors.dark} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => goToPhase('intro', 'back')} style={styles.backButton} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={Colors.dark} />
            </TouchableOpacity>
          )}
          <Text style={styles.progressLabel}>{dataStep}/{TOTAL_DATA_STEPS}</Text>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth as any }]} />
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════

  // Splash phase
  if (phase === 'splash') {
    return (
      <SafeAreaView style={styles.splashSafeArea}>
        <StatusBar barStyle="light-content" />
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
        >
          {renderSplash()}
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Intro phase
  if (phase === 'intro') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.phaseBackRow}>
          <TouchableOpacity onPress={() => goToPhase('splash', 'back')} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark} />
          </TouchableOpacity>
        </View>
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
        >
          {renderIntro()}
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Emotional screens
  if (phase === 'emotional1') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.phaseBackRow}>
          <TouchableOpacity onPress={() => goToPhase('data', 'back')} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark} />
          </TouchableOpacity>
        </View>
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
        >
          {renderEmotional1()}
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (phase === 'emotional2') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.phaseBackRow}>
          <TouchableOpacity onPress={() => goToPhase('data', 'back')} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark} />
          </TouchableOpacity>
        </View>
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
        >
          {renderEmotional2()}
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Loading phase
  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {renderLoading()}
      </SafeAreaView>
    );
  }

  // Summary phase
  if (phase === 'summary') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            }}
          >
            {renderSummary()}
          </Animated.View>
        </ScrollView>
        <View style={styles.navRow}>
          <AnimatedPressable
            onPress={handleFinish}
            style={[styles.primaryBtn, styles.primaryBtnFull, submitting && styles.primaryBtnDisabled]}
            disabled={submitting}
          >
            {submitting ? (
              <Text style={styles.primaryBtnText}>Chargement...</Text>
            ) : (
              <>
                <Ionicons name="rocket" size={20} color={Colors.white} />
                <Text style={styles.primaryBtnText}>Commencer mon programme</Text>
              </>
            )}
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    );
  }

  // Data collection phase
  const isLastStep = dataStep === 12;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {renderProgressBar()}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            }}
          >
            {renderDataStep()}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.navRow}>
        <AnimatedPressable
          onPress={nextDataStep}
          style={[styles.primaryBtn, styles.primaryBtnFull, !canNext() && styles.primaryBtnDisabled]}
          disabled={!canNext()}
        >
          <Text style={styles.primaryBtnText}>
            {isLastStep ? 'Voir mon profil' : 'Suivant'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  android: { elevation: 2 },
  web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
}) as any;

const styles = StyleSheet.create({
  // ─── CONTAINERS ───
  container: {
    flex: 1,
    backgroundColor: '#F0F4F5',
  },
  splashSafeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // ─── SPLASH ───
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  splashTop: {
    height: SCREEN_HEIGHT * 0.45,
    position: 'relative',
    overflow: 'hidden',
  },
  splashGradient: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(200, 75, 49, 0.35)', // Terre Marrakech overlay
  },
  splashDiagonal: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 0,
    transform: [{ skewY: '-3deg' }],
  },
  splashContent: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 8,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  splashTitle: {
    fontSize: 30,
    fontFamily: Fonts.family.displayBold,
    color: Colors.dark,
    marginBottom: 14,
    lineHeight: 36,
  },
  splashDesc: {
    fontSize: 16,
    fontFamily: Fonts.family.regular,
    color: Colors.gray,
    lineHeight: 24,
    marginBottom: 28,
  },
  splashDots: {
    flexDirection: 'row',
    gap: 8,
  },
  splashDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  splashDotActive: {
    width: 28,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold, // Safran accent for active dot
  },
  splashBottom: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'android' ? 48 : 24,
    gap: 16,
    alignItems: 'center',
  },
  splashLoginLink: {
    padding: 8,
  },
  splashLoginText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: Fonts.weight.semiBold,
    textDecorationLine: 'underline',
  },

  // ─── INTRO ───
  introContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  introContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'android' ? 60 : 40,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  introGreeting: {
    fontSize: 28,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
    marginBottom: 16,
  },
  introDesc: {
    fontSize: 16,
    color: Colors.gray,
    lineHeight: 24,
    marginBottom: 16,
  },
  introDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 32,
    backgroundColor: Colors.white,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  introDurationText: {
    fontSize: 14,
    color: Colors.gray,
    fontWeight: Fonts.weight.semiBold,
  },
  introSteps: {
    gap: 0,
  },
  introStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 14,
    ...CARD_SHADOW,
  },
  introStepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introStepLabel: {
    fontSize: 12,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  introStepText: {
    fontSize: 16,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    marginTop: 2,
  },
  introStepLine: {
    width: 2,
    height: 16,
    backgroundColor: Colors.border,
    marginLeft: 37,
  },
  introBottom: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'android' ? 48 : 24,
    paddingTop: 16,
  },

  // ─── PROGRESS BAR ───
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 48 : 12,
    paddingBottom: 4,
    backgroundColor: '#F0F4F5',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  phaseBackRow: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 8,
    paddingBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.white,
  },
  progressLabel: {
    ...Typography.caption,
    color: Colors.gray,
    fontWeight: Fonts.weight.semiBold,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.white,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },

  // ─── SCROLL / STEP ───
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  stepContent: {
    paddingTop: 16,
  },
  heroCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  measureIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.primary,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 16,
    fontWeight: Fonts.weight.regular,
    color: Colors.gray,
    lineHeight: 22,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ─── INFO BOX ───
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F0',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark,
    lineHeight: 20,
  },

  // ─── TEXT INPUTS ───
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: Fonts.size.md,
    color: Colors.dark,
  },
  textInputLarge: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    maxWidth: 400,
  },
  dateInput: {
    flex: 1,
    textAlign: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: Fonts.size.md,
    color: Colors.dark,
  },
  dateInputYear: {
    flex: 1.5,
    textAlign: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: Fonts.size.md,
    color: Colors.dark,
  },

  // ─── CARD STYLES ───
  cardRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    width: '100%',
  },
  genderCard: {
    flex: 1,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    ...CARD_SHADOW,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF5F0',
  },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F4F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardIconCircleSelected: {
    backgroundColor: '#FFF5F0',
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    textAlign: 'center',
  },
  cardLabelSelected: {
    color: Colors.primary,
    fontWeight: Fonts.weight.bold,
  },
  cardCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // ─── NUMBER INPUT ───
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  numberBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primaryDim20,
  },
  numberBtnSmall: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberDisplay: {
    alignItems: 'center',
    minWidth: 100,
  },
  numberDisplaySmall: {
    alignItems: 'center',
    minWidth: 80,
  },
  numberValue: {
    fontSize: Fonts.size['4xl'],
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  numberValueSmall: {
    fontSize: Fonts.size['2xl'],
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  numberUnit: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.medium,
    color: Colors.gray,
    marginTop: 2,
  },
  bmiText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: Fonts.size.sm,
    color: Colors.gray,
    fontWeight: Fonts.weight.medium,
  },

  // ─── GOAL GRID ───
  goalGrid: {
    gap: 10,
    width: '100%',
  },
  goalCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    position: 'relative',
    gap: 14,
    ...CARD_SHADOW,
  },
  goalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconWrapSelected: {
    backgroundColor: '#FFF5F0',
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 4,
  },
  goalDesc: {
    fontSize: Fonts.size.xs,
    color: Colors.gray,
    textAlign: 'center',
  },
  goalOrderBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalOrderText: {
    fontSize: 12,
    fontWeight: Fonts.weight.bold,
    color: Colors.white,
  },

  // ─── LEVEL SLIDER ───
  sliderContainer: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sliderMainText: {
    fontSize: 24,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 4,
  },
  sliderSubText: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 32,
  },
  sliderTrack: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  sliderTaps: {
    width: '100%',
    height: 60,
    position: 'relative',
    marginTop: 12,
  },
  sliderTapTarget: {
    position: 'absolute',
    alignItems: 'center',
    width: 80,
    paddingTop: 4,
  },
  sliderDotMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.border,
    borderWidth: 2,
    borderColor: Colors.white,
    marginBottom: 6,
  },
  sliderDotMarkerActive: {
    backgroundColor: Colors.primary,
  },
  sliderTapLabel: {
    fontSize: 11,
    fontWeight: Fonts.weight.medium,
    color: Colors.lightGray,
    textAlign: 'center',
  },
  sliderTapLabelActive: {
    color: Colors.primary,
    fontWeight: Fonts.weight.bold,
  },

  // ─── LEVEL / EQUIPMENT CARDS ───
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    marginBottom: 12,
    ...CARD_SHADOW,
  },
  levelLabel: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  levelDesc: {
    fontSize: Fonts.size.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  equipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F4F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  equipIconWrapSelected: {
    backgroundColor: '#FFF5F0',
  },
  equipOrderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipOrderText: {
    fontSize: 13,
    fontWeight: Fonts.weight.bold,
    color: Colors.white,
  },
  equipEmptyBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },

  // ─── CIRCLE BUTTONS ───
  circleRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  circleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  circleText: {
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  circleTextSelected: {
    color: Colors.white,
  },

  // ─── CHIPS ───
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF5F0',
  },
  chipText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  chipTextSelected: {
    color: Colors.primary,
  },

  // ─── TIME CARDS ───
  timeCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    gap: 8,
    minWidth: 90,
  },

  // ─── DIET CARDS ───
  dietCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    minWidth: 60,
    gap: 6,
  },
  dietLabel: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    textAlign: 'center',
  },

  // ─── ACTIVITY CARDS ───
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    marginBottom: 10,
  },
  activityLabel: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  activityDesc: {
    fontSize: Fonts.size.xs,
    color: Colors.gray,
    marginTop: 2,
  },

  // ─── STRESS ───
  stressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stressEmoji: {
    fontSize: 28,
  },
  stressSlider: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  stressDot: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  stressDotActive: {
    backgroundColor: Colors.primaryLight,
  },
  stressDotCurrent: {
    backgroundColor: Colors.primary,
    height: 12,
    borderRadius: 6,
  },
  stressValue: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
    minWidth: 36,
    textAlign: 'right',
  },

  // ─── TARGET ───
  targetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 10,
    padding: 16,
    backgroundColor: '#FFF5F0',
    borderRadius: 14,
  },
  targetText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.primary,
  },
  targetHint: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: Fonts.size.sm,
    color: Colors.gray,
  },

  // ─── MOTIVATION ───
  motivationGrid: {
    gap: 10,
    width: '100%',
  },
  motivationCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    gap: 12,
    ...CARD_SHADOW,
  },
  motivationLabel: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    textAlign: 'center',
  },
  motivationCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
  },

  // ─── EMOTIONAL SCREENS ───
  emotionalContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  emotionalContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  emotionalTitle: {
    fontSize: 28,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 12,
  },
  emotionalSubtitle: {
    fontSize: 18,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 26,
  },
  emotionalCounter: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: Colors.white,
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: 20,
    ...CARD_SHADOW,
  },
  emotionalCounterLabel: {
    fontSize: 14,
    color: Colors.gray,
    fontWeight: Fonts.weight.medium,
  },
  emotionalCounterNumber: {
    fontSize: 48,
    fontWeight: Fonts.weight.bold,
    color: Colors.primary,
    marginVertical: 4,
  },
  emotionalWelcome: {
    fontSize: 18,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    textAlign: 'center',
  },
  emotionalBottom: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'android' ? 48 : 24,
    paddingTop: 16,
  },

  // ─── PROJECTION GRAPH ───
  projectionGraph: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    ...CARD_SHADOW,
  },
  projectionLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  projectionLabelTop: {
    fontSize: 12,
    color: Colors.gray,
    fontWeight: Fonts.weight.medium,
  },
  projectionLabelBottom: {
    fontSize: 12,
    color: Colors.gray,
    fontWeight: Fonts.weight.medium,
  },
  projectionArea: {
    gap: 20,
  },
  projectionLineContainer: {
    gap: 8,
  },
  projectionLine: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  projectionLineGray: {
    backgroundColor: Colors.lightGray,
  },
  projectionLineOrange: {
    backgroundColor: Colors.primary,
  },
  projectionLineDown: {
    width: '70%',
  },
  projectionLineUp: {
    width: '100%',
  },
  projectionLineLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  projectionLineLabel: {
    fontSize: 13,
    color: Colors.gray,
    fontWeight: Fonts.weight.medium,
  },
  projectionCaption: {
    fontSize: 16,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    textAlign: 'center',
  },

  // ─── LOADING ───
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
    textAlign: 'center',
    marginTop: 28,
    marginBottom: 36,
  },
  loadingChecklist: {
    width: '100%',
    gap: 16,
  },
  loadingCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  loadingCheckEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  loadingCheckText: {
    fontSize: 16,
    fontWeight: Fonts.weight.medium,
    color: Colors.dark,
  },
  loadingCheckTextDone: {
    color: Colors.success,
  },
  loadingCheckTextPending: {
    color: Colors.lightGray,
  },

  // ─── SUMMARY ───
  summaryIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: Fonts.size['2xl'],
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: Fonts.size.md,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 28,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...CARD_SHADOW,
  },
  summaryCardTitle: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryBigNumber: {
    fontSize: Fonts.size['4xl'],
    fontWeight: Fonts.weight.bold,
    color: Colors.primary,
  },
  summaryBigText: {
    fontSize: Fonts.size['2xl'],
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  summaryDetail: {
    fontSize: Fonts.size.sm,
    color: Colors.gray,
    marginTop: 4,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  macroItem: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...CARD_SHADOW,
  },
  macroLabel: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.gray,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F5',
  },
  summaryLabel: {
    fontSize: Fonts.size.base,
    color: Colors.gray,
  },
  summaryValue: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },

  // ─── NAVIGATION ───
  navRow: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'android' ? 48 : 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
    minWidth: 160,
    ...Platform.select({
      ios: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: `0 4px 8px ${Colors.primaryDim20}` },
    }),
  },
  primaryBtnFull: {
    width: '100%',
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.lightGray,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
      web: { boxShadow: 'none' },
    }),
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: Fonts.family.displaySemiBold,
    letterSpacing: 0.3,
    color: Colors.white,
  },
});
