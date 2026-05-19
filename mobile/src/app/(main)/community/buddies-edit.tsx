import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  Platform, TextInput, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import BuddiesService, { GOAL_LABELS, SLOT_LABELS } from '@/services/buddies.service';

const MAROC_CITIES = [
  'Casablanca', 'Marrakech', 'Rabat', 'Tanger', 'Fès', 'Agadir', 'Meknès', 'Oujda', 'Kenitra', 'Tétouan',
];
const ALL_GOALS = Object.keys(GOAL_LABELS);
const ALL_SLOTS = Object.keys(SLOT_LABELS);

/**
 * Sprint 5.2 — Édition profil buddy (city, gym, goals, slots, bio, visibility).
 */
export default function BuddiesEditScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('Casablanca');
  const [gymName, setGymName] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const p = await BuddiesService.getMyProfile();
        if (p.hasProfile) {
          setBio(p.bio ?? '');
          setCity(p.city ?? 'Casablanca');
          setGymName(p.gymName ?? '');
          setGoals(p.goals ?? []);
          setSlots(p.availableSlots ?? []);
          setVisible(p.visible ?? true);
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const toggle = (arr: string[], v: string): string[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await BuddiesService.upsertMyProfile({
        bio, city, gymName: gymName || null, goals,
        availableSlots: slots, preferredLanguage: null, visible,
      });
      Alert.alert('✅ Sauvegardé', 'Ton profil buddy est à jour');
      router.back();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.error || 'Sauvegarde échouée');
    } finally {
      setSaving(false);
    }
  }, [bio, city, gymName, goals, slots, visible]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Buddy</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Visibilité */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Profil visible</Text>
              <Text style={styles.sublabel}>Permettre aux autres de te trouver</Text>
            </View>
            <Switch value={visible} onValueChange={setVisible} thumbColor={visible ? Colors.primary : Colors.lightGray} />
          </View>
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={styles.bioInput}
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder="Quelques mots sur toi (style training, motivation...)"
            placeholderTextColor={Colors.lightGray}
            maxLength={200}
          />
          <Text style={styles.charCount}>{bio.length}/200</Text>
        </View>

        {/* Ville */}
        <View style={styles.section}>
          <Text style={styles.label}>Ville</Text>
          <View style={styles.chipsRow}>
            {MAROC_CITIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, city === c && styles.chipActive]}
                onPress={() => setCity(c)}
              >
                <Text style={[styles.chipText, city === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Gym */}
        <View style={styles.section}>
          <Text style={styles.label}>Ta salle (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={gymName}
            onChangeText={setGymName}
            placeholder="ex: PowerHouse Casa Anfa"
            placeholderTextColor={Colors.lightGray}
          />
        </View>

        {/* Objectifs */}
        <View style={styles.section}>
          <Text style={styles.label}>Objectifs</Text>
          <View style={styles.chipsRow}>
            {ALL_GOALS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, goals.includes(g) && styles.chipActive]}
                onPress={() => setGoals(toggle(goals, g))}
              >
                <Text style={[styles.chipText, goals.includes(g) && styles.chipTextActive]}>
                  {GOAL_LABELS[g]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Créneaux */}
        <View style={styles.section}>
          <Text style={styles.label}>Créneaux dispo</Text>
          <View style={styles.chipsRow}>
            {ALL_SLOTS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, slots.includes(s) && styles.chipActive]}
                onPress={() => setSlots(toggle(slots, s))}
              >
                <Text style={[styles.chipText, slots.includes(s) && styles.chipTextActive]}>
                  {SLOT_LABELS[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 48 : 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { ...Typography.h4, color: Colors.dark },
  saveText: { color: Colors.primary, fontWeight: Fonts.weight.semiBold, fontSize: Fonts.size.md },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  section: { backgroundColor: Colors.white, padding: 14, borderRadius: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: Fonts.size.md, fontWeight: Fonts.weight.semiBold, color: Colors.dark },
  sublabel: { fontSize: Fonts.size.xs, color: Colors.gray, marginTop: 2 },
  bioInput: { minHeight: 70, fontSize: Fonts.size.base, color: Colors.dark, textAlignVertical: 'top' },
  charCount: { fontSize: 10, color: Colors.lightGray, textAlign: 'right' },
  input: { fontSize: Fonts.size.base, color: Colors.dark, paddingVertical: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: Colors.background },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontSize: Fonts.size.sm, color: Colors.dark },
  chipTextActive: { color: Colors.white, fontWeight: Fonts.weight.semiBold },
});
