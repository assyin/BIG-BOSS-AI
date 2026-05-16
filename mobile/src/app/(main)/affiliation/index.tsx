import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, FlatList,
  TouchableOpacity, Platform, ActivityIndicator, RefreshControl, Share, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import api from '@/services/api';

interface AffStats {
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  totalPointsEarned: number;
  pendingPoints: number;
}

interface Referral {
  name: string;
  joinedAt: string;
  hasCompletedFirstSession: boolean;
  pointsEarned: number;
}

export default function AffiliationScreen() {
  const [stats, setStats] = useState<AffStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        api.get<AffStats>('/api/affiliation/stats'),
        api.get<Referral[]>('/api/affiliation/referrals'),
      ]);
      setStats(s.data);
      setReferrals(r.data || []);
    } catch (err) { console.error(err); }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    loadData().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadData]));

  const handleShare = async () => {
    if (!stats) return;
    try {
      await Share.share({
        message: `Rejoins Big Boss Fitness et gagne un bonus de bienvenue! Utilise mon code: ${stats.referralCode}\n\nTelecharge l'app: https://bigbossfitness.ma/download`,
      });
    } catch {}
  };

  const handleCopy = () => {
    if (!stats) return;
    Alert.alert('Code copie!', stats.referralCode);
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
          <Text style={styles.headerTitle}>Parrainage</Text>
          <Text style={styles.headerSubtitle}>إحالة الأصدقاء</Text>
        </View>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} tintColor={Colors.primary} />}>

        {/* Code card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>TON CODE DE PARRAINAGE</Text>
          <TouchableOpacity onPress={handleCopy}>
            <Text style={styles.codeValue}>{stats?.referralCode || '...'}</Text>
          </TouchableOpacity>
          <Text style={styles.codeHint}>Partage ce code avec tes amis</Text>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-social" size={20} color={Colors.white} />
            <Text style={styles.shareBtnText}>Partager</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{stats?.totalReferrals || 0}</Text>
            <Text style={styles.statLabel}>Parraines</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <Text style={styles.statValue}>{stats?.activeReferrals || 0}</Text>
            <Text style={styles.statLabel}>Actifs</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={24} color={Colors.warning} />
            <Text style={styles.statValue}>{stats?.totalPointsEarned || 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>

        {stats?.pendingPoints ? (
          <View style={styles.pendingCard}>
            <Ionicons name="hourglass-outline" size={18} color={Colors.info} />
            <Text style={styles.pendingText}>
              {stats.pendingPoints} pts en attente (tes filleuls doivent completer une seance)
            </Text>
          </View>
        ) : null}

        {/* How it works */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>Comment ca marche ?</Text>
          <View style={styles.howStep}>
            <View style={styles.howNum}><Text style={styles.howNumText}>1</Text></View>
            <Text style={styles.howText}>Partage ton code avec un ami</Text>
          </View>
          <View style={styles.howStep}>
            <View style={styles.howNum}><Text style={styles.howNumText}>2</Text></View>
            <Text style={styles.howText}>Ton ami s'inscrit avec ton code</Text>
          </View>
          <View style={styles.howStep}>
            <View style={styles.howNum}><Text style={styles.howNumText}>3</Text></View>
            <Text style={styles.howText}>Tu gagnes 50 pts immediatement</Text>
          </View>
          <View style={styles.howStep}>
            <View style={styles.howNum}><Text style={styles.howNumText}>4</Text></View>
            <Text style={styles.howText}>+150 pts quand il fait sa premiere seance!</Text>
          </View>
        </View>

        {/* Referrals list */}
        {referrals.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Tes filleuls</Text>
            {referrals.map((r, i) => (
              <View key={i} style={styles.referralRow}>
                <View style={styles.referralAvatar}>
                  <Text style={styles.referralAvatarText}>{r.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.referralInfo}>
                  <Text style={styles.referralName}>{r.name}</Text>
                  <Text style={styles.referralDate}>
                    Inscrit le {new Date(r.joinedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <View style={styles.referralStatus}>
                  {r.hasCompletedFirstSession ? (
                    <View style={styles.activeBadge}>
                      <Ionicons name="checkmark" size={12} color={Colors.success} />
                      <Text style={styles.activeBadgeText}>Actif</Text>
                    </View>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <Ionicons name="hourglass" size={12} color={Colors.warning} />
                      <Text style={styles.pendingBadgeText}>En attente</Text>
                    </View>
                  )}
                  <Text style={styles.referralPoints}>+{r.pointsEarned} pts</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  codeCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  codeLabel: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.xs,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 2,
    marginBottom: 8,
  },
  codeValue: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 32,
    color: Colors.gold,
    letterSpacing: 4,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  codeHint: { fontSize: Fonts.size.sm, color: 'rgba(255,255,255,0.6)', marginBottom: 16 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24,
  },
  shareBtnText: { fontSize: Fonts.size.md, fontWeight: Fonts.weight.semiBold, color: Colors.white },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 16, alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statValue: { fontSize: Fonts.size.xl, fontWeight: Fonts.weight.bold, color: Colors.dark },
  statLabel: { fontSize: Fonts.size.xs, color: Colors.gray },

  pendingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.infoLight, borderRadius: 12, padding: 14, marginBottom: 16,
  },
  pendingText: { ...Typography.caption, color: Colors.info, flex: 1 },

  howCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 18, marginBottom: 16, gap: 12,
  },
  howTitle: { ...Typography.h4, color: Colors.dark },
  howStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  howNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primaryDim, alignItems: 'center', justifyContent: 'center' },
  howNumText: { fontSize: Fonts.size.sm, fontWeight: Fonts.weight.bold, color: Colors.primary },
  howText: { ...Typography.body, color: Colors.dark, flex: 1 },

  sectionTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 10 },
  referralRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 12, padding: 14, marginBottom: 8, gap: 12,
  },
  referralAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryDim, alignItems: 'center', justifyContent: 'center' },
  referralAvatarText: { fontSize: Fonts.size.md, fontWeight: Fonts.weight.bold, color: Colors.primary },
  referralInfo: { flex: 1 },
  referralName: { ...Typography.body, fontWeight: Fonts.weight.semiBold, color: Colors.dark },
  referralDate: { ...Typography.caption, color: Colors.lightGray },
  referralStatus: { alignItems: 'flex-end', gap: 4 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.successLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeText: { fontSize: Fonts.size.xs, fontWeight: Fonts.weight.semiBold, color: Colors.success },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.warningLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pendingBadgeText: { fontSize: Fonts.size.xs, fontWeight: Fonts.weight.semiBold, color: Colors.warning },
  referralPoints: { fontSize: Fonts.size.xs, fontWeight: Fonts.weight.bold, color: Colors.success },
});
