import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { useAuthStore } from '@/store/auth.store';
import type { Gender, UserGoal, DifficultyLevel, Language, UpdateProfileRequest } from '@/types/user.types';

const GENDER_OPTIONS: { value: Gender; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'male', label: 'Homme', icon: 'man-outline' },
  { value: 'female', label: 'Femme', icon: 'woman-outline' },
  { value: 'other', label: 'Autre', icon: 'person-outline' },
];

const GOAL_OPTIONS: { value: UserGoal; label: string }[] = [
  { value: 'BuildMuscle', label: 'Prise de masse' },
  { value: 'LoseFat', label: 'Perte de poids' },
  { value: 'BuildStrength', label: 'Force' },
  { value: 'Endurance', label: 'Endurance' },
  { value: 'Maintenance', label: 'Maintien' },
  { value: 'Recomposition', label: 'Recomposition' },
];

const LEVEL_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: 'Beginner', label: 'Débutant' },
  { value: 'Intermediate', label: 'Intermédiaire' },
  { value: 'Advanced', label: 'Avancé' },
  { value: 'Expert', label: 'Expert' },
];

const LANGUAGE_OPTIONS: { value: Language; label: string; native: string }[] = [
  { value: 'fr', label: 'Français', native: 'Français' },
  { value: 'darija', label: 'Darija', native: 'الدارجة' },
  { value: 'ar', label: 'Arabe', native: 'العربية' },
];

export default function ProfileEditScreen() {
  const params = useLocalSearchParams<{ focus?: string }>();
  const { profile, updateProfile, isLoading } = useAuthStore();

  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [goal, setGoal] = useState<UserGoal>('BuildMuscle');
  const [level, setLevel] = useState<DifficultyLevel>('Beginner');
  const [language, setLanguage] = useState<Language>('fr');
  const [notif, setNotif] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setWeight(profile.weightKg != null ? String(profile.weightKg) : '');
      setHeight(profile.heightCm != null ? String(profile.heightCm) : '');
      setGender(profile.gender);
      setGoal(profile.goal);
      setLevel(profile.level);
      setLanguage(profile.preferredLanguage);
      setNotif(profile.notificationsEnabled);
    }
  }, [profile]);

  const handleSave = async () => {
    const w = weight ? parseFloat(weight) : undefined;
    const h = height ? parseFloat(height) : undefined;

    if (w !== undefined && (isNaN(w) || w < 20 || w > 300)) {
      Alert.alert('Poids invalide', 'Entre 20 et 300 kg.');
      return;
    }
    if (h !== undefined && (isNaN(h) || h < 80 || h > 250)) {
      Alert.alert('Taille invalide', 'Entre 80 et 250 cm.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Nom requis', 'Entre ton nom.');
      return;
    }

    const payload: UpdateProfileRequest = {
      name: name.trim(),
      weightKg: w,
      heightCm: h,
      gender: gender ?? undefined,
      goal,
      level,
      preferredLanguage: language,
      notificationsEnabled: notif,
    };

    setSaving(true);
    try {
      await updateProfile(payload);
      if (Platform.OS === 'web') {
        router.back();
      } else {
        Alert.alert('Profil mis à jour', 'Tes modifications ont été enregistrées.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de sauvegarder.');
    } finally {
      setSaving(false);
    }
  };

  const submitDisabled = saving || isLoading;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Modifier le profil</Text>
            <Text style={styles.headerSubtitle}>عدّل معلوماتك</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Identité */}
          <Text style={styles.sectionTitle}>Identité</Text>
          <View style={styles.card}>
            <Field label="Nom complet">
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ton nom"
                placeholderTextColor={Colors.lightGray}
                autoFocus={params.focus === 'name'}
              />
            </Field>
            <Field label="Genre">
              <View style={styles.chipsRow}>
                {GENDER_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    icon={opt.icon}
                    active={gender === opt.value}
                    onPress={() => setGender(opt.value)}
                  />
                ))}
              </View>
            </Field>
          </View>

          {/* Mesures */}
          <Text style={styles.sectionTitle}>Mesures</Text>
          <View style={styles.card}>
            <Field label="Poids (kg)">
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="ex. 75"
                placeholderTextColor={Colors.lightGray}
                keyboardType="decimal-pad"
                autoFocus={params.focus === 'weight'}
              />
            </Field>
            <Field label="Taille (cm)">
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                placeholder="ex. 178"
                placeholderTextColor={Colors.lightGray}
                keyboardType="number-pad"
                autoFocus={params.focus === 'height'}
              />
            </Field>
          </View>

          {/* Objectif fitness */}
          <Text style={styles.sectionTitle}>Objectif fitness</Text>
          <View style={styles.card}>
            <Field label="Objectif">
              <View style={styles.chipsRow}>
                {GOAL_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    active={goal === opt.value}
                    onPress={() => setGoal(opt.value)}
                  />
                ))}
              </View>
            </Field>
            <Field label="Niveau">
              <View style={styles.chipsRow}>
                {LEVEL_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    active={level === opt.value}
                    onPress={() => setLevel(opt.value)}
                  />
                ))}
              </View>
            </Field>
          </View>

          {/* Préférences */}
          <Text style={styles.sectionTitle}>Préférences</Text>
          <View style={styles.card}>
            <Field label="Langue">
              <View style={styles.chipsRow}>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.native}
                    active={language === opt.value}
                    onPress={() => setLanguage(opt.value)}
                  />
                ))}
              </View>
            </Field>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Notifications</Text>
                <Text style={styles.toggleHint}>Reçois les rappels de séance et nouveaux contenus</Text>
              </View>
              <Switch
                value={notif}
                onValueChange={setNotif}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.white}
              />
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, submitDisabled && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={submitDisabled}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
                <Text style={styles.saveText}>Enregistrer</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon && (
        <Ionicons name={icon} size={14} color={active ? Colors.white : Colors.medium} />
      )}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 44 : 8,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  headerTitle: {
    ...Typography.h4,
    color: Colors.dark,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontFamily: Fonts.family.arRegular,
    fontSize: Fonts.size.xs,
    color: Colors.medium,
    textAlign: 'center',
    marginTop: -2,
  },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  sectionTitle: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.sm,
    color: Colors.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 14,
    marginLeft: 4,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },

  field: { gap: 8 },
  fieldLabel: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.sm,
    color: Colors.medium,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: Fonts.size.base,
    color: Colors.dark,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.sm,
    color: Colors.medium,
  },
  chipTextActive: { color: Colors.white },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleLabel: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.md,
    color: Colors.dark,
    marginBottom: 2,
  },
  toggleHint: {
    fontSize: Fonts.size.xs,
    color: Colors.gray,
    lineHeight: 16,
  },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveText: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.md,
    color: Colors.white,
    letterSpacing: 0.3,
  },
});
