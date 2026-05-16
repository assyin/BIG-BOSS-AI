import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import api from '@/services/api';

interface AchievementWithStatus {
  id: string;
  key: string;
  title: string;
  titleAr: string | null;
  description: string;
  iconUrl: string | null;
  category: number;
  pointsReward: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  currentValue: number;
  targetValue: number;
}

const CATEGORY_LABELS: Record<number, string> = {
  1: 'Regularite', 2: 'Force', 3: 'Volume', 4: 'Social', 5: 'Milestone', 6: 'Nutrition',
};

const CATEGORY_ICONS: Record<number, string> = {
  1: 'calendar-outline', 2: 'barbell-outline', 3: 'trending-up-outline',
  4: 'people-outline', 5: 'trophy-outline', 6: 'restaurant-outline',
};

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get<AchievementWithStatus[]>('/api/achievements');
      setAchievements(res.data || []);
    } catch (err) { console.error(err); }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    loadData().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadData]));

  const unlocked = achievements.filter(a => a.isUnlocked);
  const locked = achievements.filter(a => !a.isUnlocked);

  const renderAchievement = ({ item }: { item: AchievementWithStatus }) => (
    <View style={[styles.card, item.isUnlocked && styles.cardUnlocked]}>
      <View style={[styles.iconCircle, item.isUnlocked ? styles.iconUnlocked : styles.iconLocked]}>
        <Ionicons
          name={(item.isUnlocked ? 'medal' : CATEGORY_ICONS[item.category] || 'lock-closed-outline') as any}
          size={24}
          color={item.isUnlocked ? Colors.gold : Colors.lightGray}
        />
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, !item.isUnlocked && styles.cardTitleLocked]}>{item.title}</Text>
        <Text style={styles.cardDesc}>{item.description}</Text>
        {!item.isUnlocked && item.targetValue > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min(item.progress, 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>{item.currentValue}/{item.targetValue}</Text>
          </View>
        )}
        {item.isUnlocked && item.unlockedAt && (
          <Text style={styles.unlockedDate}>
            Debloque le {new Date(item.unlockedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </Text>
        )}
      </View>
      <View style={styles.pointsBadge}>
        <Ionicons name="star" size={12} color={item.isUnlocked ? Colors.gold : Colors.lightGray} />
        <Text style={[styles.pointsText, !item.isUnlocked && { color: Colors.lightGray }]}>{item.pointsReward}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={Colors.gradientHero as unknown as readonly [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Achievements</Text>
          <Text style={styles.headerSubtitle}>الإنجازات</Text>
        </View>
        <View style={styles.headerCountPill}>
          <Ionicons name="medal" size={14} color={Colors.gold} />
          <Text style={styles.headerCount}>{unlocked.length}/{achievements.length}</Text>
        </View>
      </LinearGradient>

      <FlatList
        data={[...unlocked, ...locked]}
        keyExtractor={(item) => item.id}
        renderItem={renderAchievement}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} tintColor={Colors.primary} />}
        ListHeaderComponent={
          unlocked.length > 0 ? (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{unlocked.length}</Text>
                <Text style={styles.statLabel}>Debloquees</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{unlocked.reduce((s, a) => s + a.pointsReward, 0)}</Text>
                <Text style={styles.statLabel}>Points gagnes</Text>
              </View>
            </View>
          ) : null
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
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 48 : 12, paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: Fonts.family.displayBold,
    fontSize: Fonts.size.xl,
    color: Colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontFamily: Fonts.family.arRegular,
    fontSize: Fonts.size.xs,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: -2,
  },
  headerCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerCount: {
    fontFamily: Fonts.family.displayBold,
    fontSize: Fonts.size.sm,
    color: Colors.white,
  },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16, paddingHorizontal: 20 },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 16, alignItems: 'center',
    borderTopWidth: 3,
    borderTopColor: Colors.gold,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statValue: {
    fontFamily: Fonts.family.displayBold,
    fontSize: Fonts.size.xl,
    color: Colors.goldDark,
  },
  statLabel: {
    fontFamily: Fonts.family.displayMedium,
    fontSize: Fonts.size.xs,
    color: Colors.gray,
    marginTop: 2,
  },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 14, padding: 14, marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardUnlocked: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },

  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  iconUnlocked: { backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.gold },
  iconLocked: { backgroundColor: Colors.background },

  cardInfo: { flex: 1 },
  cardTitle: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.base,
    color: Colors.dark,
  },
  cardTitleLocked: { color: Colors.gray },
  cardDesc: { ...Typography.caption, color: Colors.lightGray, marginTop: 2 },
  unlockedDate: {
    fontFamily: Fonts.family.displayMedium,
    fontSize: Fonts.size.xs,
    color: Colors.goldDark,
    marginTop: 4,
  },

  progressSection: { marginTop: 6 },
  progressBarBg: { height: 6, backgroundColor: Colors.background, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  progressText: { ...Typography.caption, color: Colors.gray, textAlign: 'right', marginTop: 2, fontSize: 10 },

  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pointsText: {
    fontFamily: Fonts.family.displayBold,
    fontSize: Fonts.size.sm,
    color: Colors.goldDark,
  },
});
