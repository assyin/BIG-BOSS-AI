import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator, Image, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import LivesService, { LiveDetail, LIVE_TYPE_LABELS } from '@/services/lives.service';

export default function LiveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [live, setLive] = useState<LiveDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    LivesService.getById(id)
      .then(setLive)
      .finally(() => setLoading(false));
  }, [id]);

  const formatDateFull = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!live) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><Text style={styles.emptyText}>Live introuvable</Text></View>
      </SafeAreaView>
    );
  }

  const isLive = live.startedAt && !live.endedAt;
  const isPast = !!live.endedAt;
  const isUpcoming = !live.startedAt;
  const videoUrl = live.replayUrl || live.streamUrl;

  const openStream = () => {
    if (live.streamUrl) Linking.openURL(live.streamUrl);
  };

  let chapters: any[] = [];
  try { chapters = JSON.parse(live.chaptersJson || '[]'); } catch {}

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Live</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Video or thumbnail */}
        {videoUrl ? (
          Platform.OS === 'web' ? (
            <View style={styles.videoContainer}>
              <video
                src={videoUrl}
                controls
                playsInline
                poster={live.thumbnailUrl || undefined}
                style={{ width: '100%', height: 240, backgroundColor: '#000' } as any}
              />
            </View>
          ) : (
            <View style={styles.videoContainer}>
              <Video
                source={{ uri: videoUrl }}
                style={{ width: '100%', height: 240 }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
              />
            </View>
          )
        ) : (
          <View style={styles.thumbnailContainer}>
            {live.thumbnailUrl ? (
              <Image source={{ uri: live.thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                <Ionicons name="videocam" size={48} color={Colors.primary} />
              </View>
            )}
            {isLive && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>EN DIRECT</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.content}>
          {/* Badge & Title */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{LIVE_TYPE_LABELS[live.type] || 'Live'}</Text>
          </View>
          <Text style={styles.title}>{live.title}</Text>

          {/* Status */}
          <View style={styles.statusRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.gray} />
            <Text style={styles.statusText}>{formatDateFull(live.scheduledAt)}</Text>
          </View>

          {isLive && !live.streamUrl && (
            <View style={styles.noticeCard}>
              <Ionicons name="information-circle" size={20} color={Colors.info} />
              <Text style={styles.noticeText}>Le lien du direct sera disponible sous peu</Text>
            </View>
          )}

          {isUpcoming && (
            <View style={styles.noticeCard}>
              <Ionicons name="time" size={20} color={Colors.warning} />
              <Text style={styles.noticeText}>
                Live a venir. Reviens le {formatDateFull(live.scheduledAt)} pour rejoindre le direct.
              </Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={18} color={Colors.gray} />
              <Text style={styles.statValue}>{live.totalViews}</Text>
              <Text style={styles.statLabel}>Vues</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="heart-outline" size={18} color={Colors.error} />
              <Text style={styles.statValue}>{live.totalLikes}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.info} />
              <Text style={styles.statValue}>{live.totalComments}</Text>
              <Text style={styles.statLabel}>Comments</Text>
            </View>
            {live.peakViewers > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="trending-up" size={18} color={Colors.success} />
                <Text style={styles.statValue}>{live.peakViewers}</Text>
                <Text style={styles.statLabel}>Peak</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {live.description && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Description</Text>
              <Text style={styles.description}>{live.description}</Text>
            </View>
          )}

          {/* Chapters */}
          {chapters.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Chapitres</Text>
              {chapters.map((ch: any, idx: number) => (
                <View key={idx} style={styles.chapterRow}>
                  <Text style={styles.chapterTime}>{ch.time || '00:00'}</Text>
                  <Text style={styles.chapterTitle}>{ch.title || ch.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          {isLive && live.streamUrl && (
            <TouchableOpacity style={styles.primaryBtn} onPress={openStream}>
              <Ionicons name="play-circle" size={22} color={Colors.white} />
              <Text style={styles.primaryBtnText}>Rejoindre le direct</Text>
            </TouchableOpacity>
          )}
        </View>
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
    fontSize: 18,
    color: Colors.dark,
    flex: 1,
    textAlign: 'center',
  },

  videoContainer: { backgroundColor: '#000' },
  thumbnailContainer: { position: 'relative' },
  thumbnail: { width: '100%', height: 260, backgroundColor: Colors.primaryDim },
  thumbnailPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  liveBadge: {
    position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.error, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, gap: 6,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.white },
  liveBadgeText: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: 0.6,
  },

  content: { padding: 20 },

  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryDim, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
    marginBottom: 10,
  },
  typeBadgeText: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 10,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  title: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 22,
    color: Colors.dark,
    marginBottom: 10,
    lineHeight: 28,
  },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  statusText: {
    fontFamily: Fonts.family.medium,
    fontSize: 13,
    color: Colors.gray,
  },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.primaryDim,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  noticeText: {
    fontFamily: Fonts.family.medium,
    fontSize: 13,
    color: Colors.dark,
    flex: 1,
    lineHeight: 19,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.shadowSoft,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 18,
    color: Colors.dark,
  },
  statLabel: {
    fontFamily: Fonts.family.medium,
    fontSize: 11,
    color: Colors.gray,
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.shadowSoft,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 13,
    color: Colors.dark,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  description: {
    fontFamily: Fonts.family.regular,
    fontSize: 14,
    color: Colors.gray,
    lineHeight: 22,
  },

  chapterRow: {
    flexDirection: 'row', gap: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  chapterTime: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 12,
    color: Colors.primary,
    minWidth: 50,
  },
  chapterTitle: {
    fontFamily: Fonts.family.medium,
    fontSize: 14,
    color: Colors.dark,
    flex: 1,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.error,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: 'rgba(181, 40, 58, 0.4)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 5,
  },
  primaryBtnText: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: 0.3,
  },

  emptyText: {
    fontFamily: Fonts.family.medium,
    fontSize: 14,
    color: Colors.gray,
  },
});
