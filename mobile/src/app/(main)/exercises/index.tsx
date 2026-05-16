import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { Exercise, MuscleGroup, DifficultyLevel } from '@/types/exercise.types';
import ExerciseService from '@/services/exercise.service';

const MUSCLE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  Chest: { label: 'Pectoraux', emoji: '💪', color: '#EF4444' },
  Back: { label: 'Dos', emoji: '🔙', color: '#3B82F6' },
  Quadriceps: { label: 'Quadriceps', emoji: '🦵', color: '#22C55E' },
  Hamstrings: { label: 'Ischio-jambiers', emoji: '🦿', color: '#16A34A' },
  Glutes: { label: 'Fessiers', emoji: '🍑', color: '#EC4899' },
  Calves: { label: 'Mollets', emoji: '🦶', color: '#4ADE80' },
  Shoulders: { label: 'Epaules', emoji: '🏋️', color: '#8B5CF6' },
  Biceps: { label: 'Biceps', emoji: '💪', color: '#F97316' },
  Triceps: { label: 'Triceps', emoji: '💪', color: '#EA580C' },
  Abs: { label: 'Abdominaux', emoji: '🧱', color: '#EAB308' },
  Bodyweight: { label: 'Full Body', emoji: '🏃', color: '#6366F1' },
  Cardio: { label: 'Cardio', emoji: '❤️', color: '#F43F5E' },
  Mobility: { label: 'Mobilite', emoji: '🧘', color: '#14B8A6' },
};

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Beginner: { label: 'Debutant', color: '#16A34A', bg: '#DCFCE7' },
  Intermediate: { label: 'Intermediaire', color: '#CA8A04', bg: '#FEF9C3' },
  Advanced: { label: 'Avance', color: '#DC2626', bg: '#FEE2E2' },
  Expert: { label: 'Expert', color: '#7C3AED', bg: '#EDE9FE' },
};

