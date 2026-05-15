import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import ProgrammeService, { Programme } from '@/services/programme.service';

const DAYS = [
  { id: 0, short: 'Lun', full: 'Lundi' },
  { id: 1, short: 'Mar', full: 'Mardi' },
  { id: 2, short: 'Mer', full: 'Mercredi' },
  { id: 3, short: 'Jeu', full: 'Jeudi' },
  { id: 4, short: 'Ven', full: 'Vendredi' },
  { id: 5, short: 'Sam', full: 'Samedi' },
  { id: 6, short: 'Dim', full: 'Dimanche' },
];

export default function ScheduleScreen() {
  const { programmeId } = useLocalSearchParams<{ programmeId: string }>();

  const [programme, setProgramme] = useState<Programme | null>(null);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalDays, setOriginalDays] = useState<Set<number>>(new Set());

  useFocusEffect(
    useCallback(() => {
      if (!programmeId) return;
      let active = true;
      setLoading(true);

      ProgrammeService.getActiveProgramme()
        .then((prog) => {
          if (!active || !prog) return;
          setProgramme(prog);

          // Extract current training pattern from upcoming Planned sessions.
          // The current week may be partial (some days already past), so we look at
          // the first FULL week — the largest day-count among the next 2 weeks of Planned.
          const sessions = prog.programmeSessions || [];
          const planned = sessions.filter((s: any) => s.status === 'Planned' || s.status === 0);
          const days = new Set<number>();
          if (planned.length > 0) {
            // Group days per week
            const byWeek = new Map<number, Set<number>>();
            planned.forEach((s: any) => {
              if (!byWeek.has(s.weekNumber)) byWeek.set(s.weekNumber, new Set());
              byWeek.get(s.weekNumber)!.add(s.dayOfWeek);
            });
            // Pick the week with the most distinct training days (= the regular pattern)
            let bestWeek: Set<number> | null = null;
            byWeek.forEach((dayset) => {
              if (!bestWeek || dayset.size > bestWeek.size) bestWeek = dayset;
            });
            if (bestWeek) (bestWeek as Set<number>).forEach((d) => days.add(d));
          }
          setSelectedDays(days);
          setOriginalDays(new Set(days));
        })
        .catch((err) => console.error('Failed to load programme:', err))
        .finally(() => { if (active) setLoading(false); });

      return () => { active = false; };
    }, [programmeId]),
  );

  const toggleDay = (dayId: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) {
        if (next.size <= 2) {
          Alert.alert('Minimum 2 jours', 'Tu dois garder au moins 2 jours d\'entraînement.');
          return prev;
        }
        next.delete(dayId);
      } else {
        if (next.size >= 6) {
          Alert.alert('Maximum 6 jours', 'Tu ne peux pas dépasser 6 jours d\'entraînement.');
          return prev;
        }
        next.add(dayId);
      }
      return next;
    });
  };

  const getSplitPreview = (count: number): string => {
    if (count <= 3) return 'Full Body';
    if (count === 4) return 'Upper/Lower';
    if (count === 5) return 'Push/Pull/Legs';
    return 'PPL x2';
  };

  const hasChanges = () => {
    if (selectedDays.size !== originalDays.size) return true;
    for (const d of selectedDays) {
      if (!originalDays.has(d)) return true;
    }
    return false;
  };

  const handleSave = async () => {
    if (!programmeId || !hasChanges()) return;
    setSaving(true);
    try {
      const days = Array.from(selectedDays).sort((a, b) => a - b);
      await ProgrammeService.reschedule(programmeId, days);

      if (Platform.OS === 'web') {
        window.alert('Planning mis à jour !');
      } else {
        Alert.alert('Planning mis à jour', 'Tes jours d\'entraînement ont été modifiés.');
      }
      router.back();
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de modifier le planning.');
    } finally {
      setSaving(false);
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

  const selectedCount = selectedDays.size;
  const newSplit = getSplitPreview(selectedCount);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier le planning</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Choisis tes jours d'entraînement
        </Text>

        {/* Day grid */}
        <View style={styles.daysGrid}>
          {DAYS.map((day) => {
            const isSelected = selectedDays.has(day.id);
            return (
              <TouchableOpacity
                key={day.id}
                style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                activeOpacity={0.7}
                onPress={() => toggleDay(day.id)}
              >
                <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                  {isSelected ? (
                    <Ionicons name="barbell" size={24} color={Colors.white} />
                  ) : (
                    <Ionicons name="bed-outline" size={24} color={Colors.lightGray} />
                  )}
                </View>
                <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                  {day.full}
                </Text>
                <Text style={[styles.dayType, isSelected && styles.dayTypeSelected]}>
                  {isSelected ? 'Entraînement' : 'Repos'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Preview */}
        <View style={styles.previewCard}>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Jours d'entraînement</Text>
            <Text style={styles.previewValue}>{selectedCount}x / semaine</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Split</Text>
            <Text style={styles.previewValue}>{newSplit}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Jours de repos</Text>
            <Text style={styles.previewValue}>{7 - selectedCount} jours</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Save button */}
      <View style={styles.saveBar}>
        <TouchableOpacity
          style={[styles.saveBtn, !hasChanges() && styles.saveBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={!hasChanges() || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveBtnText}>Enregistrer le planning</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
  },
  headerTitle: { ...Typography.h4, color: Colors.dark, flex: 1, textAlign: 'center' },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  saveBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 20 : 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  subtitle: {
    ...Typography.body,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 20,
  },

  daysGrid: {
    gap: 8,
    marginBottom: 20,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    gap: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryDim,
  },
  dayCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: Colors.primary,
  },
  dayName: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: 16,
    color: Colors.gray,
    flex: 1,
  },
  dayNameSelected: {
    color: Colors.dark,
  },
  dayType: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: 12,
    color: Colors.lightGray,
  },
  dayTypeSelected: {
    color: Colors.primary,
  },

  previewCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: Colors.shadowSoft,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 2,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  previewLabel: { ...Typography.body, color: Colors.gray },
  previewValue: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 14,
    color: Colors.dark,
  },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    shadowColor: Colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: Colors.lightGray,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: 0.8,
  },
});
