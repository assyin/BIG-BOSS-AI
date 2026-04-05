import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  Platform, ActivityIndicator, RefreshControl, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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

  const loadFeed = useCallback(async () => {
    try {
      const data = await FeedService.getFeed(1, 30);
      setPosts(data);
    } catch (err) { console.error(err); }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    loadFeed().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadFeed]));

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      await FeedService.createPost(newPost.trim());
      setNewPost('');
      setShowCompose(false);
      await loadFeed();
    } catch { Alert.alert('Erreur', 'Impossible de publier'); }
    finally { setPosting(false); }
  };

  const handleReact = async (postId: string, type: number) => {
    await FeedService.react(postId, type);
    await loadFeed();
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
        <Text style={styles.headerTitle}>Communaute</Text>
        <TouchableOpacity onPress={() => setShowCompose(!showCompose)}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

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
          <TouchableOpacity
            style={[styles.postBtn, (!newPost.trim() || posting) && styles.postBtnDisabled]}
            onPress={handlePost}
            disabled={!newPost.trim() || posting}
          >
            {posting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.postBtnText}>Publier</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadFeed(); setRefreshing(false); }} tintColor={Colors.primary} />}
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
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 48 : 12, paddingBottom: 12,
  },
  headerTitle: { ...Typography.h4, color: Colors.dark },

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
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: Fonts.size.md, fontWeight: Fonts.weight.bold, color: Colors.white },
  postHeaderInfo: { flex: 1 },
  postUserName: { ...Typography.body, fontWeight: Fonts.weight.bold, color: Colors.dark },
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
  reactionBtnActive: { backgroundColor: Colors.primaryDim },
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
});
