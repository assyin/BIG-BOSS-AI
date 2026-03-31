import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { ProgressService, BodyStat, ProgressPhoto } from '@/services/progress.service';
import { useAuthStore } from '@/store/auth.store';

const GOAL_LABELS: Record<string, string> = {
  BuildMuscle: 'Prise de masse',
  LoseFat: 'Perte de graisse',
  BuildStrength: 'Force',
  Endurance: 'Endurance',
  Maintenance: 'Maintien',
  Recomposition: 'Recomposition',
};

const LEVEL_LABELS: Record<string, string> = {
  Beginner: 'Debutant',
  Intermediate: 'Intermediaire',
  Advanced: 'Avance',
  Expert: 'Expert',
};

const MEASUREMENT_LABELS: Record<string, string> = {
  chest: 'Poitrine',
  waist: 'Taille',
  hips: 'Hanches',
  leftArm: 'Bras G',
  rightArm: 'Bras D',
  leftThigh: 'Cuisse G',
  rightThigh: 'Cuisse D',
  leftCalf: 'Mollet G',
  rightCalf: 'Mollet D',
  shoulders: 'Epaules',
  neck: 'Cou',
};

export default function ReportScreen() {
  const [loading, setLoading] = useState(true);
  const [allStats, setAllStats] = useState<BodyStat[]>([]);
  const [latestStat, setLatestStat] = useState<BodyStat | null>(null);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const { profile, stats } = useAuthStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsList, latest, photoList] = await Promise.allSettled([
        ProgressService.getBodyStats(),
        ProgressService.getLatestBodyStat(),
        ProgressService.getProgressPhotos(),
      ]);
      if (statsList.status === 'fulfilled') setAllStats(statsList.value);
      if (latest.status === 'fulfilled') setLatestStat(latest.value);
      if (photoList.status === 'fulfilled') setPhotos(photoList.value);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const todayFormatted = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const firstStat = allStats.length > 0 ? allStats[allStats.length - 1] : null;
  const latestWeight = latestStat?.weightKg ?? null;
  const firstWeight = firstStat?.weightKg ?? null;
  const weightDiff =
    latestWeight != null && firstWeight != null
      ? latestWeight - firstWeight
      : null;

  const generateTextReport = useCallback(() => {
    const lines: string[] = [];
    const sep = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

    lines.push('');
    lines.push('  BIG BOSS FITNESS');
    lines.push('  Rapport de Progression');
    lines.push(sep);
    lines.push('');
    lines.push(`Date du rapport : ${todayFormatted}`);
    lines.push('');

    // Profile
    lines.push('PROFIL');
    lines.push(sep);
    lines.push(`Nom        : ${profile?.name ?? 'N/A'}`);
    lines.push(`Objectif   : ${GOAL_LABELS[profile?.goal ?? ''] ?? profile?.goal ?? 'N/A'}`);
    lines.push(`Niveau     : ${LEVEL_LABELS[profile?.level ?? ''] ?? profile?.level ?? 'N/A'}`);
    if (profile?.heightCm) lines.push(`Taille     : ${profile.heightCm} cm`);
    lines.push('');

    // Weight evolution
    lines.push('POIDS');
    lines.push(sep);
    if (latestWeight != null) {
      lines.push(`Actuel     : ${latestWeight.toFixed(1)} kg`);
    }
    if (firstWeight != null && allStats.length > 1) {
      lines.push(`Initial    : ${firstWeight.toFixed(1)} kg`);
      if (weightDiff != null) {
        const sign = weightDiff >= 0 ? '+' : '';
        lines.push(`Evolution  : ${sign}${weightDiff.toFixed(1)} kg`);
      }
    }
    if (latestStat?.bodyFatPercent != null) {
      lines.push(`Masse gr.  : ${latestStat.bodyFatPercent}%`);
    }
    if (latestWeight == null) {
      lines.push('Aucune mesure de poids enregistree.');
    }
    lines.push('');

    // Measurements
    if (latestStat?.measurements) {
      lines.push('MENSURATIONS ACTUELLES');
      lines.push(sep);
      for (const [key, label] of Object.entries(MEASUREMENT_LABELS)) {
        const val = (latestStat.measurements as any)[key];
        if (val != null && val > 0) {
          const firstVal = firstStat?.measurements
            ? (firstStat.measurements as any)[key]
            : null;
          let evolStr = '';
          if (firstVal != null && firstVal > 0 && allStats.length > 1) {
            const diff = val - firstVal;
            const sign = diff >= 0 ? '+' : '';
            evolStr = ` (${sign}${diff.toFixed(1)} cm)`;
          }
          lines.push(`${label.padEnd(12)}: ${val} cm${evolStr}`);
        }
      }
      lines.push('');
    }

    // Performances
    lines.push('PERFORMANCES');
    lines.push(sep);
    lines.push(`Seances totales        : ${stats?.totalSessions ?? 0}`);
    lines.push(`Volume total           : ${stats?.totalVolumeKg ? `${(stats.totalVolumeKg / 1000).toFixed(1)}k kg` : '0 kg'}`);
    lines.push(`Exercices completes    : ${stats?.totalExercisesCompleted ?? 0}`);
    lines.push(`Records personnels     : ${stats?.personalRecordsCount ?? 0}`);
    lines.push(`Serie actuelle         : ${stats?.currentStreak ?? 0} jours`);
    lines.push(`Meilleure serie        : ${stats?.longestStreak ?? 0} jours`);
    lines.push('');

    // Photos
    lines.push('PHOTOS DE PROGRESSION');
    lines.push(sep);
    lines.push(`Photos totales : ${photos.length}`);
    if (photos.length > 0) {
      const oldest = photos[photos.length - 1];
      const newest = photos[0];
      lines.push(`Premiere photo : ${formatDate(oldest.recordedAt)}`);
      lines.push(`Derniere photo : ${formatDate(newest.recordedAt)}`);
    }
    lines.push('');

    lines.push(sep);
    lines.push('Genere par Big Boss Fitness');
    lines.push(`${todayFormatted}`);

    return lines.join('\n');
  }, [profile, stats, latestStat, firstStat, allStats, photos, latestWeight, firstWeight, weightDiff, todayFormatted]);

  const handleShare = async () => {
    try {
      const text = generateTextReport();
      await Share.share({
        message: text,
        title: 'Big Boss Fitness - Rapport de Progression',
      });
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        Alert.alert('Erreur', 'Impossible de partager le rapport.');
      }
    }
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k`;
    return vol.toLocaleString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rapport</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rapport</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Report Header */}
        <View style={styles.reportHeader}>
          <View style={styles.reportIconBox}>
            <Ionicons name="document-text-outline" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.reportTitle}>Big Boss Fitness</Text>
          <Text style={styles.reportSubtitle}>Rapport de Progression</Text>
          <Text style={styles.reportDate}>{todayFormatted}</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Profil</Text>
          </View>
          <View style={styles.sectionBody}>
            <ReportRow label="Nom" value={profile?.name ?? 'N/A'} />
            <ReportRow
              label="Objectif"
              value={GOAL_LABELS[profile?.goal ?? ''] ?? profile?.goal ?? 'N/A'}
            />
            <ReportRow
              label="Niveau"
              value={LEVEL_LABELS[profile?.level ?? ''] ?? profile?.level ?? 'N/A'}
            />
            {profile?.heightCm && (
              <ReportRow label="Taille" value={`${profile.heightCm} cm`} />
            )}
          </View>
        </View>

        {/* Weight Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="scale-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Poids</Text>
          </View>
          <View style={styles.sectionBody}>
            {latestWeight != null ? (
              <>
                <ReportRow label="Actuel" value={`${latestWeight.toFixed(1)} kg`} highlight />
                {firstWeight != null && allStats.length > 1 && (
                  <>
                    <ReportRow label="Initial" value={`${firstWeight.toFixed(1)} kg`} />
                    {weightDiff != null && (
                      <ReportRow
                        label="Evolution"
                        value={`${weightDiff >= 0 ? '+' : ''}${weightDiff.toFixed(1)} kg`}
                        valueColor={weightDiff <= 0 ? Colors.success : Colors.warning}
                      />
                    )}
                  </>
                )}
                {latestStat?.bodyFatPercent != null && (
                  <ReportRow label="Masse grasse" value={`${latestStat.bodyFatPercent}%`} />
                )}
              </>
            ) : (
              <Text style={styles.noData}>Aucune mesure enregistree</Text>
            )}
          </View>
        </View>

        {/* Measurements */}
        {latestStat?.measurements && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="resize-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Mensurations</Text>
            </View>
            <View style={styles.sectionBody}>
              {Object.entries(MEASUREMENT_LABELS).map(([key, label]) => {
                const val = (latestStat.measurements as any)?.[key];
                if (!val || val <= 0) return null;
                const firstVal = firstStat?.measurements
                  ? (firstStat.measurements as any)[key]
                  : null;
                let evolStr = '';
                if (firstVal != null && firstVal > 0 && allStats.length > 1) {
                  const diff = val - firstVal;
                  evolStr = ` (${diff >= 0 ? '+' : ''}${diff.toFixed(1)})`;
                }
                return (
                  <ReportRow key={key} label={label} value={`${val} cm${evolStr}`} />
                );
              })}
            </View>
          </View>
        )}

        {/* Performance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="barbell-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Performances</Text>
          </View>
          <View style={styles.sectionBody}>
            <ReportRow label="Seances totales" value={`${stats?.totalSessions ?? 0}`} />
            <ReportRow
              label="Volume total"
              value={`${formatVolume(stats?.totalVolumeKg ?? 0)} kg`}
            />
            <ReportRow
              label="Exercices completes"
              value={`${stats?.totalExercisesCompleted ?? 0}`}
            />
            <ReportRow
              label="Records personnels"
              value={`${stats?.personalRecordsCount ?? 0}`}
              highlight
            />
            <ReportRow
              label="Serie actuelle"
              value={`${stats?.currentStreak ?? 0} jours`}
            />
            <ReportRow
              label="Meilleure serie"
              value={`${stats?.longestStreak ?? 0} jours`}
            />
          </View>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="camera-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Photos de progression</Text>
          </View>
          <View style={styles.sectionBody}>
            <ReportRow label="Photos totales" value={`${photos.length}`} />
            {photos.length > 0 && (
              <>
                <ReportRow
                  label="Premiere photo"
                  value={formatDate(photos[photos.length - 1].recordedAt)}
                />
                <ReportRow
                  label="Derniere photo"
                  value={formatDate(photos[0].recordedAt)}
                />
              </>
            )}
          </View>
        </View>

        {/* Action buttons */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          activeOpacity={0.85}
        >
          <Ionicons name="share-outline" size={22} color={Colors.white} />
          <Text style={styles.shareButtonText}>Partager</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exportButton}
          onPress={() =>
            Alert.alert(
              'Export PDF',
              'L\'export PDF necessite un build EAS avec expo-print. Utilise le bouton "Partager" pour envoyer le rapport en texte.'
            )
          }
          activeOpacity={0.85}
        >
          <Ionicons name="download-outline" size={22} color={Colors.primary} />
          <Text style={styles.exportButtonText}>Exporter PDF</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Genere par Big Boss Fitness
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReportRow({
  label,
  value,
  highlight = false,
  valueColor,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={rrStyles.row}>
      <Text style={rrStyles.label}>{label}</Text>
      <Text
        style={[
          rrStyles.value,
          highlight && rrStyles.valueHighlight,
          valueColor ? { color: valueColor } : undefined,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const rrStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  label: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.regular,
    color: Colors.gray,
    flex: 1,
  },
  value: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    textAlign: 'right',
  },
  valueHighlight: {
    color: Colors.primary,
    fontWeight: Fonts.weight.bold,
  },
});

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
    paddingTop: Platform.OS === 'android' ? 44 : 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Report header
  reportHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  reportIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  reportTitle: {
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  reportSubtitle: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.medium,
    color: Colors.gray,
    marginTop: 2,
  },
  reportDate: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.regular,
    color: Colors.lightGray,
    marginTop: 6,
  },

  // Sections
  section: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.primaryDim,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  noData: {
    ...Typography.body,
    color: Colors.lightGray,
    paddingVertical: 12,
    textAlign: 'center',
  },

  // Buttons
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    marginTop: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  shareButtonText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.white,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryDim,
  },
  exportButtonText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.primary,
  },
  footer: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.regular,
    color: Colors.lightGray,
    textAlign: 'center',
    marginTop: 20,
  },
});
