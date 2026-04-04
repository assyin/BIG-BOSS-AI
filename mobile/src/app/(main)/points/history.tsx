import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import PointsService, { PointTransaction, PointsBalance } from '@/services/points.service';

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  SessionComplete: { icon: 'barbell-outline', color: Colors.primary },
  StreakBonus: { icon: 'flame', color: Colors.error },
  PRBonus: { icon: 'trophy', color: Colors.warning },
  MealLogged: { icon: 'restaurant-outline', color: Colors.success },
  MacrosRespected: { icon: 'nutrition-outline', color: Colors.info },
  ChallengeCompletion: { icon: 'flag-outline', color: Colors.primary },
  AffiliationReferrer: { icon: 'people-outline', color: Colors.info },
  ShopPurchase: { icon: 'cart-outline', color: Colors.error },
  AdminAdjustment: { icon: 'settings-outline', color: Colors.gray },
  Clawback: { icon: 'remove-circle-outline', color: Colors.error },
};

export default function PointsHistoryScreen() {
  const [balance, setBalance] = useState<PointsBalance | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    try {
      const [bal, txs] = await Promise.all([
        PointsService.getBalance(),
        PointsService.getHistory(1, 50),
      ]);
      setBalance(bal);
      setTransactions(txs);
      setPage(1);
    } catch (err) {
      console.error('Failed to load points:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      loadData().finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderTransaction = ({ item }: { item: PointTransaction }) => {
    const config = TYPE_ICONS[item.type] || { icon: 'ellipse-outline', color: Colors.gray };
    const isPositive = item.amount > 0;

    return (
      <View style={styles.txRow}>
        <View style={[styles.txIcon, { backgroundColor: `${config.color}15` }]}>
          <Ionicons name={config.icon as any} size={20} color={config.color} />
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txReason} numberOfLines={1}>{item.reason}</Text>
          <Text style={styles.txDate}>
            {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={[styles.txAmount, { color: isPositive ? Colors.success : Colors.error }]}>
          {isPositive ? '+' : ''}{item.amount}
        </Text>
      </View>
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
        <Text style={styles.headerTitle}>Mes Points</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Balance card */}
      {balance && (
        <View style={styles.balanceCard}>
          <Ionicons name="star" size={32} color={Colors.warning} />
          <Text style={styles.balanceValue}>{balance.balance}</Text>
          <Text style={styles.balanceLabel}>points disponibles</Text>
          <View style={styles.balanceStats}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatValue}>{balance.totalEarned}</Text>
              <Text style={styles.balanceStatLabel}>Gagnes</Text>
            </View>
            <View style={[styles.balanceStat, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}>
              <Text style={styles.balanceStatValue}>{balance.totalSpent}</Text>
              <Text style={styles.balanceStatLabel}>Depenses</Text>
            </View>
            <View style={[styles.balanceStat, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}>
              <Text style={styles.balanceStatValue}>{balance.currentStreak}j</Text>
              <Text style={styles.balanceStatLabel}>Streak</Text>
            </View>
          </View>
        </View>
      )}

      {/* Transaction list */}
      <Text style={styles.sectionTitle}>Historique</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color={Colors.lightGray} />
            <Text style={styles.emptyText}>Aucune transaction</Text>
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

  balanceCard: {
    backgroundColor: Colors.white, borderRadius: 20, margin: 20, marginTop: 0,
    padding: 24, alignItems: 'center', shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  balanceValue: { fontSize: 40, fontWeight: Fonts.weight.bold, color: Colors.dark, marginTop: 8 },
  balanceLabel: { ...Typography.body, color: Colors.gray, marginBottom: 16 },
  balanceStats: { flexDirection: 'row', width: '100%' },
  balanceStat: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  balanceStatValue: { fontSize: Fonts.size.lg, fontWeight: Fonts.weight.bold, color: Colors.dark },
  balanceStatLabel: { fontSize: Fonts.size.xs, color: Colors.gray, marginTop: 2 },

  sectionTitle: { ...Typography.h4, color: Colors.dark, paddingHorizontal: 20, marginBottom: 8 },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 12, padding: 14, marginBottom: 8, gap: 12,
  },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txReason: { ...Typography.body, fontWeight: Fonts.weight.medium, color: Colors.dark },
  txDate: { ...Typography.caption, color: Colors.lightGray, marginTop: 2 },
  txAmount: { fontSize: Fonts.size.lg, fontWeight: Fonts.weight.bold },

  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyText: { ...Typography.body, color: Colors.gray },
});
