import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { useFavoritesStore } from '@/store/favorites.store';
import RecipeService, {
  RecipeListItem,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from '@/services/recipe.service';

const CATEGORIES = [
  { key: 0, label: 'Tous', icon: 'apps-outline' },
  { key: 1, label: 'Petit-dej', icon: 'sunny-outline' },
  { key: 2, label: 'Dejeuner', icon: 'restaurant-outline' },
  { key: 3, label: 'Diner', icon: 'moon-outline' },
  { key: 4, label: 'Collation', icon: 'cafe-outline' },
  { key: 7, label: 'Smoothie', icon: 'water-outline' },
];

const DIET_FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'vegetarian', label: 'Veg' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'glutenFree', label: 'Sans gluten' },
  { key: 'ramadan', label: 'Ramadan' },
  { key: 'bulking', label: 'Masse' },
  { key: 'cutting', label: 'Seche' },
];

// Priorite: Moroccan > Arabic > Islamic > other
const PRIORITY_KEYWORDS = [
  ['moroccan', 'marocain', 'tagine', 'couscous', 'harira', 'pastilla', 'baghrir', 'msemen', 'rfissa', 'briouate', 'zaalouk', 'chermoula', 'taktouka'],
  ['arabic', 'arabe', 'lebanese', 'libanais', 'syrian', 'egyptian', 'palestinian', 'jordanian', 'hummus', 'falafel', 'tabbouleh', 'fattoush', 'shawarma', 'kibbeh', 'mujadara', 'manakish', 'labneh'],
  ['halal', 'islamic', 'ramadan', 'iftar', 'suhoor', 'turkish', 'turc', 'persian', 'afghan', 'pakistani', 'yemeni', 'ful medames', 'shakshouka'],
];

function getRecipePriority(title: string): number {
  const lower = title.toLowerCase();
  for (let i = 0; i < PRIORITY_KEYWORDS.length; i++) {
    if (PRIORITY_KEYWORDS[i].some(kw => lower.includes(kw))) return i;
  }
  return 3;
}

