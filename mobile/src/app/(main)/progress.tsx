import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  FlatList,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { ProgressService, BodyStat, ProgressPhoto, MuscleBalanceResponse, PhotoAnalysis } from '@/services/progress.service';
import { useAuthStore } from '@/store/auth.store';
import { SimpleChart, ChartDataPoint } from '@/components/ui/SimpleChart';
import { LineChart, LineChartDataPoint } from '@/components/ui/LineChart';
import { calcIMC, calcFFMI, targetWeightForImc } from '@/utils/body-metrics';
import { MuscleRadarChart } from '@/components/charts/MuscleRadarChart';
import { PhotoAnalysisCard } from '@/components/progress/PhotoAnalysisCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_GAP = 10;
const PHOTO_SIZE = (SCREEN_WIDTH - 40 - PHOTO_GAP) / 2;

type TabKey = 'mesures' | 'photos' | 'performances';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'mesures', label: 'Mesures' },
  { key: 'photos', label: 'Photos' },
  { key: 'performances', label: 'Performances' },
];

const POSE_TYPES = [
  { key: 'Face', label: 'Face', icon: 'person-outline' as const },
  { key: 'Profil', label: 'Profil', icon: 'body-outline' as const },
  { key: 'Dos', label: 'Dos', icon: 'person-outline' as const },
];

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


// 1RM data will come from real sessions when enough data is available

