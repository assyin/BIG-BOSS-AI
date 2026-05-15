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
import ShopService, { RewardRedemption } from '@/services/shop.service';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  Pending: { label: 'En attente', color: '#FF9500', icon: 'time-outline' },
  Confirmed: { label: 'Confirme', color: '#5AC8FA', icon: 'checkmark-circle-outline' },
  Shipped: { label: 'Expedie', color: '#5AC8FA', icon: 'airplane-outline' },
  Delivered: { label: 'Livre', color: '#34C759', icon: 'checkmark-done-circle' },
  Cancelled: { label: 'Annule', color: '#FF3B30', icon: 'close-circle-outline' },
  Refunded: { label: 'Rembourse', color: '#8E8E93', icon: 'return-up-back-outline' },
};

export default function RedemptionHistoryScreen() {
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await ShopService.getRedemptions();
      setRedemptions(data);
    } catch (err) { console.error(err); }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]));

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }: { item: RewardRedemption }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.Pending;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title} numberOfLines={1}>
            {item.shopReward?.title || 'Recompense'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Ionicons name={status.icon as any} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Ionicons name="star" size={14} color={Colors.warning} />
          <Text style={styles.points}>-{item.pointsSpent} pts</Text>
        </View>

        {item.redemptionCode && (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Code</Text>
            <Text style={styles.codeValue}>{item.redemptionCode}</Text>
          </View>
        )}

        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
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
        <Text style={styles.headerTitle}>Mes echanges</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={redemptions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
          setRefreshing(true); await loadData(); setRefreshing(false);
        }} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={Colors.lightGray} />
            <Text style={styles.emptyText}>Aucun echange pour l'instant</Text>
            <TouchableOpacity onPress={() => router.replace('/(main)/rewards' as any)}>
              <Text style={styles.emptyLink}>Decouvrir la boutique</Text>
            </TouchableOpacity>
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
  headerTitle: { ...Typography.h4, color: Colors.dark, flex: 1, textAlign: 'center' },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },

  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { flex: 1, ...Typography.body, fontWeight: Fonts.weight.bold, color: Colors.dark },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8,
  },
  statusText: { fontSize: 10, fontWeight: Fonts.weight.bold },

  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  points: { ...Typography.caption, fontWeight: Fonts.weight.bold, color: Colors.warning },

  codeBox: {
    backgroundColor: Colors.primaryDim, borderRadius: 8, padding: 10, marginVertical: 6,
  },
  codeLabel: { fontSize: 10, fontWeight: Fonts.weight.bold, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  codeValue: { ...Typography.body, fontWeight: Fonts.weight.bold, color: Colors.dark, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  date: { ...Typography.caption, color: Colors.lightGray, marginTop: 4 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyText: { ...Typography.body, color: Colors.gray },
  emptyLink: { ...Typography.body, color: Colors.primary, fontWeight: Fonts.weight.semiBold },
});
