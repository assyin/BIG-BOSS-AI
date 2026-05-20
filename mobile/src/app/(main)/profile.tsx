import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { useAuthStore } from '@/store/auth.store';
import { ZelligePattern } from '@/components/brand/ZelligePattern';

export default function ProfileScreen() {
  const { user, profile, stats, logout, deleteAccount, loadProfile, loadStats, isLoading } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([loadProfile(), loadStats()]).finally(() => setInitialLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadStats()]);
    setRefreshing(false);
  };

  const name = user?.name || profile?.name || 'Utilisateur';
  const email = user?.email || profile?.email || '';
  const initials = name
    .split(' ')
    .map((n: string) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const tier = user?.subscriptionTier || profile?.subscriptionTier || 'Free';
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      })
    : '--';

  const totalSessions = stats?.totalSessions ?? profile?.stats?.totalSessions ?? 0;
  const totalVolumeKg = stats?.totalVolumeKg ?? profile?.stats?.totalVolumeKg ?? 0;
  const totalVolume = totalVolumeKg
    ? `${(totalVolumeKg / 1000).toFixed(1)}t`
    : '0 kg';

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Es-tu sur de vouloir te deconnecter ?')) {
        await logout();
        router.replace('/(auth)/login');
      }
    } else {
      Alert.alert('Deconnexion', 'Es-tu sur de vouloir te deconnecter ?', [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Deconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irreversible. Toutes tes donnees seront supprimees.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Confirmation finale',
              'Es-tu vraiment sur ? Cette action ne peut pas etre annulee.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Oui, supprimer',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await deleteAccount();
                      router.replace('/(auth)/login');
                    } catch (err: any) {
                      Alert.alert('Erreur', err?.message || 'Impossible de supprimer le compte');
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const renderSettingRow = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    value?: string,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon} size={20} color={Colors.primary} />
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={18} color={Colors.lightGray} />
      </View>
    </TouchableOpacity>
  );

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

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
        {/* Profile Header — gradient coucher de soleil médina + zellige subtil */}
        <LinearGradient
          colors={Colors.gradientHero as unknown as readonly [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <ZelligePattern width={420} height={340} color={Colors.white} opacity={0.08} tileSize={56} />
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push('/(main)/profile-edit' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={18} color={Colors.white} />
            <Text style={styles.editBtnText}>Modifier</Text>
          </TouchableOpacity>
          <View style={styles.profileHeader}>
            <View style={styles.avatarBorder}>
              <LinearGradient
                colors={Colors.gradientPrimary as unknown as readonly [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarCircle}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
            </View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.email}>{email}</Text>
            <View style={styles.tierBadge}>
              <Ionicons
                name={tier === 'Free' ? 'star-outline' : 'star'}
                size={14}
                color={tier === 'Free' ? Colors.white : Colors.gold}
              />
              <Text style={styles.tierText}>{tier}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{memberSince}</Text>
            <Text style={styles.statLabel}>Membre depuis</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Seances totales</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalVolume}</Text>
            <Text style={styles.statLabel}>Volume total</Text>
          </View>
        </View>

        {/* Profile Details */}
        {profile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mon profil</Text>
            <View style={styles.settingsCard}>
              {renderSettingRow('body-outline', 'Genre', profile.gender || '--', () => router.push({ pathname: '/(main)/profile-edit', params: { focus: 'gender' } } as any))}
              {renderSettingRow('fitness-outline', 'Objectif', profile.goal || '--', () => router.push({ pathname: '/(main)/profile-edit', params: { focus: 'goal' } } as any))}
              {renderSettingRow('trophy-outline', 'Niveau', profile.level || '--', () => router.push({ pathname: '/(main)/profile-edit', params: { focus: 'level' } } as any))}
              {renderSettingRow('scale-outline', 'Poids', profile.weightKg != null ? `${profile.weightKg} kg` : '--', () => router.push({ pathname: '/(main)/profile-edit', params: { focus: 'weight' } } as any))}
              {renderSettingRow('resize-outline', 'Taille', profile.heightCm != null ? `${profile.heightCm} cm` : '--', () => router.push({ pathname: '/(main)/profile-edit', params: { focus: 'height' } } as any))}
            </View>
          </View>
        )}

        {/* Gamification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gamification</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.gamifLink} onPress={() => router.push('/(main)/points/history' as any)}>
              <Ionicons name="star" size={20} color={Colors.warning} />
              <Text style={styles.gamifLinkText}>Mes Points</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.lightGray} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.gamifLink} onPress={() => router.push('/(main)/achievements' as any)}>
              <Ionicons name="medal" size={20} color={Colors.primary} />
              <Text style={styles.gamifLinkText}>Mes Badges</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.lightGray} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.gamifLink} onPress={() => router.push('/(main)/rewards' as any)}>
              <Ionicons name="gift" size={20} color={Colors.success} />
              <Text style={styles.gamifLinkText}>Boutique</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.lightGray} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.gamifLink} onPress={() => router.push('/(main)/challenges' as any)}>
              <Ionicons name="flag" size={20} color={Colors.info} />
              <Text style={styles.gamifLinkText}>Challenges</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.lightGray} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.gamifLink, { borderBottomWidth: 0 }]} onPress={() => router.push('/(main)/affiliation' as any)}>
              <Ionicons name="people" size={20} color={Colors.error} />
              <Text style={styles.gamifLinkText}>Parrainage</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.lightGray} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Outils IA — accès direct features premium */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outils IA</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.gamifLink}
              onPress={() => router.push('/(main)/sessions/coach-vision' as any)}
            >
              <Ionicons name="eye" size={20} color={Colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.gamifLinkText}>Coach Vision</Text>
                <Text style={styles.gamifLinkSub}>Analyse posture en temps réel · 20 exercices</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.lightGray} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.gamifLink, { borderBottomWidth: 0 }]}
              onPress={() => router.push('/(main)/progress' as any)}
            >
              <Ionicons name="analytics" size={20} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.gamifLinkText}>Ma Progression</Text>
                <Text style={styles.gamifLinkSub}>IMC · FFMI · Radar musculaire · Photos</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.lightGray} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parametres</Text>
          <View style={styles.settingsCard}>
            {renderSettingRow(
              'language-outline',
              'Langue',
              profile?.preferredLanguage === 'fr' ? 'Francais' : profile?.preferredLanguage === 'darija' ? 'الدارجة' : profile?.preferredLanguage === 'ar' ? 'العربية' : 'Francais',
              () => router.push({ pathname: '/(main)/profile-edit', params: { focus: 'language' } } as any)
            )}
            {renderSettingRow(
              'notifications-outline',
              'Notifications',
              profile?.notificationsEnabled ? 'Actives' : 'Desactivees',
              () => router.push({ pathname: '/(main)/profile-edit', params: { focus: 'notifications' } } as any)
            )}
            {/* Sprint 6.5 — Feedback in-app */}
            {renderSettingRow(
              'chatbubble-ellipses-outline',
              'Donner ton avis',
              'Bug, idée, ou un mot',
              () => router.push('/(main)/feedback' as any)
            )}
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.logoutText}>
              {isLoading ? 'Deconnexion...' : 'Se deconnecter'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteLink}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
            disabled={deleting}
          >
            <Text style={styles.deleteText}>
              {deleting ? 'Suppression en cours...' : 'Supprimer mon compte'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? 56 : 24,
    paddingBottom: 32,
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 18,
  },
  editBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 56 : 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 10,
  },
  editBtnText: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.sm,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarBorder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.family.displayBold,
    fontSize: Fonts.size['3xl'],
    color: Colors.white,
    letterSpacing: 1,
  },
  name: {
    ...Typography.h2,
    color: Colors.white,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  email: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 14,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tierText: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.sm,
    color: Colors.white,
    letterSpacing: 0.4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.family.displayBold,
    fontSize: Fonts.size.md,
    color: Colors.goldDark,
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.gray,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.sm,
    color: Colors.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  settingsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingLabel: {
    ...Typography.body,
    fontWeight: Fonts.weight.medium,
    color: Colors.dark,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValue: {
    ...Typography.caption,
    color: Colors.gray,
  },
  gamifLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
    gap: 12,
  },
  gamifLinkText: {
    flex: 1,
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.medium,
    color: Colors.dark,
  },
  gamifLinkSub: {
    fontSize: Fonts.size.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.errorLight,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  logoutText: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.md,
    color: Colors.error,
    letterSpacing: 0.3,
  },
  deleteLink: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  deleteText: {
    ...Typography.caption,
    color: Colors.lightGray,
    textDecorationLine: 'underline',
  },
});