export default function ProgressScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('mesures');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [latestStat, setLatestStat] = useState<BodyStat | null>(null);
  const [allStats, setAllStats] = useState<BodyStat[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [muscleBalance, setMuscleBalance] = useState<MuscleBalanceResponse | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [addingPhoto, setAddingPhoto] = useState(false);
  // Sprint 4.4 — Claude Vision photo analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PhotoAnalysis | null>(null);
  const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
  const { stats, loadStats, profile } = useAuthStore();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [latest, statsList, photoList, muscle] = await Promise.allSettled([
        ProgressService.getLatestBodyStat(),
        ProgressService.getBodyStats(),
        ProgressService.getProgressPhotos(),
        ProgressService.getMuscleBalance(30),
      ]);
      if (latest.status === 'fulfilled') setLatestStat(latest.value);
      else setLatestStat(null);
      if (statsList.status === 'fulfilled') setAllStats(statsList.value);
      if (photoList.status === 'fulfilled') setPhotos(photoList.value);
      if (muscle.status === 'fulfilled') setMuscleBalance(muscle.value);
      // Also refresh user stats for performances tab
      loadStats();
    } catch {
      // silently fail, show empty state
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload when screen comes into focus (e.g. after adding a measurement)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleAddPhoto = useCallback(() => {
    Alert.alert('Ajouter une photo', 'Choisis une source', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Camera',
        onPress: async () => {
          try {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Permission requise', "Autorise l'acces a la camera pour prendre une photo.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.7,
              base64: true,
              allowsEditing: true,
              aspect: [3, 4],
            });
            if (!result.canceled && result.assets?.[0]?.base64) {
              setSelectedImageBase64(result.assets[0].base64);
              setPhotoModalVisible(true);
            }
          } catch {
            Alert.alert('Erreur', 'Impossible d\'ouvrir la camera.');
          }
        },
      },
      {
        text: 'Galerie',
        onPress: async () => {
          try {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.7,
              base64: true,
              allowsEditing: true,
              aspect: [3, 4],
            });
            if (!result.canceled && result.assets?.[0]?.base64) {
              setSelectedImageBase64(result.assets[0].base64);
              setPhotoModalVisible(true);
            }
          } catch {
            Alert.alert('Erreur', 'Impossible d\'ouvrir la galerie.');
          }
        },
      },
    ]);
  }, []);

  // Sprint 4.4 — Analyser une photo avec Claude Vision IA
  const handleAnalyzeWithAI = useCallback(async () => {
    Alert.alert('Analyse IA', "Choisis une photo pour l'analyse Body Fat + Masse musculaire", [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Camera',
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Permission requise', "Autorise l'acces a la camera.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.6,
            base64: true,
            allowsEditing: true,
            aspect: [3, 4],
          });
          if (!result.canceled && result.assets?.[0]?.base64) {
            await runAnalysis(result.assets[0].base64, 'front');
          }
        },
      },
      {
        text: 'Galerie',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.6,
            base64: true,
            allowsEditing: true,
            aspect: [3, 4],
          });
          if (!result.canceled && result.assets?.[0]?.base64) {
            await runAnalysis(result.assets[0].base64, 'front');
          }
        },
      },
    ]);
  }, []);

  const runAnalysis = useCallback(async (base64: string, poseType: string) => {
    try {
      setAnalyzing(true);
      // 1. Créer d'abord la photo (pour avoir un photoId)
      const photo = await ProgressService.addProgressPhoto({
        photoBase64: base64,
        caption: `Analyse IA ${poseType}`,
      });
      // 2. Lancer l'analyse Claude Vision
      const analysis = await ProgressService.analyzePhoto(photo.id, base64);
      setAnalysisResult(analysis);
      setAnalysisModalVisible(true);
      // 3. Recharger les photos
      await loadData();
    } catch (e: any) {
      Alert.alert('Erreur IA', e?.response?.data?.error || e?.message || "Analyse échouée. Réessaie.");
    } finally {
      setAnalyzing(false);
    }
  }, [loadData]);

  const handleConfirmPhoto = useCallback(async (poseType: string) => {
    if (!selectedImageBase64) return;
    try {
      setAddingPhoto(true);
      await ProgressService.addProgressPhoto({
        photoBase64: selectedImageBase64,
        caption: poseType,
      });
      setPhotoModalVisible(false);
      setSelectedImageBase64(null);
      Alert.alert('Photo ajoutee', 'Ta photo de progression a ete sauvegardee.');
      await loadData();
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de sauvegarder la photo.');
    } finally {
      setAddingPhoto(false);
    }
  }, [selectedImageBase64, loadData]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderMesures = () => {
    const weight = latestStat?.weightKg;
    const bodyFat = latestStat?.bodyFatPercent;
    const measurements = latestStat?.measurements;
    const lastDate = latestStat?.recordedAt;
    const heightCm = profile?.heightCm ?? null;

    const imc = weight && heightCm ? calcIMC(weight, heightCm) : null;
    const ffmi = weight && heightCm && bodyFat != null ? calcFFMI(weight, heightCm, bodyFat) : null;
    const targetWeight = heightCm ? targetWeightForImc(heightCm, 22) : null;

    return (
      <View>
        {/* Current Weight */}
        <View style={styles.weightCard}>
          <View style={styles.weightCardHeader}>
            <View style={styles.weightIconBox}>
              <Ionicons name="scale-outline" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.weightCardTitle}>Poids actuel</Text>
          </View>
          <View style={styles.weightRow}>
            <Text style={styles.weightValue}>{weight ? weight.toFixed(1) : '--'}</Text>
            <Text style={styles.weightUnit}>kg</Text>
            {bodyFat != null && (
              <View style={styles.bodyFatBadge}>
                <Text style={styles.bodyFatText}>{bodyFat}% MG</Text>
              </View>
            )}
          </View>
          {lastDate && (
            <Text style={styles.lastMeasureDate}>
              Derniere mesure : {formatDate(lastDate)}
            </Text>
          )}
          {!latestStat && (
            <Text style={styles.emptyText}>Aucune mesure enregistree</Text>
          )}
        </View>

        {/* IMC + FFMI cards (Sprint 3.4) */}
        {(imc || ffmi) && (
          <View style={styles.metricsRow}>
            {imc && (
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>IMC</Text>
                  <View style={[styles.metricBadge, { backgroundColor: imc.color + '22' }]}>
                    <Text style={[styles.metricBadgeText, { color: imc.color }]}>{imc.label}</Text>
                  </View>
                </View>
                <Text style={[styles.metricValue, { color: imc.color }]}>{imc.value}</Text>
                <Text style={styles.metricHint}>
                  {targetWeight ? `Cible : ${targetWeight} kg (IMC 22)` : 'kg/m²'}
                </Text>
              </View>
            )}
            {ffmi && (
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>FFMI</Text>
                  <View style={[styles.metricBadge, { backgroundColor: ffmi.color + '22' }]}>
                    <Text style={[styles.metricBadgeText, { color: ffmi.color }]}>{ffmi.label}</Text>
                  </View>
                </View>
                <Text style={[styles.metricValue, { color: ffmi.color }]}>{ffmi.value}</Text>
                <Text style={styles.metricHint}>Masse maigre normalisée</Text>
              </View>
            )}
          </View>
        )}

        {!imc && weight && !heightCm && (
          <TouchableOpacity
            style={styles.metricsHintCard}
            onPress={() => router.push('/(main)/profile-edit' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.metricsHintText}>
              Ajoute ta taille dans le profil pour voir ton IMC et FFMI
            </Text>
          </TouchableOpacity>
        )}

        {imc && !ffmi && weight && heightCm && (
          <TouchableOpacity
            style={styles.metricsHintCard}
            onPress={() => router.push('/(main)/progress/add-measurement' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.metricsHintText}>
              Renseigne ton % de masse grasse pour calculer le FFMI
            </Text>
          </TouchableOpacity>
        )}

        {/* Weight History Trend */}
        {allStats.length > 1 && (
          <View style={styles.trendCard}>
            <Text style={styles.trendTitle}>Historique du poids</Text>
            <SimpleChart
              data={allStats.slice(0, 10).reverse().map((stat): ChartDataPoint => ({
                label: new Date(stat.recordedAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                }),
                value: stat.weightKg,
              }))}
              barColor={Colors.primary}
              highlightLastBar={true}
              height={120}
              showValues={true}
            />
          </View>
        )}

        {/* Measurements */}
        {measurements && (
          <View style={styles.measurementsCard}>
            <Text style={styles.measurementsTitle}>Mensurations</Text>
            {Object.entries(MEASUREMENT_LABELS).map(([key, label]) => {
              const value = (measurements as any)[key];
              if (!value) return null;
              return (
                <View key={key} style={styles.measurementRow}>
                  <Text style={styles.measurementLabel}>{label}</Text>
                  <Text style={styles.measurementValue}>{value} cm</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Add Measurement Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(main)/progress/add-measurement' as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={22} color={Colors.white} />
          <Text style={styles.primaryButtonText}>Nouvelle mesure</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPhotos = () => {
    if (photos.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="camera-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Prends ta premiere photo!</Text>
          <Text style={styles.emptySubtitle}>
            Suis ta transformation visuelle en ajoutant des photos regulierement.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleAddPhoto} activeOpacity={0.85}>
            <Ionicons name="camera-outline" size={22} color={Colors.white} />
            <Text style={styles.primaryButtonText}>Ajouter photo</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
        <View style={styles.photoGrid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoItem}>
              {photo.photoUrl ? (
                <Image
                  source={{ uri: photo.photoUrl }}
                  style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 12 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="image-outline" size={32} color={Colors.lightGray} />
                </View>
              )}
              <Text style={styles.photoDate}>{formatDate(photo.recordedAt)}</Text>
              {photo.poseType && (
                <Text style={styles.photoCaption} numberOfLines={1}>
                  {photo.poseType}
                </Text>
              )}
              {photo.caption && (
                <Text style={styles.photoCaption} numberOfLines={1}>
                  {photo.caption}
                </Text>
              )}
            </View>
          ))}
        </View>
        {photos.length >= 2 && (
          <TouchableOpacity
            style={styles.compareButton}
            onPress={() => router.push('/(main)/progress/compare' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="git-compare-outline" size={22} color={Colors.primary} />
            <Text style={styles.compareButtonText}>Comparer</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.primaryButton} onPress={handleAddPhoto} activeOpacity={0.85}>
          <Ionicons name="camera-outline" size={22} color={Colors.white} />
          <Text style={styles.primaryButtonText}>Ajouter photo</Text>
        </TouchableOpacity>
        {/* Sprint 4.4 — Bouton Analyse IA Premium */}
        <TouchableOpacity
          style={styles.aiAnalysisButton}
          onPress={handleAnalyzeWithAI}
          activeOpacity={0.85}
          disabled={analyzing}
        >
          {analyzing ? (
            <ActivityIndicator size="small" color={Colors.gold} />
          ) : (
            <Ionicons name="sparkles" size={22} color={Colors.gold} />
          )}
          <Text style={styles.aiAnalysisButtonText}>
            {analyzing ? 'Analyse en cours…' : 'Analyser avec IA 🤖'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPerformances = () => {
    const totalSessions = stats?.totalSessions ?? 0;
    const totalVolume = stats?.totalVolumeKg ?? 0;
    const currentStreak = stats?.currentStreak ?? 0;
    const longestStreak = stats?.longestStreak ?? 0;
    const totalExercises = stats?.totalExercisesCompleted ?? 0;
    const prCount = stats?.personalRecordsCount ?? 0;

    const formatVolume = (vol: number) => {
      if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k`;
      return vol.toLocaleString();
    };

    const radarData = muscleBalance?.muscles
      ?.filter((m) => m.sets > 0)
      .map((m) => ({ label: m.labelFr, value: m.volumeRatio })) ?? [];

    return (
      <View>
        {/* Sprint 3.4 — Radar musculaire */}
        <View style={styles.radarCard}>
          <View style={styles.radarHeader}>
            <Text style={styles.radarTitle}>Équilibre musculaire</Text>
            <Text style={styles.radarSubtitle}>30 derniers jours</Text>
          </View>
          {radarData.length >= 3 ? (
            <>
              <MuscleRadarChart data={radarData} size={280} />
              <View style={styles.radarFooter}>
                <View style={styles.radarStat}>
                  <Text style={styles.radarStatValue}>{muscleBalance?.totalSets ?? 0}</Text>
                  <Text style={styles.radarStatLabel}>Sets totaux</Text>
                </View>
                <View style={styles.radarStat}>
                  <Text style={styles.radarStatValue}>
                    {muscleBalance ? Math.round(muscleBalance.totalVolume).toLocaleString() : 0}
                  </Text>
                  <Text style={styles.radarStatLabel}>Volume (kg·reps)</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.radarEmpty}>
              <Ionicons name="analytics-outline" size={40} color={Colors.lightGray} />
              <Text style={styles.radarEmptyText}>
                Complète au moins 3 groupes musculaires{'\n'}
                pour voir ton radar
              </Text>
            </View>
          )}
        </View>

        {/* Volume Card */}
        <View style={styles.volumeCard}>
          <Text style={styles.volumeTitle}>Volume total</Text>
          <View style={styles.volumeComparison}>
            <View style={styles.volumeItem}>
              <Text style={styles.volumeLabel}>Total souleve</Text>
              <Text style={styles.volumeValue}>{formatVolume(totalVolume)} kg</Text>
            </View>
            <View style={styles.volumeDivider} />
            <View style={styles.volumeItem}>
              <Text style={styles.volumeLabel}>Exercices completes</Text>
              <Text style={styles.volumeValue}>{totalExercises}</Text>
            </View>
          </View>
        </View>

        {/* Sessions Count */}
        <View style={styles.sessionsCountCard}>
          <View style={styles.sessionsCountLeft}>
            <View style={styles.sessionsCountIconBox}>
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.sessionsCountLabel}>Seances totales</Text>
              <Text style={styles.sessionsCountSub}>Depuis le debut</Text>
            </View>
          </View>
          <Text style={styles.sessionsCountValue}>{totalSessions}</Text>
        </View>

        {/* Streaks */}
        <Text style={styles.prTitle}>Regularite</Text>
        <View style={styles.prItem}>
          <View style={styles.prLeft}>
            <View style={styles.prRank}>
              <Ionicons name="flame" size={16} color={Colors.warning} />
            </View>
            <View>
              <Text style={styles.prExercise}>Serie actuelle</Text>
              <Text style={styles.prDate}>Jours consecutifs</Text>
            </View>
          </View>
          <View style={styles.prRight}>
            <Text style={styles.prWeight}>{currentStreak}</Text>
            <Text style={styles.prUnit}>j</Text>
          </View>
        </View>
        <View style={styles.prItem}>
          <View style={styles.prLeft}>
            <View style={styles.prRank}>
              <Ionicons name="trophy" size={16} color={Colors.warning} />
            </View>
            <View>
              <Text style={styles.prExercise}>Meilleure serie</Text>
              <Text style={styles.prDate}>Record personnel</Text>
            </View>
          </View>
          <View style={styles.prRight}>
            <Text style={styles.prWeight}>{longestStreak}</Text>
            <Text style={styles.prUnit}>j</Text>
          </View>
        </View>
        <View style={styles.prItem}>
          <View style={styles.prLeft}>
            <View style={styles.prRank}>
              <Ionicons name="star" size={16} color={Colors.warning} />
            </View>
            <View>
              <Text style={styles.prExercise}>Records personnels</Text>
              <Text style={styles.prDate}>Nombre total de PRs</Text>
            </View>
          </View>
          <View style={styles.prRight}>
            <Text style={styles.prWeight}>{prCount}</Text>
          </View>
        </View>

        {/* Volume chart from real weight data */}
        {allStats.length > 1 && (
          <>
            <Text style={[styles.prTitle, { marginTop: 24 }]}>Evolution du poids</Text>
            <View style={styles.rmChartCard}>
              <LineChart
                title="Poids (kg)"
                data={allStats.slice(0, 12).reverse().map((s): LineChartDataPoint => ({
                  label: new Date(s.recordedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                  value: s.weightKg,
                }))}
                color={Colors.primary}
                height={180}
                unit=" kg"
              />
            </View>
          </>
        )}

        {/* 1RM Curves - placeholder */}
        <Text style={[styles.prTitle, { marginTop: 24 }]}>Courbes 1RM</Text>
        <Text style={styles.rmSubtitle}>
          Les courbes 1RM seront disponibles apres quelques seances
        </Text>

        <View style={styles.rmPlaceholder}>
          <Ionicons name="analytics-outline" size={48} color={Colors.lightGray} />
          <Text style={styles.rmPlaceholderText}>
            Continue tes seances pour voir{'\n'}tes courbes de progression
          </Text>
        </View>

        {!stats && (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text style={styles.emptyText}>Aucune donnee de performance disponible</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Ma Progression</Text>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => router.push('/(main)/progress/report' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
            <Text style={styles.reportButtonText}>Rapport</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing && (
          <View style={{ paddingVertical: 12, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}

        {/* Tab Selector */}
        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'mesures' && renderMesures()}
        {activeTab === 'photos' && renderPhotos()}
        {activeTab === 'performances' && renderPerformances()}
      </ScrollView>

      {/* Sprint 4.4 — Modal Analyse IA Photo */}
      <Modal
        visible={analysisModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setAnalysisModalVisible(false)}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.aiModalHeader}>
            <Text style={styles.aiModalTitle}>Analyse IA Premium</Text>
            <TouchableOpacity onPress={() => setAnalysisModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors.dark} />
            </TouchableOpacity>
          </View>
          {analysisResult && <PhotoAnalysisCard analysis={analysisResult} />}
        </SafeAreaView>
      </Modal>

      {/* Pose Selection Modal */}
      <Modal
        visible={photoModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setPhotoModalVisible(false);
          setSelectedImageBase64(null);
        }}
      >
        <View style={styles.poseModalOverlay}>
          <View style={styles.poseModalContent}>
            <Text style={styles.poseModalTitle}>Choisis la pose</Text>
            <Text style={styles.poseModalSubtitle}>
              Selectionne le type de photo pour un meilleur suivi
            </Text>

            <View style={styles.poseOptions}>
              {POSE_TYPES.map((pose) => (
                <TouchableOpacity
                  key={pose.key}
                  style={styles.poseOption}
                  onPress={() => handleConfirmPhoto(pose.key)}
                  activeOpacity={0.7}
                  disabled={addingPhoto}
                >
                  <View style={styles.poseIconBox}>
                    <Ionicons name={pose.icon} size={28} color={Colors.primary} />
                  </View>
                  <Text style={styles.poseLabel}>{pose.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {addingPhoto && (
              <View style={styles.poseLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.poseLoadingText}>Envoi en cours...</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.poseCancelButton}
              onPress={() => {
                setPhotoModalVisible(false);
                setSelectedImageBase64(null);
              }}
              disabled={addingPhoto}
            >
              <Text style={styles.poseCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.dark,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryDim,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reportButtonText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.primary,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.gray,
  },
  tabTextActive: {
    color: Colors.white,
  },

  // Weight Card
  weightCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  weightCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  weightIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightCardTitle: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  weightValue: {
    fontSize: Fonts.size['4xl'],
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  weightUnit: {
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.medium,
    color: Colors.gray,
  },
  bodyFatBadge: {
    backgroundColor: Colors.primaryDim,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 12,
  },
  bodyFatText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.primary,
  },
  lastMeasureDate: {
    ...Typography.caption,
    color: Colors.lightGray,
    marginTop: 8,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.lightGray,
    marginTop: 4,
  },

  // Trend Card
  trendCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  trendTitle: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    marginBottom: 16,
  },
  // Measurements
  measurementsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  measurementsTitle: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    marginBottom: 14,
  },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  measurementLabel: {
    ...Typography.body,
    color: Colors.gray,
  },
  measurementValue: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },

  // Primary Button
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    marginTop: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.white,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.dark,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },

  // Photo Grid
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PHOTO_GAP,
    marginBottom: 14,
  },
  photoItem: {
    width: PHOTO_SIZE,
  },
  photoPlaceholder: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoDate: {
    ...Typography.caption,
    color: Colors.gray,
    marginTop: 6,
    textAlign: 'center',
  },
  photoCaption: {
    fontSize: Fonts.size.xs,
    color: Colors.lightGray,
    textAlign: 'center',
    marginTop: 2,
  },

  // Volume Card
  volumeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  volumeTitle: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    marginBottom: 14,
  },
  volumeComparison: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeItem: {
    flex: 1,
    alignItems: 'center',
  },
  volumeLabel: {
    ...Typography.caption,
    color: Colors.gray,
    marginBottom: 6,
  },
  volumeValue: {
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  volumeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3,
    marginTop: 6,
  },
  volumeBadgeText: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.semiBold,
  },
  volumeDivider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.border,
  },

  // Sessions Count
  sessionsCountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionsCountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionsCountIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionsCountLabel: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  sessionsCountSub: {
    ...Typography.caption,
    color: Colors.lightGray,
    marginTop: 2,
  },
  sessionsCountValue: {
    fontSize: Fonts.size['3xl'],
    fontWeight: Fonts.weight.bold,
    color: Colors.primary,
  },

  // Personal Records
  prTitle: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    marginBottom: 12,
  },
  prItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  prLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  prRank: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prExercise: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  prDate: {
    ...Typography.caption,
    color: Colors.lightGray,
    marginTop: 2,
  },
  prRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  prWeight: {
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
  prUnit: {
    fontSize: Fonts.size.sm,
    color: Colors.gray,
    fontWeight: Fonts.weight.medium,
  },

  // Pose Modal
  poseModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  poseModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  poseModalTitle: {
    ...Typography.h4,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 4,
  },
  poseModalSubtitle: {
    ...Typography.caption,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  poseOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  poseOption: {
    alignItems: 'center',
    gap: 8,
  },
  poseIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poseLabel: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  poseLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  poseLoadingText: {
    fontSize: Fonts.size.sm,
    color: Colors.gray,
  },
  poseCancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  poseCancelText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    color: Colors.gray,
  },

  // Compare button
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryDim,
  },
  compareButtonText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.primary,
  },

  // 1RM Charts
  rmSubtitle: {
    ...Typography.caption,
    color: Colors.gray,
    marginBottom: 14,
  },
  rmPlaceholder: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 12,
  },
  rmPlaceholderText: {
    ...Typography.body,
    color: Colors.lightGray,
    textAlign: 'center',
    lineHeight: 22,
  },
  rmChartCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  // Sprint 3.4 — IMC + FFMI cards
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.gray,
    letterSpacing: 0.5,
  },
  metricBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  metricBadgeText: {
    fontSize: 10,
    fontWeight: Fonts.weight.semiBold as any,
  },
  metricValue: {
    fontSize: Fonts.size['3xl'],
    fontWeight: Fonts.weight.bold,
    marginBottom: 4,
  },
  metricHint: {
    fontSize: Fonts.size.xs,
    color: Colors.lightGray,
  },
  metricsHintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryDim,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  metricsHintText: {
    flex: 1,
    fontSize: Fonts.size.sm,
    color: Colors.primary,
    fontWeight: Fonts.weight.medium,
  },

  // Sprint 3.4 — Radar musculaire
  radarCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  radarHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  radarTitle: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  radarSubtitle: {
    fontSize: Fonts.size.xs,
    color: Colors.lightGray,
  },
  radarFooter: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  radarStat: {
    alignItems: 'center',
  },
  radarStatValue: {
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.bold,
    color: Colors.primary,
  },
  radarStatLabel: {
    fontSize: Fonts.size.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  radarEmpty: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  radarEmptyText: {
    fontSize: Fonts.size.sm,
    color: Colors.lightGray,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Sprint 4.4 — Claude Vision photo analysis
  aiAnalysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    backgroundColor: '#FAF3E4', // creme tadelakt
  },
  aiAnalysisButtonText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.gold,
  },
  aiModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  aiModalTitle: {
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
  },
});
