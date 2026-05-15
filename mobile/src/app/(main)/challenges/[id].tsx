import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator, RefreshControl, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { API_CONFIG } from '@/constants/api';
import ChallengesService, {
  ChallengeItem, ChallengeParticipation, LeaderboardEntry,
} from '@/services/challenges.service';

const TYPE_LABELS: Record<number, string> = {
  1: 'Mensuel', 2: 'Instant', 3: 'Ville vs Ville', 4: 'Annuel',
};

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [challenge, setChallenge] = useState<ChallengeItem | null>(null);
  const [progress, setProgress] = useState<ChallengeParticipation | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);

  const loadAll = useCallback(async () => {
    if (!id) return;
    try {
      const [c, p, lb] = await Promise.all([
        ChallengesService.getById(id),
        ChallengesService.getMyProgress(id),
        ChallengesService.getLeaderboard(id, 50),
      ]);
      setChallenge(c);
      setProgress(p);
      setLeaderboard(lb);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  const handleJoin = async () => {
    if (!id) return;
    setJoining(true);
    try {
      await ChallengesService.join(id);
      await loadAll();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible de rejoindre');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!id) return;
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Quitter ce challenge ?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert('Quitter', 'Es-tu sur de vouloir quitter ?', [
            { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Quitter', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });
    if (!confirmed) return;

    try {
      await ChallengesService.leave(id);
      await loadAll();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Impossible de quitter');
    }
  };

  const fixImageUrl = (url: string | null): string | null => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${API_CONFIG.BASE_URL}${url}`;
    return url;
  };

  const daysLeft = (endDate: string): number => {
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!challenge) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><Text style={styles.emptyText}>Challenge introuvable</Text></View>
      </SafeAreaView>
    );
  }

  const isJoined = !!progress;
  const isCompleted = progress?.isCompleted || false;
  const progressPercent = challenge.targetValue && progress
    ? Math.min(100, (progress.currentProgress / challenge.targetValue) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Challenge</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true); await loadAll(); setRefreshing(false);
          }} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Cover image */}
        {challenge.imageUrl && (
          <Image
            source={{ uri: fixImageUrl(challenge.imageUrl)! }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.content}>
          {/* Title & type */}
          <View style={styles.typeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{TYPE_LABELS[challenge.type] || 'Challenge'}</Text>
            </View>
            {challenge.isFeatured && (
              <View style={[styles.typeBadge, { backgroundColor: Colors.warning }]}>
                <Ionicons name="star" size={12} color={Colors.white} />
                <Text style={[styles.typeBadgeText, { color: Colors.white, marginLeft: 4 }]}>Featured</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{challenge.title}</Text>
          <Text style={styles.description}>{challenge.description}</Text>

          {/* Time remaining */}
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color={Colors.gray} />
            <Text style={styles.metaText}>
              {daysLeft(challenge.endDate)} jours restants
            </Text>
          </View>

          {/* Progress card (if joined) */}
          {isJoined && progress && (
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Ma progression</Text>
                {isCompleted && (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.white} />
                    <Text style={styles.completedText}>Terminé!</Text>
                  </View>
                )}
              </View>

              <Text style={styles.progressValue}>
                {progress.currentProgress.toFixed(0)} {challenge.metricUnit}
                {challenge.targetValue && (
                  <Text style={styles.progressTarget}>
                    {' / '}{challenge.targetValue.toFixed(0)} {challenge.metricUnit}
                  </Text>
                )}
              </Text>

              {challenge.targetValue && (
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
              )}

              {progress.finalRank && (
                <Text style={styles.rankText}>
                  🏆 Classement: #{progress.finalRank}
                </Text>
              )}
            </View>
          )}

          {/* Rewards card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recompenses</Text>
            <View style={styles.rewardRow}>
              <View style={styles.rewardItem}>
                <Ionicons name="enter-outline" size={20} color={Colors.info} />
                <Text style={styles.rewardValue}>{challenge.pointsForParticipation}</Text>
                <Text style={styles.rewardLabel}>Participation</Text>
              </View>
              <View style={styles.rewardItem}>
                <Ionicons name="trophy-outline" size={20} color={Colors.success} />
                <Text style={styles.rewardValue}>{challenge.pointsForCompletion}</Text>
                <Text style={styles.rewardLabel}>Completion</Text>
              </View>
              <View style={styles.rewardItem}>
                <Ionicons name="medal-outline" size={20} color={Colors.warning} />
                <Text style={styles.rewardValue}>{challenge.pointsForTop3}</Text>
                <Text style={styles.rewardLabel}>Top 3</Text>
              </View>
            </View>
          </View>

          {/* Leaderboard */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Classement</Text>
            {leaderboard.length === 0 ? (
              <Text style={styles.emptyLeaderboard}>Aucun participant pour l'instant</Text>
            ) : (
              leaderboard.map((entry) => (
                <View key={entry.userId} style={styles.leaderRow}>
                  <View style={[
                    styles.rankBadge,
                    entry.rank === 1 && { backgroundColor: '#FFD700' },
                    entry.rank === 2 && { backgroundColor: '#C0C0C0' },
                    entry.rank === 3 && { backgroundColor: '#CD7F32' },
                  ]}>
                    <Text style={styles.rankNumber}>{entry.rank}</Text>
                  </View>
                  <Text style={styles.leaderName} numberOfLines={1}>{entry.userName}</Text>
                  <Text style={styles.leaderScore}>
                    {entry.progress.toFixed(0)} {challenge.metricUnit}
                  </Text>
                  {entry.isCompleted && (
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action button */}
      <View style={styles.bottomBar}>
        {!isJoined ? (
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="rocket" size={20} color={Colors.white} />
                <Text style={styles.joinBtnText}>Rejoindre le challenge</Text>
              </>
            )}
          </TouchableOpacity>
        ) : !isCompleted ? (
          <TouchableOpacity
            style={[styles.joinBtn, { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border }]}
            onPress={handleLeave}
          >
            <Text style={[styles.joinBtnText, { color: Colors.gray }]}>Quitter</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.joinBtn, { backgroundColor: Colors.success }]}>
            <Ionicons name="trophy" size={20} color={Colors.white} />
            <Text style={styles.joinBtnText}>Challenge termine!</Text>
          </View>
        )}
      </View>
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
  headerTitle: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 18,
    color: Colors.dark,
    flex: 1,
    textAlign: 'center',
  },

  coverImage: { width: '100%', height: 200, backgroundColor: Colors.primaryDim },

  content: { padding: 20 },

  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primaryDim, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  typeBadgeText: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 10,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  title: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 22,
    color: Colors.dark,
    marginBottom: 8,
    lineHeight: 28,
  },
  description: {
    fontFamily: Fonts.family.regular,
    fontSize: 14,
    color: Colors.gray,
    lineHeight: 22,
    marginBottom: 12,
  },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  metaText: {
    fontFamily: Fonts.family.medium,
    fontSize: 12,
    color: Colors.gray,
  },

  progressCard: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: Colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 5,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressTitle: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  completedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.gold, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  completedText: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 10,
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  progressValue: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 22,
    color: Colors.white,
    marginBottom: 10,
  },
  progressTarget: {
    fontFamily: Fonts.family.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
  },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: 8, backgroundColor: Colors.white, borderRadius: 4 },
  rankText: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 14,
    color: Colors.gold,
    marginTop: 8,
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: Colors.shadowSoft,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 13,
    color: Colors.dark,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  rewardRow: { flexDirection: 'row', justifyContent: 'space-around' },
  rewardItem: { alignItems: 'center', gap: 4 },
  rewardValue: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 20,
    color: Colors.dark,
  },
  rewardLabel: {
    fontFamily: Fonts.family.medium,
    fontSize: 11,
    color: Colors.gray,
  },

  leaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rankBadge: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  rankNumber: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 12,
    color: Colors.dark,
  },
  leaderName: {
    flex: 1,
    fontFamily: Fonts.family.medium,
    fontSize: 13,
    color: Colors.dark,
  },
  leaderScore: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: 12,
    color: Colors.gray,
  },
  emptyLeaderboard: {
    fontFamily: Fonts.family.regular,
    fontSize: 12,
    color: Colors.lightGray,
    textAlign: 'center',
    paddingVertical: 20,
  },

  emptyText: {
    fontFamily: Fonts.family.medium,
    fontSize: 14,
    color: Colors.gray,
  },

  bottomBar: {
    padding: 20, paddingBottom: Platform.OS === 'android' ? 24 : 34,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    gap: 8,
    shadowColor: Colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 5,
  },
  joinBtnText: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: 0.3,
  },
});
