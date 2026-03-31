import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { CoachService, CoachMessage } from '@/services/coach.service';

interface Conversation {
  id: string;
  date: string;
  title: string;
  preview: string;
  messageCount: number;
  messages: CoachMessage[];
}

function groupMessagesIntoConversations(messages: CoachMessage[]): Conversation[] {
  if (!messages.length) return [];

  // Sort by date ascending
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const conversations: Conversation[] = [];
  let currentConv: CoachMessage[] = [];
  let lastTime = 0;

  for (const msg of sorted) {
    const msgTime = new Date(msg.createdAt).getTime();

    // New conversation if gap > 5 minutes
    if (lastTime > 0 && msgTime - lastTime > 5 * 60 * 1000) {
      if (currentConv.length > 0) {
        conversations.push(buildConversation(currentConv));
      }
      currentConv = [];
    }

    currentConv.push(msg);
    lastTime = msgTime;
  }

  // Last group
  if (currentConv.length > 0) {
    conversations.push(buildConversation(currentConv));
  }

  // Reverse: most recent first
  return conversations.reverse();
}

function buildConversation(messages: CoachMessage[]): Conversation {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  const firstAiMsg = messages.find((m) => m.role === 'assistant');
  const title = firstUserMsg?.content.slice(0, 60) || 'Conversation';
  const preview = firstAiMsg?.content.slice(0, 80) || '';

  return {
    id: messages[0].id,
    date: messages[0].createdAt,
    title: title + (title.length >= 60 ? '...' : ''),
    preview: preview + (preview.length >= 80 ? '...' : ''),
    messageCount: messages.length,
    messages,
  };
}

export default function CoachHistoryScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const history = await CoachService.getHistory(1, 200);
      console.log('History loaded:', history.messages.length, 'messages');
      const convs = groupMessagesIntoConversations(history.messages);
      console.log('Grouped into:', convs.length, 'conversations');
      setConversations(convs);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Detail view of a conversation
  if (selectedConv) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedConv(null)}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{selectedConv.title}</Text>
            <Text style={styles.headerSub}>{formatDate(selectedConv.date)} - {selectedConv.messageCount} messages</Text>
          </View>
        </View>

        <FlatList
          data={selectedConv.messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item }) => {
            const isUser = item.role === 'user';
            return (
              <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAI]}>
                {!isUser && (
                  <View style={styles.aiAvatar}>
                    <Ionicons name="fitness" size={14} color={Colors.primary} />
                  </View>
                )}
                <View style={[styles.msgBubble, isUser ? styles.userBubble : styles.aiBubble]}>
                  <Text style={[styles.msgText, isUser ? styles.userText : styles.aiText]}>
                    {item.content}
                  </Text>
                  <Text style={[styles.msgTime, isUser ? styles.userTime : styles.aiTime]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => {
            // Navigate back to coach chat with these messages preloaded
            router.replace({
              pathname: '/coach',
              params: { resumeMessages: JSON.stringify(selectedConv.messages) },
            });
          }}
        >
          <Ionicons name="chatbubble" size={18} color={Colors.white} />
          <Text style={styles.continueBtnText}>Continuer cette conversation</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // List view
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/coach')}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historique ({conversations.length})</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={56} color={Colors.border} />
          <Text style={styles.emptyText}>Aucune conversation</Text>
          <Text style={styles.emptySubtext}>Commence a discuter avec ton coach IA!</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.convCard}
              onPress={() => setSelectedConv(item)}
              activeOpacity={0.7}
            >
              <View style={styles.convIconBox}>
                <Ionicons name="chatbubbles" size={20} color={Colors.primary} />
              </View>
              <View style={styles.convContent}>
                <View style={styles.convTopRow}>
                  <Text style={styles.convTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.convDate}>{formatDate(item.date)}</Text>
                </View>
                <Text style={styles.convPreview} numberOfLines={2}>{item.preview}</Text>
                <View style={styles.convMeta}>
                  <Ionicons name="chatbubble-outline" size={12} color={Colors.gray} />
                  <Text style={styles.convMetaText}>{item.messageCount} messages</Text>
                  <Text style={styles.convMetaText}> - {formatTime(item.date)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.lightGray} />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F0F5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 44 : 12, paddingBottom: 14,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark },
  headerSub: { fontSize: 12, color: Colors.gray, marginTop: 2 },

  // List
  listContent: { padding: 16 },
  convCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
  },
  convIconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryDim, alignItems: 'center', justifyContent: 'center',
  },
  convContent: { flex: 1 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  convTitle: { fontSize: 15, fontWeight: '600', color: Colors.dark, flex: 1, marginRight: 8 },
  convDate: { fontSize: 11, color: Colors.gray },
  convPreview: { fontSize: 13, color: Colors.gray, lineHeight: 18, marginBottom: 4 },
  convMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  convMetaText: { fontSize: 11, color: Colors.lightGray },
  separator: { height: 8 },

  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.gray, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: Colors.lightGray, marginTop: 4 },

  // Message detail
  messagesList: { padding: 12 },
  msgRow: { flexDirection: 'row', marginBottom: 8, maxWidth: '82%' },
  msgRowUser: { alignSelf: 'flex-end' },
  msgRowAI: { alignSelf: 'flex-start' },
  aiAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primaryDim, alignItems: 'center', justifyContent: 'center',
    marginRight: 8, marginTop: 4,
  },
  msgBubble: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, flexShrink: 1 },
  userBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: 6 },
  aiBubble: { backgroundColor: Colors.white, borderBottomLeftRadius: 6 },
  msgText: { fontSize: 15, lineHeight: 22 },
  userText: { color: Colors.white },
  aiText: { color: Colors.dark },
  msgTime: { fontSize: 10, marginTop: 4 },
  userTime: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  aiTime: { color: Colors.lightGray },

  continueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, margin: 16, padding: 14, borderRadius: 14,
  },
  continueBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
