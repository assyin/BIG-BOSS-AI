import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator, Image, Alert, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import ShopService, { ShopReward, CATEGORY_LABELS } from '@/services/shop.service';
import { useGamificationStore } from '@/store/gamification.store';

const CATEGORY_ICONS: Record<number, string> = {
  1: 'pricetag-outline', 2: 'cube-outline', 3: 'phone-portrait-outline', 4: 'card-outline', 5: 'sparkles-outline',
};

export default function RewardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reward, setReward] = useState<ShopReward | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const { balance, loadGamification } = useGamificationStore();

  useEffect(() => {
    if (!id) return;
    ShopService.getReward(id)
      .then((r) => {
        // Fix image URL
        const { API_CONFIG } = require('@/constants/api');
        if (r.imageUrl && !r.imageUrl.startsWith('http')) {
          r.imageUrl = `${API_CONFIG.BASE_URL}${r.imageUrl}`;
        }
        setReward(r);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const canAfford = reward && balance && balance.balance >= reward.pointsCost;
  const outOfStock = reward?.stock === 0;
  const isPhysicalProduct = reward?.category === 2; // Product requires shipping

  const handleRedeemClick = () => {
    if (!canAfford) {
      Alert.alert('Solde insuffisant', `Tu as ${balance?.balance || 0} pts, il faut ${reward?.pointsCost} pts.`);
      return;
    }
    if (outOfStock) {
      Alert.alert('Rupture de stock', 'Cette recompense n\'est plus disponible.');
      return;
    }
    setConfirmVisible(true);
  };

  const handleConfirmRedeem = async () => {
    if (!reward) return;
    if (isPhysicalProduct && !shippingAddress.trim()) {
      Alert.alert('Adresse requise', 'Entre ton adresse de livraison.');
      return;
    }
    setRedeeming(true);
    try {
      const result = await ShopService.redeem(reward.id, isPhysicalProduct ? shippingAddress.trim() : undefined);
      setConfirmVisible(false);
      Alert.alert(
        'Echange reussi!',
        `Code: ${result.redemptionCode || 'N/A'}\n\n${reward.redemptionInstructions || 'Merci pour ton echange!'}`,
        [{ text: 'OK', onPress: () => {
          loadGamification();
          router.replace('/(main)/rewards/history' as any);
        }}],
      );
    } catch (err: any) {
      setConfirmVisible(false);
      Alert.alert('Erreur', err?.response?.data?.message || 'Echec de l\'echange');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!reward) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><Text style={styles.emptyText}>Recompense introuvable</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Detail</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        {reward.imageUrl ? (
          <Image source={{ uri: reward.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name={CATEGORY_ICONS[reward.category] as any || 'gift-outline'} size={72} color={Colors.primary} />
          </View>
        )}

        <View style={styles.content}>
          {/* Category */}
          <Text style={styles.categoryLabel}>{CATEGORY_LABELS[reward.category]}</Text>

          {/* Title */}
          <Text style={styles.title}>{reward.title}</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            <Ionicons name="star" size={22} color={Colors.warning} />
            <Text style={styles.priceText}>{reward.pointsCost} points</Text>
            {reward.realValueMad && (
              <Text style={styles.realValue}>= {reward.realValueMad} MAD</Text>
            )}
          </View>

          {/* Description */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Description</Text>
            <Text style={styles.description}>{reward.description}</Text>
          </View>

          {/* Redemption instructions */}
          {reward.redemptionInstructions && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Comment utiliser</Text>
              <Text style={styles.description}>{reward.redemptionInstructions}</Text>
            </View>
          )}

          {/* Meta */}
          <View style={styles.metaCard}>
            {reward.stock != null && (
              <View style={styles.metaRow}>
                <Ionicons name="cube-outline" size={16} color={Colors.gray} />
                <Text style={styles.metaLabel}>Stock:</Text>
                <Text style={[styles.metaValue, reward.stock === 0 && { color: Colors.error }]}>
                  {reward.stock === 0 ? 'Rupture' : `${reward.stock} disponibles`}
                </Text>
              </View>
            )}
            {reward.maxPerUser != null && (
              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={16} color={Colors.gray} />
                <Text style={styles.metaLabel}>Limite:</Text>
                <Text style={styles.metaValue}>{reward.maxPerUser}/utilisateur</Text>
              </View>
            )}
          </View>

          {/* Balance status */}
          <View style={[styles.balanceCard, canAfford ? styles.balanceCardOK : styles.balanceCardKO]}>
            <Ionicons
              name={canAfford ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={canAfford ? Colors.success : Colors.warning}
            />
            <Text style={styles.balanceCardText}>
              {canAfford
                ? `Tu as ${balance?.balance || 0} pts — il t'en restera ${(balance?.balance || 0) - reward.pointsCost} apres`
                : `Tu as ${balance?.balance || 0} pts, il faut ${reward.pointsCost - (balance?.balance || 0)} pts de plus`}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.redeemBtn, (!canAfford || outOfStock) && styles.redeemBtnDisabled]}
          onPress={handleRedeemClick}
          disabled={!canAfford || outOfStock}
        >
          <Ionicons name="gift" size={20} color={Colors.white} />
          <Text style={styles.redeemBtnText}>
            {outOfStock ? 'Rupture de stock' : canAfford ? 'Echanger' : 'Pas assez de points'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Confirmation modal */}
      <Modal visible={confirmVisible} transparent animationType="slide" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmer l'echange</Text>
              <TouchableOpacity onPress={() => setConfirmVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.dark} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalBody}>
              Echanger <Text style={{ fontWeight: Fonts.weight.bold }}>{reward.pointsCost} points</Text>
              {' '}contre <Text style={{ fontWeight: Fonts.weight.bold }}>{reward.title}</Text> ?
            </Text>

            {isPhysicalProduct && (
              <>
                <Text style={styles.inputLabel}>Adresse de livraison</Text>
                <TextInput
                  style={styles.input}
                  value={shippingAddress}
                  onChangeText={setShippingAddress}
                  placeholder="Numero, rue, ville, code postal"
                  placeholderTextColor={Colors.lightGray}
                  multiline
                />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Colors.background }]}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: Colors.gray }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Colors.primary }]}
                onPress={handleConfirmRedeem}
                disabled={redeeming}
              >
                {redeeming ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalBtnText}>Confirmer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  image: { width: '100%', height: 260, backgroundColor: Colors.primaryDim },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },

  content: { padding: 20 },

  categoryLabel: {
    fontSize: 11, fontWeight: Fonts.weight.bold, color: Colors.primary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  title: { ...Typography.h3, color: Colors.dark, marginTop: 6, marginBottom: 10 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  priceText: { ...Typography.h4, color: Colors.warning, fontWeight: Fonts.weight.bold },
  realValue: { ...Typography.body, color: Colors.gray, marginLeft: 6 },

  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 12,
  },
  cardTitle: { ...Typography.body, fontWeight: Fonts.weight.bold, color: Colors.dark, marginBottom: 6 },
  description: { ...Typography.body, color: Colors.gray, lineHeight: 22 },

  metaCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 12, gap: 8,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaLabel: { ...Typography.caption, color: Colors.gray },
  metaValue: { ...Typography.caption, color: Colors.dark, fontWeight: Fonts.weight.semiBold },

  balanceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, padding: 14, marginBottom: 12,
  },
  balanceCardOK: { backgroundColor: Colors.successLight },
  balanceCardKO: { backgroundColor: Colors.warningLight },
  balanceCardText: { ...Typography.caption, color: Colors.dark, flex: 1, lineHeight: 18 },

  bottomBar: {
    padding: 20, paddingBottom: Platform.OS === 'android' ? 24 : 34,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.background,
  },
  redeemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
  },
  redeemBtnDisabled: { backgroundColor: Colors.lightGray },
  redeemBtnText: { ...Typography.button, color: Colors.white },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: Platform.OS === 'android' ? 24 : 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { ...Typography.h4, color: Colors.dark },
  modalBody: { ...Typography.body, color: Colors.gray, lineHeight: 22, marginBottom: 16 },

  inputLabel: { ...Typography.caption, fontWeight: Fonts.weight.bold, color: Colors.dark, marginBottom: 6 },
  input: {
    backgroundColor: Colors.background, borderRadius: 10, padding: 12,
    ...Typography.body, color: Colors.dark, minHeight: 60,
    textAlignVertical: 'top', marginBottom: 16,
  },

  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  modalBtnText: { ...Typography.button, color: Colors.white },

  emptyText: { ...Typography.body, color: Colors.gray },
});
