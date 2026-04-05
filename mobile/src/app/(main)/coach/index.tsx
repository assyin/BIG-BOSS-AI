import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { CoachService, CoachMessage, CoachQuota } from '@/services/coach.service';

// Typing dots animation
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, easing: Easing.ease, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );
    const a1 = animateDot(dot1, 0);
    const a2 = animateDot(dot2, 200);
    const a3 = animateDot(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={styles.typingRow}>
      <View style={styles.aiAvatar}>
        <Ionicons name="fitness" size={14} color={Colors.primary} />
      </View>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, dotStyle(dot1)]} />
        <Animated.View style={[styles.typingDot, dotStyle(dot2)]} />
        <Animated.View style={[styles.typingDot, dotStyle(dot3)]} />
      </View>
    </View>
  );
}

const SUGGESTIONS = [
  { icon: 'barbell-outline' as const, text: 'Comment ameliorer mon developpe couche?' },
  { icon: 'nutrition-outline' as const, text: 'Combien de proteines par jour pour la masse?' },
  { icon: 'fitness-outline' as const, text: 'Quel etirement apres le leg day?' },
  { icon: 'flame-outline' as const, text: 'Programme seche efficace?' },
  { icon: 'moon-outline' as const, text: 'Combien de repos entre les seances?' },
  { icon: 'heart-outline' as const, text: 'Je suis demotive, aide moi' },
];