export default function RecipesScreen() {
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [selectedDiet, setSelectedDiet] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { isFavorite, toggleFavorite, loadFavorites, loaded: favsLoaded } = useFavoritesStore();

  const loadRecipes = useCallback(async () => {
    try {
      let data: RecipeListItem[];

      if (searchQuery.trim()) {
        data = await RecipeService.search(searchQuery.trim());
      } else {
        const filter: any = {};
        if (selectedCategory > 0) filter.category = selectedCategory;
        if (selectedDiet === 'vegetarian') filter.isVegetarian = true;
        if (selectedDiet === 'vegan') filter.isVegan = true;
        if (selectedDiet === 'glutenFree') filter.isGlutenFree = true;
        if (selectedDiet === 'ramadan') filter.isRamadanFriendly = true;
        if (selectedDiet === 'bulking') filter.isBulking = true;
        if (selectedDiet === 'cutting') filter.isCutting = true;
        data = await RecipeService.getAll(filter);
      }

      // Trier: Marocain > Arabe > Islamique > Autres
      data.sort((a, b) => getRecipePriority(a.titleFr) - getRecipePriority(b.titleFr));

      // Filtre favoris
      if (showFavoritesOnly) {
        data = data.filter((r) => isFavorite(r.id));
      }

      setRecipes(data);
    } catch (err) {
      console.error('Failed to load recipes:', err);
    }
  }, [searchQuery, selectedCategory, selectedDiet, showFavoritesOnly, isFavorite]);

  useEffect(() => {
    if (!favsLoaded) loadFavorites();
  }, [favsLoaded]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      loadRecipes().finally(() => {
        if (active) setLoading(false);
      });
      return () => { active = false; };
    }, [loadRecipes]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecipes();
    setRefreshing(false);
  };

  const renderRecipeCard = ({ item }: { item: RecipeListItem }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/(main)/nutrition/recipe-detail',
          params: { id: item.id },
        })
      }
    >
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={styles.recipeImage} />
      ) : (
        <View style={[styles.recipeImage, styles.recipeImagePlaceholder]}>
          <Ionicons name="restaurant-outline" size={32} color={Colors.lightGray} />
        </View>
      )}
      <View style={styles.recipeInfo}>
        <Text style={styles.recipeTitle} numberOfLines={2}>{(item as any).title || item.titleFr}</Text>
        <View style={styles.recipeMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="flame-outline" size={14} color={Colors.primary} />
            <Text style={styles.metaText}>{item.caloriesPerServing} kcal</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="barbell-outline" size={14} color={Colors.info} />
            <Text style={styles.metaText}>{Math.round(item.proteinsGPerServing)}g prot</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={Colors.gray} />
            <Text style={styles.metaText}>{item.totalTimeMinutes} min</Text>
          </View>
        </View>
        <View style={styles.tagRow}>
          {getRecipePriority(item.titleFr) === 0 && (
            <View style={styles.moroccanBadge}>
              <Text style={styles.moroccanBadgeText}>🇲🇦 Marocain</Text>
            </View>
          )}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {CATEGORY_LABELS[item.category] || 'Autre'}
            </Text>
          </View>
          {item.isVegetarian && (
            <View style={[styles.dietBadge, { backgroundColor: Colors.successLight }]}>
              <Text style={[styles.dietBadgeText, { color: Colors.success }]}>Veg</Text>
            </View>
          )}
          {item.isVegan && (
            <View style={[styles.dietBadge, { backgroundColor: Colors.successLight }]}>
              <Text style={[styles.dietBadgeText, { color: Colors.success }]}>Vegan</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/nutrition'))}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Recettes</Text>
          <Text style={styles.headerSubtitle}>وصفات</Text>
        </View>
        <TouchableOpacity onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}>
          <Ionicons
            name={showFavoritesOnly ? 'heart' : 'heart-outline'}
            size={24}
            color={showFavoritesOnly ? Colors.error : Colors.gray}
          />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une recette..."
          placeholderTextColor={Colors.lightGray}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.lightGray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {CATEGORIES.map((item) => {
            const isActive = selectedCategory === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedCategory(item.key)}
              >
                <Ionicons name={item.icon as any} size={14} color={isActive ? Colors.white : Colors.gray} />
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Diet filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {DIET_FILTERS.map((item) => {
            const isActive = selectedDiet === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.filterChipSmall, isActive && styles.filterChipActive]}
                onPress={() => setSelectedDiet(item.key)}
              >
                <Text style={[styles.filterChipTextSmall, isActive && styles.filterChipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Recipe list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={renderRecipeCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={48} color={Colors.lightGray} />
              <Text style={styles.emptyText}>Aucune recette trouvee</Text>
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSelectedCategory(0); setSelectedDiet('all'); }}>
                <Text style={styles.emptyLink}>Reinitialiser les filtres</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 12,
    paddingBottom: 8,
  },
  headerTitleBlock: {
    alignItems: 'center',
  },
  headerTitle: { ...Typography.h3, color: Colors.dark },
  headerSubtitle: {
    fontFamily: Fonts.family.arRegular,
    fontSize: Fonts.size.sm,
    color: Colors.medium,
    marginTop: -2,
  },
  headerCount: { ...Typography.body, color: Colors.gray },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: Fonts.size.base,
    color: Colors.dark,
    padding: 0,
  },

  filterContainer: {
    height: 44,
    marginBottom: 4,
  },
  filterRow: {
    paddingHorizontal: 16,
    alignItems: 'center',
    height: 44,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  filterChipSmall: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.sm,
    color: Colors.gray,
  },
  filterChipTextSmall: {
    fontFamily: Fonts.family.displayMedium,
    fontSize: Fonts.size.xs,
    color: Colors.gray,
  },
  filterChipTextActive: {
    fontFamily: Fonts.family.displayBold,
    color: Colors.white,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  recipeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  recipeImage: {
    width: 110,
    height: 120,
  },
  recipeImagePlaceholder: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  recipeTitle: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.md,
    lineHeight: 22,
    color: Colors.dark,
    marginBottom: 6,
  },
  recipeMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: Fonts.size.xs,
    color: Colors.gray,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: Colors.primaryDim,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.primary,
  },
  moroccanBadge: {
    backgroundColor: Colors.goldDim,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  moroccanBadgeText: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.xs,
    color: Colors.goldDark,
  },
  dietBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dietBadgeText: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.semiBold,
  },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { ...Typography.body, color: Colors.gray },
  emptyLink: { ...Typography.body, color: Colors.primary, fontWeight: Fonts.weight.semiBold },
});