const DIFFICULTY_FILTERS = ['all', 'Beginner', 'Intermediate', 'Advanced'] as const;

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const muscle = MUSCLE_CONFIG[exercise.primaryMuscle] || { label: exercise.primaryMuscle, emoji: '💪', color: '#999' };
  const diff = DIFFICULTY_CONFIG[exercise.difficulty] || DIFFICULTY_CONFIG.Beginner;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/exercises/${exercise.id}`)}
    >
      {exercise.thumbnailUrl || exercise.gifPreviewUrl ? (
        <Image
          source={{ uri: exercise.thumbnailUrl || exercise.gifPreviewUrl }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Ionicons name="barbell-outline" size={22} color={Colors.lightGray} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{exercise.name || exercise.nameFr}</Text>
        <View style={styles.cardBadges}>
          <View style={[styles.badge, { backgroundColor: muscle.color + '18' }]}>
            <Text style={[styles.badgeText, { color: muscle.color }]}>{muscle.emoji} {muscle.label}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: diff.bg }]}>
            <Text style={[styles.badgeText, { color: diff.color }]}>{diff.label}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardArrow}>
        <Ionicons name="chevron-forward" size={18} color={Colors.lightGray} />
      </View>
    </TouchableOpacity>
  );
}

export default function ExercisesScreen() {
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const fetchExercises = useCallback(async () => {
    try {
      // Fetch first page to get total count
      const first = await ExerciseService.getExercises({ pageSize: 100, page: 1 });
      let all: Exercise[] = [...(first.items ?? [])];
      const total = first.totalCount || all.length;
      const totalPages = Math.ceil(total / 100);

      // Fetch remaining pages in parallel
      if (totalPages > 1) {
        const promises = [];
        for (let p = 2; p <= totalPages; p++) {
          promises.push(ExerciseService.getExercises({ pageSize: 100, page: p }));
        }
        const results = await Promise.all(promises);
        for (const r of results) {
          all = [...all, ...(r.items ?? [])];
        }
      }

      // Deduplicate
      const unique = Array.from(new Map(all.map(e => [e.id, e])).values());
      console.log(`Loaded ${unique.length}/${total} exercises`);
      setAllExercises(unique);
    } catch (err) {
      console.error('Failed to load exercises:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExercises(); }, [fetchExercises]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchExercises();
    setRefreshing(false);
  }, [fetchExercises]);

  // Filter exercises
  const filtered = useMemo(() => {
    return allExercises.filter(e => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = (e.name || e.nameFr || '').toLowerCase();
        const nameEn = (e.nameEn || '').toLowerCase();
        if (!name.includes(q) && !nameEn.includes(q)) return false;
      }
      if (selectedMuscle !== 'all' && e.primaryMuscle !== selectedMuscle) return false;
      if (selectedDifficulty !== 'all' && e.difficulty !== selectedDifficulty) return false;
      return true;
    });
  }, [allExercises, searchQuery, selectedMuscle, selectedDifficulty]);

  // Group by muscle
  const sections = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};
    for (const e of filtered) {
      const key = e.primaryMuscle;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
    return Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([muscle, data]) => ({
        title: muscle,
        data,
        count: data.length,
      }));
  }, [filtered]);

  // Muscle counts for filter chips
  const muscleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of allExercises) {
      counts[e.primaryMuscle] = (counts[e.primaryMuscle] || 0) + 1;
    }
    return counts;
  }, [allExercises]);

  const activeFilters = (selectedMuscle !== 'all' ? 1 : 0) + (selectedDifficulty !== 'all' ? 1 : 0);

  const toggleSection = (muscle: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(muscle)) next.delete(muscle); else next.add(muscle);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header gradient */}
      <LinearGradient
        colors={Colors.gradientHero as unknown as readonly [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View>
          <Text style={styles.headerTitle}>Exercices</Text>
          <Text style={styles.headerSubtitleAr}>التمارين</Text>
          <Text style={styles.headerCount}>{filtered.length} exercices{selectedMuscle !== 'all' || selectedDifficulty !== 'all' ? ' (filtré)' : ''}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'grouped' && styles.viewToggleActive]}
            onPress={() => setViewMode(viewMode === 'grouped' ? 'list' : 'grouped')}
          >
            <Ionicons name={viewMode === 'grouped' ? 'list' : 'grid-outline'} size={18}
              color={Colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher (FR, EN)..."
            placeholderTextColor={Colors.lightGray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.lightGray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters - always visible */}
      <View style={styles.filtersPanel}>
        <View style={styles.filterHeaderRow}>
          <Text style={styles.filterLabel}>Difficulte</Text>
          {activeFilters > 0 && (
            <TouchableOpacity style={styles.clearFilters} onPress={() => { setSelectedMuscle('all'); setSelectedDifficulty('all'); }}>
              <Ionicons name="close-circle" size={14} color={Colors.primary} />
              <Text style={styles.clearFiltersText}>Reinitialiser</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.filterRow}>
          {DIFFICULTY_FILTERS.map(d => {
            const isActive = selectedDifficulty === d;
            const cfg = d === 'all' ? null : DIFFICULTY_CONFIG[d];
            return (
              <TouchableOpacity key={d}
                style={[styles.filterPill, isActive && { backgroundColor: cfg?.color || Colors.primary }]}
                onPress={() => setSelectedDifficulty(d)}>
                <Text style={[styles.filterPillText, isActive && { color: '#FFF' }]}>
                  {d === 'all' ? 'Tous' : cfg?.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Muscle Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContent} style={styles.chipsWrap}>
        <TouchableOpacity
          style={[styles.chip, selectedMuscle === 'all' && styles.chipActive]}
          onPress={() => setSelectedMuscle('all')}>
          <Text style={[styles.chipText, selectedMuscle === 'all' && styles.chipTextActive]}>
            Tous ({allExercises.length})
          </Text>
        </TouchableOpacity>
        {Object.entries(MUSCLE_CONFIG).map(([key, cfg]) => {
          const count = muscleCounts[key] || 0;
          if (count === 0) return null;
          const isActive = selectedMuscle === key;
          return (
            <TouchableOpacity key={key}
              style={[styles.chip, isActive && { backgroundColor: cfg.color }]}
              onPress={() => setSelectedMuscle(isActive ? 'all' : key)}>
              <Text style={[styles.chipText, isActive && { color: '#FFF' }]}>
                {cfg.emoji} {cfg.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement des exercices...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="search-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Aucun exercice trouve</Text>
          <Text style={styles.emptyText}>Modifie ta recherche ou tes filtres</Text>
          <TouchableOpacity style={styles.resetBtn} onPress={() => { setSearchQuery(''); setSelectedMuscle('all'); setSelectedDifficulty('all'); }}>
            <Text style={styles.resetBtnText}>Reinitialiser</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === 'grouped' ? (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {sections.map((section) => {
            const cfg = MUSCLE_CONFIG[section.title] || { label: section.title, emoji: '💪', color: '#999' };
            const isExpanded = expandedSections.has(section.title);
            return (
              <View key={section.title} style={styles.sectionWrap}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => toggleSection(section.title)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.sectionDot, { backgroundColor: cfg.color }]} />
                  <Text style={styles.sectionTitle}>{cfg.emoji} {cfg.label}</Text>
                  <View style={styles.sectionCountBadge}>
                    <Text style={styles.sectionCountText}>{section.count}</Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18} color={Colors.gray}
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.sectionContent}>
                    {section.data.map((exercise) => (
                      <ExerciseCard key={exercise.id} exercise={exercise} />
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ExerciseCard exercise={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F0F5' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 44 : 12, paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 24,
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitleAr: {
    fontFamily: Fonts.family.arRegular,
    fontSize: Fonts.size.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: -2,
  },
  headerCount: {
    fontFamily: Fonts.family.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  viewToggle: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  viewToggleActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderColor: Colors.white,
  },
  filterToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    height: 36, borderRadius: 10, backgroundColor: '#F0F0F5',
    paddingHorizontal: 10,
  },
  filterToggleActive: { backgroundColor: Colors.primary },
  filterBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  // Search
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.white },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0F0F5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.dark, padding: 0 },

  // Filters panel
  filtersPanel: {
    backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  filterLabel: { fontSize: 12, fontWeight: '600', color: Colors.gray, marginBottom: 8, textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F0F0F5',
  },
  filterPillText: { fontSize: 13, fontWeight: '600', color: Colors.dark },
  clearFilters: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, alignSelf: 'flex-start',
  },
  clearFiltersText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },

  // Muscle chips
  chipsWrap: { maxHeight: 50, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  chipsContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F0F0F5', marginRight: 0,
  },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.dark },
  chipTextActive: { color: '#FFF' },

  filterHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },

  // Sections
  sectionWrap: { marginBottom: 8, borderRadius: 14, overflow: 'hidden', backgroundColor: Colors.white },
  sectionContent: { paddingHorizontal: 4, paddingBottom: 8 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.white,
  },
  sectionDot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.dark, flex: 1 },
  sectionCountBadge: {
    backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionCountText: { fontSize: 12, fontWeight: '700', color: Colors.gray },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 14, padding: 10,
    marginBottom: 8, marginHorizontal: 4,
  },
  cardImage: { width: 56, height: 56, borderRadius: 12, marginRight: 12, backgroundColor: '#F0F0F5' },
  cardImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: Colors.dark, marginBottom: 5 },
  cardBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardArrow: { paddingLeft: 8 },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { fontSize: 14, color: Colors.gray, marginTop: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryDim,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark, marginBottom: 6 },
  emptyText: { fontSize: 14, color: Colors.gray, marginBottom: 16 },
  resetBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  resetBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
});