export default function CoachScreen() {
  const params = useLocalSearchParams<{ resumeMessages?: string }>();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [quota, setQuota] = useState<CoachQuota | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const loadQuota = useCallback(async () => {
    try {
      const q = await CoachService.getQuota();
      setQuota(q);
    } catch {}
    setLoadingHistory(false);
  }, []);

  useEffect(() => { loadQuota(); }, [loadQuota]);

  // Resume conversation from history
  useEffect(() => {
    if (params.resumeMessages) {
      try {
        const resumed = JSON.parse(params.resumeMessages);
        setMessages(resumed);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
      } catch {}
    }
  }, [params.resumeMessages]);

  const handleSend = async (text?: string) => {
    const msg = (text || inputText).trim();
    if (!msg || sending) return;

    if (quota && quota.remaining <= 0) {
      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`, role: 'assistant',
        content: "Tu as atteint ta limite de messages pour aujourd'hui. Reviens demain ou passe a Premium pour plus de messages! 💪",
        createdAt: new Date().toISOString(),
      }]);
      return;
    }

    const userMsg: CoachMessage = {
      id: `temp-${Date.now()}`, role: 'user',
      content: msg, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSending(true);

    try {
      const response = await CoachService.sendMessage(msg);
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== userMsg.id);
        return [...filtered, response.userMessage, response.assistantMessage];
      });
      if (response.quota) setQuota(response.quota);
      else if (quota) setQuota({ ...quota, used: quota.used + 1, remaining: quota.remaining - 1 });
    } catch {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`, role: 'assistant',
        content: "Desole, je n'ai pas pu repondre. Reessaie dans un instant.",
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleNewConversation = () => {
    // Start fresh: clear local messages but keep server history
    setMessages([]);
    setShowMenu(false);
    setInputText('');
  };

  const handleViewHistory = () => {
    setShowMenu(false);
    router.push('/coach/history');
  };

  const handleClearHistory = () => {
    const doIt = () => {
      CoachService.clearHistory().then(() => {
        setMessages([]);
        CoachService.getQuota().then(q => setQuota(q)).catch(() => {});
      }).catch(() => {});
      setShowMenu(false);
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Effacer tout l\'historique?\nCette action est irreversible.')) doIt();
    } else {
      Alert.alert('Effacer l\'historique', 'Cette action est irreversible.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Effacer', style: 'destructive', onPress: doIt },
      ]);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg, i) => {
    const dateKey = new Date(msg.createdAt).toDateString();
    const prevDateKey = i > 0 ? new Date(messages[i - 1].createdAt).toDateString() : null;
    if (dateKey !== prevDateKey) {
      acc.push({ type: 'date' as const, id: `date-${dateKey}`, date: msg.createdAt });
    }
    acc.push({ type: 'message' as const, ...msg });
    return acc;
  }, [] as any[]);

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <View style={styles.dateLine} />
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
          <View style={styles.dateLine} />
        </View>
      );
    }

    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAI]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="fitness" size={14} color={Colors.primary} />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {item.content}
          </Text>
          {!isUser && item.audioUrl && (
            <TouchableOpacity
              style={styles.audioBtn}
              onPress={() => {
                const { Audio } = require('expo-av');
                const sound = new Audio.Sound();
                const url = item.audioUrl!.startsWith('http') ? item.audioUrl! : `${require('@/constants/api').API_CONFIG.BASE_URL}${item.audioUrl}`;
                sound.loadAsync({ uri: url }).then(() => sound.playAsync());
              }}
            >
              <Ionicons name="volume-high" size={16} color={Colors.primary} />
              <Text style={styles.audioBtnText}>Ecouter</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.messageTime, isUser ? styles.userTime : styles.aiTime]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (loadingHistory) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBox}>
          <Ionicons name="fitness" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Salut! Je suis Big Boss 💪</Text>
        <Text style={styles.emptyText}>
          Ton coach IA personnel. Pose-moi tes questions sur l'entrainement, la nutrition ou la recuperation.
        </Text>
        <Text style={styles.emptySubtext}>
          {quota && quota.limit < 999
            ? `${quota.remaining} messages restants aujourd'hui`
            : 'Messages illimites'}
        </Text>

        <View style={styles.suggestionsGrid}>
          {SUGGESTIONS.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={styles.suggestionCard}
              onPress={() => handleSend(s.text)}
              activeOpacity={0.7}
            >
              <Ionicons name={s.icon} size={20} color={Colors.primary} style={{ marginBottom: 6 }} />
              <Text style={styles.suggestionText} numberOfLines={2}>{s.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Ionicons name="fitness" size={20} color={Colors.white} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Coach Big Boss</Text>
              <View style={styles.headerStatusRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerSub}>En ligne</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            {quota && (
              <View style={styles.quotaBadge}>
                <Text style={styles.quotaText}>
                  {quota.remaining}/{quota.limit}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.historyButton}
              onPress={handleViewHistory}
            >
              <Ionicons name="time-outline" size={18} color={Colors.primary} />
              <Text style={styles.historyButtonText}>Historique</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowMenu(!showMenu)}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={Colors.dark} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu dropdown */}
        {showMenu && (
          <View style={styles.menuDropdown}>
            <TouchableOpacity style={styles.menuItem} onPress={handleNewConversation}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.dark} />
              <Text style={styles.menuItemText}>Nouvelle conversation</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleClearHistory}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
              <Text style={[styles.menuItemText, { color: Colors.error }]}>Effacer l'historique</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={groupedMessages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.messagesList, messages.length === 0 && { flex: 1 }]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: true });
          }}
          onTouchStart={() => showMenu && setShowMenu(false)}
        />

        {/* Typing Indicator */}
        {sending && <TypingIndicator />}

        {/* Quick suggestions when conversation active */}
        {messages.length > 0 && !sending && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickSuggestions} contentContainerStyle={styles.quickSuggestionsContent}>
            {['Merci!', 'Plus de details', 'Un autre conseil', 'Et pour la nutrition?'].map((s, i) => (
              <TouchableOpacity key={i} style={styles.quickChip} onPress={() => handleSend(s)}>
                <Text style={styles.quickChipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input Area */}
        <View style={styles.inputArea}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Ecris ton message..."
              placeholderTextColor={Colors.lightGray}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!sending}
              onSubmitEditing={() => handleSend()}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
              onPress={() => handleSend()}
              disabled={!inputText.trim() || sending}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={18} color={!inputText.trim() || sending ? Colors.lightGray : Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F0F5' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 44 : 12, paddingBottom: 12,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.dark },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34C759' },
  headerSub: { fontSize: 12, color: '#34C759', fontWeight: '500' },

  quotaBadge: {
    backgroundColor: Colors.primaryDim, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  quotaText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  historyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primaryDim, borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  historyButtonText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  menuButton: { padding: 8, borderRadius: 20 },

  // Menu dropdown
  menuDropdown: {
    position: 'absolute', top: Platform.OS === 'android' ? 90 : 58, right: 16,
    backgroundColor: Colors.white, borderRadius: 12, paddingVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
    elevation: 8, zIndex: 100, minWidth: 220,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  menuItemText: { fontSize: 14, color: Colors.dark, fontWeight: '500' },
  menuItemDanger: { borderTopWidth: 1, borderTopColor: Colors.border },

  // Date separator
  dateSeparator: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingHorizontal: 8,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dateText: {
    fontSize: 11, color: Colors.gray, fontWeight: '600',
    paddingHorizontal: 12, textTransform: 'uppercase',
  },

  // Messages
  messagesList: { paddingHorizontal: 12, paddingVertical: 8 },
  messageRow: { flexDirection: 'row', marginBottom: 8, maxWidth: '82%' },
  messageRowUser: { alignSelf: 'flex-end' },
  messageRowAI: { alignSelf: 'flex-start' },
  aiAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primaryDim, alignItems: 'center', justifyContent: 'center',
    marginRight: 8, marginTop: 4,
  },
  messageBubble: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, flexShrink: 1 },
  userBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: 6 },
  aiBubble: {
    backgroundColor: Colors.white, borderBottomLeftRadius: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: Colors.white },
  aiText: { color: Colors.dark },
  messageTime: { fontSize: 10, marginTop: 4 },
  userTime: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  aiTime: { color: Colors.lightGray },

  // Typing
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,107,43,0.1)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  audioBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  typingBubble: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 20, borderBottomLeftRadius: 6,
    paddingHorizontal: 16, paddingVertical: 12, gap: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.gray },

  // Quick suggestions
  quickSuggestions: { maxHeight: 44, backgroundColor: '#F0F0F5' },
  quickSuggestionsContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  quickChip: {
    backgroundColor: Colors.white, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.border, marginRight: 8,
  },
  quickChipText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },

  // Input Area
  inputArea: {
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: '#F0F0F5', borderRadius: 24,
    paddingLeft: 16, paddingRight: 4, paddingVertical: 4, minHeight: 48,
  },
  textInput: { flex: 1, fontSize: 15, color: Colors.dark, maxHeight: 100, paddingVertical: 8 },
  sendButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: Colors.border },

  // Empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyIconBox: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primaryDim, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: Colors.dark, marginBottom: 8 },
  emptyText: { fontSize: 15, color: Colors.gray, textAlign: 'center', lineHeight: 22, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginBottom: 24 },
  loadingText: { fontSize: 14, color: Colors.gray, marginTop: 12 },

  // Suggestions grid
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%', justifyContent: 'center' },
  suggestionCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, width: '47%',
    borderWidth: 1, borderColor: Colors.border, alignItems: 'flex-start',
  },
  suggestionText: { fontSize: 13, color: Colors.dark, fontWeight: '500', lineHeight: 18 },
});
