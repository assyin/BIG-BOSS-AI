import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  Platform, ActivityIndicator, RefreshControl, TextInput, Alert, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import FeedService, { FeedPost, REACTION_EMOJIS, POST_TYPE_LABELS } from '@/services/feed.service';

const REACTIONS = [
  { type: 1, emoji: '🔥' },
  { type: 2, emoji: '💪' },
  { type: 3, emoji: '⚡' },
  { type: 4, emoji: '🏆' },
];

export default function CommunityScreen() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  // Sprint 5.1 — Compose avec photo + Infinite scroll
  const [composePhotoBase64, setComposePhotoBase64] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  const loadFeed = useCallback(async (resetPage = true) => {
    try {
      const targetPage = resetPage ? 1 : page;
      const data = await FeedService.getFeed(targetPage, PAGE_SIZE);
      if (resetPage) {
        setPosts(data);
        setPage(2);
        setHasMore(data.length === PAGE_SIZE);
      } else {
        // Dédupe par id si jamais
        setPosts((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          const append = data.filter((p) => !ids.has(p.id));
          return [...prev, ...append];
        });
        setPage(targetPage + 1);
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch (err) { console.error(err); }
  }, [page]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore || refreshing) return;
    setLoadingMore(true);
    try {
      await loadFeed(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, refreshing, loadFeed]);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    loadFeed(true).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  const handlePost = async () => {
    if (!newPost.trim() && !composePhotoBase64) return;
    setPosting(true);
    try {
      let imageUrl: string | undefined;
      if (composePhotoBase64) {
        setUploadingImage(true);
        const up = await FeedService.uploadImage(composePhotoBase64);
        imageUrl = up.imageUrl;
        setUploadingImage(false);
      }
      await FeedService.createPost(newPost.trim(), imageUrl);
      setNewPost('');
      setComposePhotoBase64(null);
      setShowCompose(false);
      await loadFeed(true);
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.error || 'Impossible de publier');
    } finally {
      setPosting(false);
      setUploadingImage(false);
    }
  };

  const handlePickImage = async (source: 'camera' | 'gallery') => {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission requise', "Autorise l'acces a la camera.");
          return;
        }
        const r = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'], quality: 0.6, base64: true, allowsEditing: true, aspect: [4, 3],
        });
        if (!r.canceled && r.assets?.[0]?.base64) setComposePhotoBase64(r.assets[0].base64);
      } else {
        const r = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'], quality: 0.6, base64: true, allowsEditing: true, aspect: [4, 3],
        });
        if (!r.canceled && r.assets?.[0]?.base64) setComposePhotoBase64(r.assets[0].base64);
      }
    } catch {
      Alert.alert('Erreur', "Impossible d'ouvrir l'image.");
    }
  };

  const handleReact = async (postId: string, type: number) => {
    await FeedService.react(postId, type);
    await loadFeed(true);
  };

  // Sprint 5.1 — Partage externe (Share API native + fallback web)
  const handleShare = async (post: FeedPost) => {
    const title = post.autoTitle || POST_TYPE_LABELS[post.postType] || '';
    const lines = [
      `🇲🇦 ${post.userName} sur Big Boss Fitness`,
      '',
      title || post.content,
      post.autoStats || '',
      '',
      '#BigBossFitness #فيتنس #Maroc',
    ].filter(Boolean);
    const message = lines.join('\n');

    if (Platform.OS === 'web') {
      try {
        // @ts-ignore — Web Share API
        if (typeof navigator !== 'undefined' && navigator.share) {
          // @ts-ignore
          await navigator.share({ title: 'Big Boss Fitness', text: message });
          return;
        }
      } catch {/* annulé */}
      try {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        if (typeof window !== 'undefined') { window.open(waUrl, '_blank'); return; }
      } catch {/* bloqué */}
      try {
        // @ts-ignore
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          // @ts-ignore
          await navigator.clipboard.writeText(message);
          // @ts-ignore
          if (typeof window !== 'undefined') window.alert('Publication copiée !');
        }
      } catch {/* ignore */}
      return;
    }

    try { await Share.share({ message }); } catch {/* annulé */}
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return "A l'instant";
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}j`;
  };

  const renderPost = ({ item }: { item: FeedPost }) => {
    const totalReactions = item.fireCount + item.muscleCount + item.lightningCount + item.trophyCount;
    const typeLabel = POST_TYPE_LABELS[item.postType];

    return (
      <View style={styles.postCard}>
        {/* Header */}
        <View style={styles.postHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.userName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.postHeaderInfo}>
            <Text style={styles.postUserName}>{item.userName}</Text>
            <Text style={styles.postTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          {typeLabel ? (
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{typeLabel}</Text>
            </View>
          ) : null}
        </View>

        {/* Content */}
        {item.autoTitle && (
          <Text style={styles.autoTitle}>{item.autoTitle}</Text>
        )}
        {item.autoStats && (
          <View style={styles.autoStatsRow}>
            <Ionicons name="barbell-outline" size={14} color={Colors.primary} />
            <Text style={styles.autoStats}>{item.autoStats}</Text>
          </View>
        )}
        {item.content && item.postType === 10 && (
          <Text style={styles.postContent}>{item.content}</Text>
        )}

        {/* Sprint 5.1 — Photo attachée au post */}
        {item.imageUrl && (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}

        {/* Reactions */}
        <View style={styles.reactionsRow}>
          {REACTIONS.map((r) => {
            const count = r.type === 1 ? item.fireCount : r.type === 2 ? item.muscleCount : r.type === 3 ? item.lightningCount : item.trophyCount;
            const isActive = item.myReaction === r.type;
            return (
              <TouchableOpacity
                key={r.type}
                style={[styles.reactionBtn, isActive && styles.reactionBtnActive]}
                onPress={() => handleReact(item.id, r.type)}
              >
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                {count > 0 && <Text style={styles.reactionCount}>{count}</Text>}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.commentBtn}
            onPress={() => router.push({ pathname: '/(main)/community/post', params: { id: item.id } } as any)}
          >
            <Ionicons name="chatbubble-outline" size={16} color={Colors.gray} />
            {item.commentCount > 0 && <Text style={styles.commentCount}>{item.commentCount}</Text>}
          </TouchableOpacity>

          {/* Sprint 5.1 — Bouton Share natif/web */}
          <TouchableOpacity style={styles.commentBtn} onPress={() => handleShare(item)}>
            <Ionicons name="share-social-outline" size={16} color={Colors.gray} />
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
          <Text style={styles.headerTitle}>Communauté</Text>
          <Text style={styles.headerSubtitle}>المجتمع</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => router.push('/(main)/community/buddies' as any)}
            style={styles.composeIconBtn}
          >
            <Ionicons name="people" size={20} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowCompose(!showCompose)} style={styles.composeIconBtn}>
            <Ionicons name="add" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Compose */}
      {showCompose && (
        <View style={styles.composeCard}>
          <TextInput
            style={styles.composeInput}
            placeholder="Partage ton resultat, ta motivation..."
            placeholderTextColor={Colors.lightGray}
            value={newPost}
            onChangeText={setNewPost}
            multiline
            maxLength={280}
          />

          {/* Photo preview */}
          {composePhotoBase64 && (
            <View style={styles.composePhotoPreview}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${composePhotoBase64}` }}
                style={{ width: '100%', height: 200, borderRadius: 12 }}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.composePhotoRemove}
                onPress={() => setComposePhotoBase64(null)}
              >
                <Ionicons name="close-circle" size={28} color={Colors.dark} />
              </TouchableOpacity>
            </View>
          )}

          {/* Action row: camera + galerie + publier */}
          <View style={styles.composeActions}>
            <TouchableOpacity
              style={styles.composeIconBtn}
              onPress={() => handlePickImage('camera')}
              disabled={posting}
            >
              <Ionicons name="camera-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.composeIconBtn}
              onPress={() => handlePickImage('gallery')}
              disabled={posting}
            >
              <Ionicons name="image-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[styles.postBtn, (!newPost.trim() && !composePhotoBase64) || posting ? styles.postBtnDisabled : null]}
              onPress={handlePost}
              disabled={(!newPost.trim() && !composePhotoBase64) || posting}
            >
              {posting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.postBtnText}>{uploadingImage ? 'Upload...' : 'Publier'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadFeed(true); setRefreshing(false); }} tintColor={Colors.primary} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore
            ? <View style={{ paddingVertical: 20 }}><ActivityIndicator size="small" color={Colors.primary} /></View>
            : (!hasMore && posts.length > 0)
              ? <Text style={styles.endText}>— Fin du feed —</Text>
              : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.lightGray} />
            <Text style={styles.emptyText}>Aucune publication</Text>
            <Text style={styles.emptySubtext}>Complete une seance pour publier automatiquement!</Text>
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
  composeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  composeCard: {
    backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  composeInput: { fontSize: Fonts.size.base, color: Colors.dark, minHeight: 60, textAlignVertical: 'top' },
  postBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  postBtnDisabled: { backgroundColor: Colors.lightGray },
  postBtnText: { ...Typography.button, color: Colors.white },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },

  postCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.family.displayBold,
    fontSize: Fonts.size.md,
    color: Colors.white,
  },
  postHeaderInfo: { flex: 1 },
  postUserName: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.base,
    color: Colors.dark,
  },
  postTime: { ...Typography.caption, color: Colors.lightGray },
  typeBadge: { backgroundColor: Colors.primaryDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: Fonts.size.xs, fontWeight: Fonts.weight.semiBold, color: Colors.primary },

  autoTitle: { ...Typography.bodyLarge, fontWeight: Fonts.weight.bold, color: Colors.dark, marginBottom: 4 },
  autoStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  autoStats: { ...Typography.body, color: Colors.gray },
  postContent: { ...Typography.body, color: Colors.dark, lineHeight: 22, marginBottom: 8 },

  reactionsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.background },
  reactionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.background,
  },
  reactionBtnActive: {
    backgroundColor: Colors.goldDim,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  reactionEmoji: { fontSize: 16 },
  reactionCount: { fontSize: Fonts.size.xs, fontWeight: Fonts.weight.bold, color: Colors.gray },
  commentBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto',
    paddingHorizontal: 10, paddingVertical: 6,
  },
  commentCount: { fontSize: Fonts.size.xs, fontWeight: Fonts.weight.bold, color: Colors.gray },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { ...Typography.body, color: Colors.gray, fontWeight: Fonts.weight.semiBold },
  emptySubtext: { ...Typography.caption, color: Colors.lightGray, textAlign: 'center' },
  endText: { textAlign: 'center', color: Colors.lightGray, fontSize: Fonts.size.xs, paddingVertical: 16, fontStyle: 'italic' },

  // Sprint 5.1 — Compose photo
  composePhotoPreview: { position: 'relative', marginTop: 10, marginBottom: 4 },
  composePhotoRemove: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14 },
  composeActions: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  composeIconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center', justifyContent: 'center',
  },
  postImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    marginTop: 10,
    backgroundColor: Colors.background,
  },
});
