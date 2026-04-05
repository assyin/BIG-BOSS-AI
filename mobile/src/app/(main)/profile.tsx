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
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { useAuthStore } from '@/store/auth.store';

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

  const tierColors: Record<string, string> = {
    Free: Colors.gray,
    Premium: Colors.primary,
    Elite: Colors.warning,
  };

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
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>
          <View style={[styles.tierBadge, { backgroundColor: (tierColors[tier] || Colors.gray) + '20' }]}>
            <Text style={[styles.tierText, { color: tierColors[tier] || Colors.gray }]}>{tier}</Text>
          </View>
        </View>

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
              {renderSettingRow('body-outline', 'Genre', profile.gender || '--')}
              {renderSettingRow('fitness-outline', 'Objectif', profile.goal || '--')}
              {renderSettingRow('trophy-outline', 'Niveau', profile.level || '--')}
              {profile.weightKg != null && renderSettingRow('scale-outline', 'Poids', `${profile.weightKg} kg`)}
              {profile.heightCm != null && renderSettingRow('resize-outline', 'Taille', `${profile.heightCm} cm`)}
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

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parametres</Text>
          <View style={styles.settingsCard}>
            {renderSettingRow('language-outline', 'Langue', profile?.preferredLanguage === 'fr' ? 'Francais' : profile?.preferredLanguage || 'Francais')}
            {renderSettingRow('notifications-outline', 'Notifications', profile?.notificationsEnabled ? 'Actives' : 'Desactivees')}
            {renderSettingRow('scale-outline', 'Unite de mesure', 'Kg / cm')}
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
    paddingTop: Platform.OS === 'android' ? 48 : 16,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: Fonts.size['3xl'],
    fontWeight: Fonts.weight.bold,
    color: Colors.white,
  },
  name: {
    ...Typography.h3,
    color: Colors.dark,
    marginBottom: 4,
  },
  email: {
    ...Typography.body,
    color: Colors.gray,
    marginBottom: 12,
  },
  tierBadge: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  tierText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
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
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.bold,
    color: Colors.dark,
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
    ...Typography.caption,
    color: Colors.gray,
    fontWeight: Fonts.weight.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.error,
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
