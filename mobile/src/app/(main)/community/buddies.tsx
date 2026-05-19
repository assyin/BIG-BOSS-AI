import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import BuddiesService, {
  BuddyRecommendation,
  GOAL_LABELS,
  SLOT_LABELS,
} from '@/services/buddies.service';

/**
 * Sprint 5.2 — Écran Gym Buddies matching.
 * Liste des recommandations + cards avec actions Connect / Pass.
 */
export default function BuddiesScreen() {
  const [matches, setMatches] = useState<BuddyRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      const data = await BuddiesService.getRecommended(30);
      setMatches(data);
    } catch (e: any) {
      console.error('[Buddies] load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const handleConnect = useCallback(async (buddy: BuddyRecommendation) => {
    setConnecting(buddy.userId);
    try {
      const res = await BuddiesService.connect(buddy.userId);
      Alert.alert(
        res.autoAccepted ? '✅ Match auto-validé !' : '📤 Demande envoyée',
        res.autoAccepted
          ? `${buddy.name} t'avait déjà envoyé une demande — vous êtes maintenant buddies !`
          : `${buddy.name} recevra ta demande sur son tél.`
      );
      // Mettre à jour le state local
      setMatches((prev) => prev.map((m) =>
        m.userId === buddy.userId
          ? { ...m, requestPending: !res.autoAccepted, isConnected: res.autoAccepted }
          : m
      ));
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.error || 'Impossible d\'envoyer la demande');
    } finally {
      setConnecting(null);
    }
  }, []);

  const scoreColor = (score: number): string => {
    if (score >= 70) return Colors.success;
    if (score >= 40) return Colors.gold;
    return Colors.gray;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gym Buddies 🤝</Text>
        <TouchableOpacity onPress={() => router.push('/(main)/community/buddies-edit' as any)}>
          <Ionicons name="settings-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color={Colors.lightGray} />
          <Text style={styles.emptyText}>Aucun buddy trouvé</Text>
          <Text style={styles.emptySubtext}>
            Configure ton profil buddy pour matcher avec d'autres athlètes !
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(main)/community/buddies-edit' as any)}
          >
            <Text style={styles.primaryBtnText}>Configurer mon profil</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {matches.map((m) => (
            <View key={m.userId} style={styles.card}>
              {/* Header avatar + nom + score */}
              <View style={styles.cardHeader}>
                {m.avatarUrl ? (
                  <Image source={{ uri: m.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{m.name}</Text>
                  <Text style={styles.userSub}>
                    {m.city}{m.gymName ? ` · ${m.gymName}` : ''}
                  </Text>
                  {m.level && <Text style={styles.levelChip}>Niveau {m.level}</Text>}
                </View>
                <View style={[styles.scoreBadge, { backgroundColor: scoreColor(m.matchScore) + '22' }]}>
                  <Text style={[styles.scoreText, { color: scoreColor(m.matchScore) }]}>{m.matchScore}%</Text>
                  <Text style={styles.scoreLabel}>match</Text>
                </View>
              </View>

              {/* Bio */}
              {m.bio && <Text style={styles.bio} numberOfLines={2}>{m.bio}</Text>}

              {/* Goals chips */}
              {m.goals.length > 0 && (
                <View style={styles.chipsRow}>
                  {m.goals.slice(0, 3).map((g) => (
                    <View key={g} style={styles.chip}>
                      <Text style={styles.chipText}>{GOAL_LABELS[g] ?? g}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Slots chips */}
              {m.availableSlots.length > 0 && (
                <View style={styles.chipsRow}>
                  {m.availableSlots.slice(0, 3).map((s) => (
                    <View key={s} style={[styles.chip, styles.chipBlue]}>
                      <Ionicons name="time-outline" size={11} color={Colors.info} />
                      <Text style={[styles.chipText, { color: Colors.info }]}>
                        {SLOT_LABELS[s] ?? s}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Reasons (raisons du match) */}
              {m.matchReasons.length > 0 && (
                <View style={styles.reasonsBox}>
                  {m.matchReasons.slice(0, 3).map((r, i) => (
                    <View key={i} style={styles.reasonRow}>
                      <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                      <Text style={styles.reasonText}>{r}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action button */}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  m.isConnected ? styles.actionConnected : null,
                  m.requestPending ? styles.actionPending : null,
                ]}
                onPress={() => !m.isConnected && !m.requestPending && handleConnect(m)}
                disabled={m.isConnected || m.requestPending || connecting === m.userId}
                activeOpacity={0.7}
              >
                {connecting === m.userId ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : m.isConnected ? (
                  <>
                    <Ionicons name="checkmark" size={18} color={Colors.success} />
                    <Text style={[styles.actionText, { color: Colors.success }]}>Connecté</Text>
                  </>
                ) : m.requestPending ? (
                  <>
                    <Ionicons name="hourglass-outline" size={18} color={Colors.gray} />
                    <Text style={[styles.actionText, { color: Colors.gray }]}>En attente</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="person-add" size={18} color={Colors.white} />
                    <Text style={styles.actionText}>Se connecter</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 48 : 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { ...Typography.h4, color: Colors.dark },
  list: { padding: 16, paddingBottom: 32, gap: 12 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: Fonts.size.xl, fontWeight: Fonts.weight.bold, color: Colors.white },
  userName: { fontSize: Fonts.size.md, fontWeight: Fonts.weight.bold, color: Colors.dark },
  userSub: { fontSize: Fonts.size.sm, color: Colors.gray, marginTop: 2 },
  levelChip: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: Fonts.weight.semiBold,
    marginTop: 4,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  scoreText: { fontSize: Fonts.size.md, fontWeight: Fonts.weight.bold },
  scoreLabel: { fontSize: 10, color: Colors.gray, marginTop: -2 },

  bio: { fontSize: Fonts.size.sm, color: Colors.dark, lineHeight: 18 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: Colors.primaryDim,
    borderRadius: 12,
  },
  chipBlue: { backgroundColor: Colors.infoLight },
  chipText: { fontSize: 11, fontWeight: Fonts.weight.medium, color: Colors.primary },

  reasonsBox: { backgroundColor: Colors.background, borderRadius: 10, padding: 10, gap: 4 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reasonText: { fontSize: 11, color: Colors.gray },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  actionConnected: { backgroundColor: Colors.successLight, borderWidth: 1, borderColor: Colors.success },
  actionPending: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  actionText: { color: Colors.white, fontSize: Fonts.size.md, fontWeight: Fonts.weight.semiBold },

  emptyText: { ...Typography.body, color: Colors.dark, fontWeight: Fonts.weight.semiBold, marginTop: 16 },
  emptySubtext: { ...Typography.caption, color: Colors.gray, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, marginTop: 16,
  },
  primaryBtnText: { color: Colors.white, fontWeight: Fonts.weight.semiBold },
});
