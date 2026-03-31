import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { ProgressService, AddBodyStatRequest } from '@/services/progress.service';

interface MeasurementField {
  key: string;
  label: string;
}

const MEASUREMENT_FIELDS: MeasurementField[] = [
  { key: 'chest', label: 'Poitrine' },
  { key: 'shoulders', label: 'Epaules' },
  { key: 'neck', label: 'Cou' },
  { key: 'waist', label: 'Taille' },
  { key: 'hips', label: 'Hanches' },
  { key: 'leftArm', label: 'Bras G' },
  { key: 'rightArm', label: 'Bras D' },
  { key: 'leftThigh', label: 'Cuisse G' },
  { key: 'rightThigh', label: 'Cuisse D' },
  { key: 'leftCalf', label: 'Mollet G' },
  { key: 'rightCalf', label: 'Mollet D' },
];

export default function AddMeasurementScreen() {
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const updateMeasurement = (key: string, value: string) => {
    setMeasurements((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!weight.trim()) {
      Alert.alert('Erreur', 'Le poids est obligatoire.');
      return;
    }

    const weightVal = parseFloat(weight);
    if (isNaN(weightVal) || weightVal <= 0 || weightVal > 500) {
      Alert.alert('Erreur', 'Entre un poids valide.');
      return;
    }

    setSubmitting(true);
    try {
      const data: AddBodyStatRequest = {
        weightKg: weightVal,
      };

      if (bodyFat.trim()) {
        const bfVal = parseFloat(bodyFat);
        if (!isNaN(bfVal) && bfVal > 0 && bfVal < 100) {
          data.bodyFatPercent = bfVal;
        }
      }

      // Build measurements object, only non-empty values
      const meas: Record<string, number> = {};
      let hasMeasurements = false;
      for (const field of MEASUREMENT_FIELDS) {
        const val = measurements[field.key];
        if (val && val.trim()) {
          const numVal = parseFloat(val);
          if (!isNaN(numVal) && numVal > 0) {
            meas[field.key] = numVal;
            hasMeasurements = true;
          }
        }
      }
      if (hasMeasurements) {
        data.measurements = meas;
      }

      if (notes.trim()) {
        data.notes = notes.trim();
      }

      await ProgressService.addBodyStat(data);
      Alert.alert('Succes', 'Mesure enregistree!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Erreur', "Impossible d'enregistrer la mesure. Reessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nouvelle mesure</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Weight */}
          <Text style={styles.sectionLabel}>Poids *</Text>
          <View style={styles.inputRow}>
            <View style={[styles.inputCard, { flex: 1 }]}>
              <TextInput
                style={styles.inputLarge}
                placeholder="75.0"
                placeholderTextColor={Colors.lightGray}
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
            </View>
            <View style={styles.unitBadge}>
              <Text style={styles.unitText}>kg</Text>
            </View>
          </View>

          {/* Body Fat */}
          <Text style={styles.sectionLabel}>Masse grasse (optionnel)</Text>
          <View style={styles.inputRow}>
            <View style={[styles.inputCard, { flex: 1 }]}>
              <TextInput
                style={styles.input}
                placeholder="15"
                placeholderTextColor={Colors.lightGray}
                keyboardType="decimal-pad"
                value={bodyFat}
                onChangeText={setBodyFat}
              />
            </View>
            <View style={styles.unitBadge}>
              <Text style={styles.unitText}>%</Text>
            </View>
          </View>

          {/* Body Measurements */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
            Mensurations (optionnel)
          </Text>
          <Text style={styles.sectionHint}>Toutes les valeurs en cm</Text>

          <View style={styles.measurementsGrid}>
            {MEASUREMENT_FIELDS.map((field) => (
              <View key={field.key} style={styles.measurementInputWrap}>
                <Text style={styles.measurementInputLabel}>{field.label}</Text>
                <View style={styles.measurementInputCard}>
                  <TextInput
                    style={styles.measurementInput}
                    placeholder="--"
                    placeholderTextColor={Colors.lightGray}
                    keyboardType="decimal-pad"
                    value={measurements[field.key] || ''}
                    onChangeText={(v) => updateMeasurement(field.key, v)}
                  />
                  <Text style={styles.measurementUnit}>cm</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Notes */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Notes (optionnel)</Text>
          <View style={styles.inputCard}>
            <TextInput
              style={styles.textArea}
              placeholder="Ajoute des notes sur ta mesure..."
              placeholderTextColor={Colors.lightGray}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, submitting && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle-outline" size={22} color={Colors.white} />
            <Text style={styles.saveButtonText}>
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 8,
    paddingBottom: 12,
    backgroundColor: Colors.background,
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
  sectionLabel: {
    ...Typography.caption,
    color: Colors.gray,
    fontWeight: Fonts.weight.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 20,
    marginLeft: 4,
  },
  sectionHint: {
    fontSize: Fonts.size.xs,
    color: Colors.lightGray,
    marginBottom: 12,
    marginLeft: 4,
  },

  // Inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    color: Colors.dark,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputLarge: {
    fontSize: Fonts.size['2xl'],
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  unitBadge: {
    backgroundColor: Colors.primaryDim,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  unitText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.primary,
  },
  textArea: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.regular,
    color: Colors.dark,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 100,
  },

  // Measurements Grid
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  measurementInputWrap: {
    width: '48%',
    flexGrow: 1,
  },
  measurementInputLabel: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.medium,
    color: Colors.gray,
    marginBottom: 6,
    marginLeft: 4,
  },
  measurementInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  measurementInput: {
    flex: 1,
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.medium,
    color: Colors.dark,
    paddingVertical: 12,
  },
  measurementUnit: {
    fontSize: Fonts.size.sm,
    color: Colors.lightGray,
    fontWeight: Fonts.weight.medium,
  },

  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    marginTop: 30,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.white,
  },
});
