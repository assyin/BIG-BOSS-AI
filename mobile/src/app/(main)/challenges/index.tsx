import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Platform, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import ChallengesService, { ChallengeItem, ChallengeParticipation } from '@/services/challenges.service';

const METRIC_LABELS: Record<number, string> = {
  1: 'Volume (kg)', 2: 'Seances', 3: 'Streak (jours)',
  4: 'Calories', 5: 'Records', 6: 'Regularite',
};

export default function ChallengesScreen() {
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [myChallenges, setMyChallenges] = useState<ChallengeParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  const myIds = new Set(myChallenges.map(c => c.challengeId));

  const loadData = useCallback(async () => {
    try {
      const [all, mine] = await Promise.all([
        ChallengesService.getActive(),
        ChallengesService.getMyChallenges(),
      ]);
      setChallenges(all);
      setMyChallenges(mine);
    } catch (err) { console.error(err); }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    loadData().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadData]));

  const handleJoin = async (id: string) => {
    setJoining(id);
    try {
      await ChallengesService.join(id);
      await loadData();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Impossible de rejoindre');
    } finally { setJoining(null); }
  };

  const daysLeft = (endDate: string) => {
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `${diff}j restants` : 'Termine';
  };

  const renderChallenge = ({ item }: { item: ChallengeItem }) => {
    const joined = myIds.has(item.id);
    const myProgress = myChallenges.find(c => c.challengeId === item.id);
    const progress = myProgress && item.targetValue
      ? Math.min((myProgress.currentProgress / item.targetValue) * 100, 100)
      : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/(main)/challenges/[id]', params: { id: item.id } } as any)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardBadge}>
            <Ionicons name="flag" size={14} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardMeta}>
              {METRIC_LABELS[item.metric] || 'Challenge'} · {daysLeft(item.endDate)}
            </Text>
          </View>
          {item.pointsForCompletion > 0 && (
            <View style={styles.pointsBadge}>
              <Ionicons name="star" size={12} color={Colors.warning} />
              <Text style={styles.pointsBadgeText}>{item.pointsForCompletion}</Text>
            </View>
          )}
        </View>

        {item.targetValue && (
          <Text style={styles.cardTarget}>
            Objectif: {item.targetValue} {item.metricUnit}
          </Text>
        )}

        {joined && myProgress && (
          <View style={styles.progressSection}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {Math.round(myProgress.currentProgress)} / {item.targetValue} {item.metricUnit}
            </Text>
          </View>
        )}

        {!joined ? (
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={() => handleJoin(item.id)}
            disabled={joining === item.id}
          >
            {joining === item.id ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="add-circle" size={18} color={Colors.white} />
                <Text style={styles.joinBtnText}>Rejoindre</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.joinedBadge}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={styles.joinedText}>Participe</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.headerTitle}>Challenges</Text>
        <Text style={styles.headerCount}>{challenges.length}</Text>
      </View>

      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        renderItem={renderChallenge}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="flag-outline" size={48} color={Colors.lightGray} />
            <Text style={styles.emptyText}>Aucun challenge actif</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 48 : 12, paddingBottom: 12,
  },
  headerTitle: { ...Typography.h4, color: Colors.dark },
  headerCount: { ...Typography.body, color: Colors.gray },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },

  card: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 18,
    marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  cardBadge: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { ...Typography.bodyLarge, fontWeight: Fonts.weight.bold, color: Colors.dark },
  cardMeta: { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  cardTarget: { ...Typography.body, color: Colors.gray, marginBottom: 10 },

  pointsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.warningLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  pointsBadgeText: { fontSize: Fonts.size.xs, fontWeight: Fonts.weight.bold, color: Colors.warning },

  progressSection: { marginBottom: 12 },
  progressBarBg: { height: 8, backgroundColor: Colors.background, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressBarFill: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  progressText: { ...Typography.caption, color: Colors.gray, textAlign: 'right' },

  joinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12,
  },
  joinBtnText: { ...Typography.button, color: Colors.white },
  joinedBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.successLight, borderRadius: 12, paddingVertical: 10,
  },
  joinedText: { ...Typography.body, fontWeight: Fonts.weight.semiBold, color: Colors.success },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { ...Typography.body, color: Colors.gray },
});
