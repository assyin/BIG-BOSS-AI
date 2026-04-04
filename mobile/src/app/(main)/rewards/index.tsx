import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Platform, ActivityIndicator, RefreshControl, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import ShopService, { ShopReward, CATEGORY_LABELS } from '@/services/shop.service';
import { useGamificationStore } from '@/store/gamification.store';

const CATEGORY_ICONS: Record<number, string> = {
  1: 'pricetag-outline', 2: 'cube-outline', 3: 'phone-portrait-outline', 4: 'card-outline', 5: 'sparkles-outline',
};

export default function RewardsScreen() {
  const [rewards, setRewards] = useState<ShopReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const { balance, loadGamification } = useGamificationStore();

  const loadData = useCallback(async () => {
    try {
      const data = await ShopService.getRewards();
      setRewards(data);
    } catch (err) { console.error(err); }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    Promise.all([loadData(), loadGamification()]).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadData]));

  const handleRedeem = async (reward: ShopReward) => {
    if (!balance || balance.balance < reward.pointsCost) {
      Alert.alert('Solde insuffisant', `Tu as ${balance?.balance || 0} pts, il faut ${reward.pointsCost} pts.`);
      return;
    }

    Alert.alert(
      'Confirmer l\'echange',
      `Echanger ${reward.pointsCost} points contre "${reward.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Echanger',
          onPress: async () => {
            setRedeeming(reward.id);
            try {
              const result = await ShopService.redeem(reward.id);
              Alert.alert('Echange reussi!', `Code: ${result.redemptionCode || 'N/A'}\n${reward.redemptionInstructions || ''}`);
              await Promise.all([loadData(), loadGamification()]);
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message || 'Echec de l\'echange');
            } finally { setRedeeming(null); }
          },
        },
      ]
    );
  };

  const renderReward = ({ item }: { item: ShopReward }) => {
    const canAfford = balance && balance.balance >= item.pointsCost;
    return (
      <View style={styles.card}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name={CATEGORY_ICONS[item.category] as any || 'gift-outline'} size={32} color={Colors.primary} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          <View style={styles.cardBottom}>
            <View style={styles.priceBadge}>
              <Ionicons name="star" size={14} color={Colors.warning} />
              <Text style={styles.priceText}>{item.pointsCost} pts</Text>
            </View>
            {item.stock != null && <Text style={styles.stockText}>Stock: {item.stock}</Text>}
          </View>
          <TouchableOpacity
            style={[styles.redeemBtn, !canAfford && styles.redeemBtnDisabled]}
            disabled={!canAfford || redeeming === item.id}
            onPress={() => handleRedeem(item)}
          >
            {redeeming === item.id ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.redeemBtnText}>{canAfford ? 'Echanger' : 'Pas assez de points'}</Text>
            )}
          </TouchableOpacity>
        </View>
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
        <Text style={styles.headerTitle}>Boutique</Text>
        <View style={styles.balancePill}>
          <Ionicons name="star" size={14} color={Colors.warning} />
          <Text style={styles.balanceText}>{balance?.balance || 0}</Text>
        </View>
      </View>

      <FlatList
        data={rewards}
        keyExtractor={(item) => item.id}
        renderItem={renderReward}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="gift-outline" size={48} color={Colors.lightGray} />
            <Text style={styles.emptyText}>Aucune recompense disponible</Text>
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
  balancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.warningLight, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
  },
  balanceText: { fontSize: Fonts.size.base, fontWeight: Fonts.weight.bold, color: Colors.warning },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 16,
    marginBottom: 14, overflow: 'hidden', shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardImage: { width: 110, height: 140 },
  cardImagePlaceholder: { backgroundColor: Colors.primaryDim, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, padding: 14, justifyContent: 'space-between' },
  cardTitle: { ...Typography.body, fontWeight: Fonts.weight.bold, color: Colors.dark },
  cardDesc: { ...Typography.caption, color: Colors.gray, marginVertical: 4, lineHeight: 16 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  priceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceText: { fontSize: Fonts.size.base, fontWeight: Fonts.weight.bold, color: Colors.warning },
  stockText: { ...Typography.caption, color: Colors.lightGray },
  redeemBtn: {
    backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 8, alignItems: 'center',
  },
  redeemBtnDisabled: { backgroundColor: Colors.lightGray },
  redeemBtnText: { fontSize: Fonts.size.sm, fontWeight: Fonts.weight.bold, color: Colors.white },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { ...Typography.body, color: Colors.gray },
});
