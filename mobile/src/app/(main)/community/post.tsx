import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  Platform, ActivityIndicator, TextInput, KeyboardAvoidingView,
  Image, Share, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import FeedService, { FeedPost, FeedComment, REACTION_EMOJIS, POST_TYPE_LABELS } from '@/services/feed.service';

const REACTIONS = [
  { type: 1, emoji: '🔥' },
  { type: 2, emoji: '💪' },
  { type: 3, emoji: '⚡' },
  { type: 4, emoji: '🏆' },
];

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      FeedService.getPost(id).then(setPost),
      FeedService.getComments(id).then(setComments),
    ]).finally(() => setLoading(false));
  }, [id]);

  const handleComment = async () => {
    if (!id || !newComment.trim()) return;
    setCommenting(true);
    try {
      await FeedService.comment(id, newComment.trim());
      setNewComment('');
      const updated = await FeedService.getComments(id);
      setComments(updated);
    } catch {}
    finally { setCommenting(false); }
  };

  const handleReact = async (type: number) => {
    if (!id) return;
    await FeedService.react(id, type);
    const updated = await FeedService.getPost(id);
    setPost(updated);
  };

  // Sprint 5.1 — Share du post detail
  const handleShare = async () => {
    if (!post) return;
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
        // @ts-ignore
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><Text style={styles.emptyText}>Post introuvable</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publication</Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-social-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{post.userName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{post.userName}</Text>
                  <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
                </View>
              </View>
              {post.autoTitle && <Text style={styles.autoTitle}>{post.autoTitle}</Text>}
              {post.autoStats && <Text style={styles.autoStats}>{post.autoStats}</Text>}
              {post.content && post.postType === 10 && <Text style={styles.content}>{post.content}</Text>}

              {/* Sprint 5.1 — Photo attachée au post */}
              {post.imageUrl && (
                <Image
                  source={{ uri: post.imageUrl }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              )}

              <View style={styles.reactionsRow}>
                {REACTIONS.map((r) => {
                  const count = r.type === 1 ? post.fireCount : r.type === 2 ? post.muscleCount : r.type === 3 ? post.lightningCount : post.trophyCount;
                  return (
                    <TouchableOpacity key={r.type} style={[styles.reactionBtn, post.myReaction === r.type && styles.reactionActive]} onPress={() => handleReact(r.type)}>
                      <Text style={{ fontSize: 18 }}>{r.emoji}</Text>
                      {count > 0 && <Text style={styles.reactionCount}>{count}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.commentsTitle}>{comments.length} commentaire{comments.length !== 1 ? 's' : ''}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>{item.userName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.commentBubble}>
                <Text style={styles.commentUser}>{item.userName}</Text>
                <Text style={styles.commentText}>{item.content}</Text>
                <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyComments}>
              <Ionicons name="chatbubbles-outline" size={36} color={Colors.lightGray} />
              <Text style={styles.emptyCommentsText}>Aucun commentaire</Text>
              <Text style={styles.emptyCommentsSubtext}>Sois le premier à réagir 💬</Text>
            </View>
          }
        />

        {/* Comment input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ecrire un commentaire..."
            placeholderTextColor={Colors.lightGray}
            value={newComment}
            onChangeText={setNewComment}
            maxLength={500}
          />
          <TouchableOpacity onPress={handleComment} disabled={!newComment.trim() || commenting}>
            {commenting ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="send" size={22} color={newComment.trim() ? Colors.primary : Colors.lightGray} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },

  postCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: Fonts.size.lg, fontWeight: Fonts.weight.bold, color: Colors.white },
  userName: { ...Typography.body, fontWeight: Fonts.weight.bold, color: Colors.dark },
  postTime: { ...Typography.caption, color: Colors.lightGray },
  autoTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 4 },
  autoStats: { ...Typography.body, color: Colors.gray, marginBottom: 8 },
  content: { ...Typography.body, color: Colors.dark, lineHeight: 22, marginBottom: 8 },

  reactionsRow: { flexDirection: 'row', gap: 8, marginBottom: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.background },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.background },
  reactionActive: { backgroundColor: Colors.primaryDim },
  reactionCount: { fontSize: Fonts.size.sm, fontWeight: Fonts.weight.bold, color: Colors.gray },

  commentsTitle: { ...Typography.body, fontWeight: Fonts.weight.bold, color: Colors.dark },

  commentRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { fontSize: Fonts.size.sm, fontWeight: Fonts.weight.bold, color: Colors.gray },
  commentBubble: { flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 10 },
  commentUser: { fontSize: Fonts.size.sm, fontWeight: Fonts.weight.bold, color: Colors.dark },
  commentText: { ...Typography.body, color: Colors.dark, marginTop: 2 },
  commentTime: { fontSize: Fonts.size.xs, color: Colors.lightGray, marginTop: 4 },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, paddingHorizontal: 16,
    paddingVertical: 10, paddingBottom: Platform.OS === 'android' ? 24 : 10,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: { flex: 1, fontSize: Fonts.size.base, color: Colors.dark, padding: 0 },
  emptyText: { ...Typography.body, color: Colors.gray },

  // Sprint 5.1
  postImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    marginVertical: 10,
    backgroundColor: Colors.background,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 6,
  },
  emptyCommentsText: {
    ...Typography.body,
    color: Colors.gray,
    fontWeight: Fonts.weight.semiBold,
    marginTop: 8,
  },
  emptyCommentsSubtext: {
    ...Typography.caption,
    color: Colors.lightGray,
  },
});
