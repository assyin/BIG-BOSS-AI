import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SignalR from '@microsoft/signalr';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { getLiveChatHubUrl, LiveChatMessage } from '@/services/lives.service';
import { TokenManager } from '@/services/api';

/**
 * Sprint 5.3 — Panneau de chat live temps réel via SignalR.
 *
 * Connexion automatique sur mount → JoinLive → écoute MessageReceived/LikeReceived.
 * Disconnect propre sur unmount.
 */
interface Props {
  liveId: string;
  onLike?: () => void;
}

export function LiveChatPanel({ liveId, onLike }: Props) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [text, setText] = useState('');
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [likes, setLikes] = useState(0);
  const connectionRef = useRef<SignalR.HubConnection | null>(null);

  // Connect on mount
  useEffect(() => {
    let active = true;

    const connect = async () => {
      try {
        const token = await TokenManager.getAccessToken();
        if (!token) {
          console.warn('[LiveChat] no auth token');
          return;
        }

        const connection = new SignalR.HubConnectionBuilder()
          .withUrl(getLiveChatHubUrl(), {
            accessTokenFactory: () => token,
          })
          .withAutomaticReconnect()
          .configureLogging(SignalR.LogLevel.Warning)
          .build();

        connection.on('MessageReceived', (msg: LiveChatMessage) => {
          setMessages((prev) => [...prev, msg]);
        });

        connection.on('LikeReceived', (payload: { totalLikes: number }) => {
          setLikes(payload.totalLikes);
        });

        connection.on('Moderated', (payload: { reason: string }) => {
          Alert.alert('Modération', payload.reason);
        });

        connection.onclose(() => {
          if (active) setConnected(false);
        });

        await connection.start();
        if (!active) {
          await connection.stop();
          return;
        }

        const join = await connection.invoke<{ joined: boolean; history: LiveChatMessage[] }>(
          'JoinLive', liveId
        );
        if (join?.history && active) setMessages(join.history);
        connectionRef.current = connection;
        setConnected(true);
      } catch (e) {
        console.error('[LiveChat] connect failed:', e);
      }
    };

    connect();
    return () => {
      active = false;
      const conn = connectionRef.current;
      if (conn) {
        conn.invoke('LeaveLive', liveId).catch(() => {});
        conn.stop().catch(() => {});
      }
      connectionRef.current = null;
    };
  }, [liveId]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !connectionRef.current || sending) return;
    setSending(true);
    try {
      await connectionRef.current.invoke('SendMessage', liveId, text.trim());
      setText('');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible d\'envoyer');
    } finally {
      setSending(false);
    }
  }, [text, liveId, sending]);

  const handleLike = useCallback(async () => {
    if (!connectionRef.current) return;
    try {
      await connectionRef.current.invoke('SendLike', liveId);
      onLike?.();
    } catch {}
  }, [liveId, onLike]);

  const timeAgo = (date: string) => {
    const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}min`;
    return `${Math.floor(sec / 3600)}h`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="chatbubbles" size={18} color={Colors.dark} />
          <Text style={styles.headerTitle}>Chat live</Text>
          {connected && <View style={styles.dot} />}
        </View>
        <TouchableOpacity style={styles.likeBtn} onPress={handleLike}>
          <Ionicons name="heart" size={18} color={Colors.error} />
          {likes > 0 && <Text style={styles.likeCount}>{likes}</Text>}
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <View style={styles.msgRow}>
            <Text style={styles.msgUser}>{item.userName}</Text>
            <Text style={styles.msgText}>{item.content}</Text>
            <Text style={styles.msgTime}>{timeAgo(item.createdAt)}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {connected ? 'Sois le premier à réagir 🔥' : 'Connexion au chat...'}
          </Text>
        }
        inverted={false}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={connected ? 'Écris ton message...' : 'Connexion...'}
          placeholderTextColor={Colors.lightGray}
          editable={connected && !sending}
          maxLength={500}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity onPress={handleSend} disabled={!connected || !text.trim() || sending}>
          {sending ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons
              name="send"
              size={22}
              color={text.trim() && connected ? Colors.primary : Colors.lightGray}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.background,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: Fonts.size.md, fontWeight: Fonts.weight.semiBold, color: Colors.dark },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success, marginLeft: 4 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.background, borderRadius: 14 },
  likeCount: { fontSize: Fonts.size.sm, fontWeight: Fonts.weight.bold, color: Colors.dark },
  listContent: { padding: 12, flexGrow: 1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingVertical: 4 },
  msgUser: { fontSize: Fonts.size.sm, fontWeight: Fonts.weight.bold, color: Colors.primary },
  msgText: { flex: 1, fontSize: Fonts.size.sm, color: Colors.dark },
  msgTime: { fontSize: 10, color: Colors.lightGray },
  emptyText: { textAlign: 'center', color: Colors.lightGray, fontSize: Fonts.size.sm, paddingVertical: 40 },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingBottom: Platform.OS === 'android' ? 16 : 10,
  },
  input: { flex: 1, fontSize: Fonts.size.base, color: Colors.dark, paddingVertical: 6 },
});

export default LiveChatPanel;
