import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { Session, SessionStatus } from '@/types/session.types';
import SessionService from '@/services/session.service';
import { Button } from '@/components/ui/Button';

type TabMode = 'history' | 'active';

const STATUS_CONFIG: Record<SessionStatus, { label: string; color: string; bg: string }> = {
  Generated: { label: 'Generee', color: Colors.info, bg: Colors.infoLight },
  InProgress: { label: 'En cours', color: Colors.warning, bg: Colors.warningLight },
  Completed: { label: 'Terminee', color: Colors.success, bg: Colors.successLight },
  Abandoned: { label: 'Abandonnee', color: Colors.error, bg: Colors.errorLight },
};

function StatusBadge({ status }: { status: SessionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function SessionItem({ session }: { session: Session }) {
  return (
    <TouchableOpacity
      style={styles.sessionCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/sessions/${session.id}`)}
    >
      <View style={styles.sessionCardTop}>
        <View style={styles.sessionIconBox}>
          <Ionicons name="barbell-outline" size={20} color={Colors.primary} />
        </View>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {session.title}
          </Text>
          <Text style={styles.sessionDate}>{formatDate(session.generatedAt)}</Text>
        </View>
        <StatusBadge status={session.status} />
      </View>
      <View style={styles.sessionMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={Colors.gray} />
          <Text style={styles.metaText}>
            {session.stats?.actualDurationMinutes ?? session.plannedDurationMinutes} min
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="fitness-outline" size={14} color={Colors.gray} />
          <Text style={styles.metaText}>
            {session.stats?.totalVolumeKg
              ? `${session.stats.totalVolumeKg.toLocaleString()} kg`
              : `${(session.exercises || []).length} exercices`}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="layers-outline" size={14} color={Colors.gray} />
          <Text style={styles.metaText}>
            {session.stats?.totalSets ?? (session.exercises || []).reduce((a, e) => a + e.setsPlanned, 0)} sets
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ mode }: { mode: TabMode }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBox}>
        <Ionicons
          name={mode === 'history' ? 'time-outline' : 'barbell-outline'}
          size={48}
          color={Colors.primary}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {mode === 'history' ? 'Aucun historique' : 'Aucune seance en cours'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {mode === 'history'
          ? 'Tes seances terminees apparaitront ici.'
          : 'Genere une seance pour commencer !'}
      </Text>
    </View>
  );
}

export default function SessionsScreen() {
  const [activeTab, setActiveTab] = useState<TabMode>('active');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setError(null);
      const data = await SessionService.getSessions(1, 50);
      setSessions(data);
    } catch (err) {
      setError('Impossible de charger les seances');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSessions();
    setRefreshing(false);
  }, [fetchSessions]);

  const filteredSessions = sessions.filter((s) => {
    if (activeTab === 'active') {
      return s.status === 'Generated' || s.status === 'InProgress';
    }
    return s.status === 'Completed' || s.status === 'Abandoned';
  });

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={Colors.gradientHero as unknown as readonly [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerContainer}
      >
        <Text style={styles.headerTitle}>Mes Séances</Text>
        <Text style={styles.headerSubtitle}>حصصك</Text>
      </LinearGradient>

      <View style={styles.generateRow}>
        <Button
          title="Generer une seance"
          onPress={() => router.push('/sessions/generate')}
          variant="primary"
          fullWidth
          size="lg"
        />
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, activeTab === 'active' && styles.toggleButtonActive]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="flash-outline"
            size={16}
            color={activeTab === 'active' ? Colors.white : Colors.gray}
          />
          <Text style={[styles.toggleText, activeTab === 'active' && styles.toggleTextActive]}>
            En cours
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, activeTab === 'history' && styles.toggleButtonActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === 'history' ? Colors.white : Colors.gray}
          />
          <Text style={[styles.toggleText, activeTab === 'history' && styles.toggleTextActive]}>
            Historique
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SessionItem session={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState mode={activeTab} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontFamily: Fonts.family.arRegular,
    fontSize: Fonts.size.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  generateRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.gray,
  },
  toggleTextActive: {
    color: Colors.white,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  sessionDate: {
    ...Typography.caption,
    color: Colors.lightGray,
    marginTop: 2,
  },
  sessionMeta: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Typography.caption,
    color: Colors.gray,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.semiBold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.dark,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.gray,
    textAlign: 'center',
  },
});
