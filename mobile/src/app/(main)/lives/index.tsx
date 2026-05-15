import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import LivesService, { LiveItem, LIVE_TYPE_LABELS, LIVE_TYPE_ICONS } from '@/services/lives.service';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

type TabType = 'upcoming' | 'past';

export default function LivesListScreen() {
  const [tab, setTab] = useState<TabType>('upcoming');
  const [upcoming, setUpcoming] = useState<LiveItem[]>([]);
  const [past, setPast] = useState<LiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [all, up] = await Promise.all([
        LivesService.getAll(),
        LivesService.getUpcoming(20),
      ]);
      setUpcoming(up);
      // Past = ended lives
      setPast(all.filter((l) => l.endedAt != null));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]));

  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Aujourd'hui ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays === 1) {
      return `Demain ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const isLive = (item: LiveItem) => item.startedAt && !item.endedAt;

  const renderLiveCard = (item: LiveItem) => {
    const live = isLive(item);
    const icon = LIVE_TYPE_ICONS[item.type] || 'videocam';

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.liveCard}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/(main)/lives/[id]', params: { id: item.id } } as any)}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name={icon as any} size={36} color={Colors.primary} />
            </View>
          )}

          {/* Live badge or replay */}
          {live && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>EN DIRECT</Text>
            </View>
          )}
          {item.endedAt && (
            <View style={styles.replayBadge}>
              <Ionicons name="play-circle" size={14} color={Colors.white} />
              <Text style={styles.replayBadgeText}>Replay</Text>
            </View>
          )}

          {/* Type badge */}
          <View style={styles.typeChip}>
            <Text style={styles.typeChipText}>{LIVE_TYPE_LABELS[item.type] || 'Live'}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.liveInfo}>
          <Text style={styles.liveTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.liveMeta}>
            <Ionicons name="time-outline" size={12} color={Colors.gray} />
            <Text style={styles.liveMetaText}>{formatDate(item.scheduledAt)}</Text>
            {item.totalViews > 0 && (
              <>
                <Ionicons name="eye-outline" size={12} color={Colors.gray} style={{ marginLeft: 8 }} />
                <Text style={styles.liveMetaText}>{item.totalViews}</Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingState fullscreen message="Chargement des lives..." />
      </SafeAreaView>
    );
  }

  const data = tab === 'upcoming' ? upcoming : past;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lives</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'upcoming' && styles.tabActive]}
          onPress={() => setTab('upcoming')}
        >
          <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>
            À venir ({upcoming.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'past' && styles.tabActive]}
          onPress={() => setTab('past')}
        >
          <Text style={[styles.tabText, tab === 'past' && styles.tabTextActive]}>
            Replays ({past.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true); await loadData(); setRefreshing(false);
          }} tintColor={Colors.primary} />
        }
      >
        {data.length === 0 ? (
          <EmptyState
            icon="videocam-outline"
            title={tab === 'upcoming' ? 'Aucun live prévu' : 'Aucun replay'}
            message={tab === 'upcoming'
              ? 'Les prochains lives arriveront bientôt'
              : 'Les replays apparaitront ici apres les lives'}
          />
        ) : (
          data.map(renderLiveCard)
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
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 48 : 12, paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 20,
    color: Colors.dark,
  },

  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 14 },
  tab: {
    flex: 1, paddingVertical: 11, borderRadius: 12,
    backgroundColor: Colors.white, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: 13,
    color: Colors.gray,
  },
  tabTextActive: {
    color: Colors.white,
    fontFamily: Fonts.family.displayBold,
  },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  liveCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: Colors.shadowSoft,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  thumbnailContainer: { position: 'relative' },
  thumbnail: { width: '100%', height: 190, backgroundColor: Colors.primaryDim },
  thumbnailPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  liveBadge: {
    position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.error, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, gap: 6,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.white },
  liveBadgeText: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 10,
    color: Colors.white,
    letterSpacing: 0.6,
  },

  replayBadge: {
    position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(44,24,16,0.75)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, gap: 4,
  },
  replayBadgeText: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 10,
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  typeChip: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  typeChipText: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 10,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  liveInfo: { padding: 14 },
  liveTitle: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 15,
    color: Colors.dark,
    marginBottom: 6,
    lineHeight: 20,
  },
  liveMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveMetaText: {
    fontFamily: Fonts.family.medium,
    fontSize: 11,
    color: Colors.gray,
  },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: {
    fontFamily: Fonts.family.medium,
    fontSize: 14,
    color: Colors.gray,
  },
});
