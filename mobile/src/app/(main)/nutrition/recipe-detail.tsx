import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import RecipeService, { RecipeDetail, CATEGORY_LABELS } from '@/services/recipe.service';
import { useFavoritesStore } from '@/store/favorites.store';

const MOROCCAN_KEYWORDS = ['moroccan', 'marocain', 'tagine', 'couscous', 'harira', 'pastilla', 'baghrir', 'msemen', 'rfissa', 'briouate', 'zaalouk', 'chermoula', 'taktouka'];
const isMoroccanRecipe = (title: string): boolean => {
  const lower = (title || '').toLowerCase();
  return MOROCCAN_KEYWORDS.some(kw => lower.includes(kw));
};

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const { isFavorite, toggleFavorite, loadFavorites, loaded: favsLoaded } = useFavoritesStore();
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'fr' | 'darija'>('fr');

  useEffect(() => {
    if (!favsLoaded) loadFavorites();
  }, [favsLoaded]);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    RecipeService.getById(id)
      .then(setRecipe)
      .catch((err) => console.error('Failed to load recipe:', err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Recette introuvable</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        {recipe.photoUrl ? (
          <Image source={{ uri: recipe.photoUrl }} style={styles.heroImage} />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder]}>
            <Ionicons name="restaurant-outline" size={64} color={Colors.lightGray} />
          </View>
        )}

        {/* Back button overlay */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/nutrition'))}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.dark} />
        </TouchableOpacity>

        {/* Favorite button overlay */}
        {id && (
          <TouchableOpacity
            style={styles.favBtn}
            onPress={() => toggleFavorite(id)}
          >
            <Ionicons
              name={isFavorite(id) ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite(id) ? Colors.error : Colors.dark}
            />
          </TouchableOpacity>
        )}

        <View style={styles.content}>
          {/* Title */}
          {lang === 'darija' && recipe.titleDarija ? (
            <Text style={[styles.title, styles.textRtl]}>{recipe.titleDarija}</Text>
          ) : (
            <Text style={styles.title}>{(recipe as any).title || recipe.titleFr}</Text>
          )}

          {/* Tags row */}
          <View style={styles.tagsRow}>
            {isMoroccanRecipe((recipe as any).title || recipe.titleFr) && (
              <View style={styles.moroccanBadge}>
                <Text style={styles.moroccanBadgeText}>🇲🇦 Recette Marocaine</Text>
              </View>
            )}
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {CATEGORY_LABELS[recipe.category] || 'Autre'}
              </Text>
            </View>
            {recipe.isVegetarian && <DietBadge label="Vegetarien" color={Colors.success} />}
            {recipe.isVegan && <DietBadge label="Vegan" color={Colors.success} />}
            {recipe.isGlutenFree && <DietBadge label="Sans gluten" color={Colors.info} />}
            {recipe.isRamadanFriendly && <DietBadge label="Ramadan" color={Colors.warning} />}
            {recipe.isBulking && <DietBadge label="Prise masse" color={Colors.primary} />}
            {recipe.isCutting && <DietBadge label="Seche" color={Colors.error} />}
          </View>

          {/* Quick info */}
          <View style={styles.quickInfo}>
            <QuickInfoItem icon="time-outline" value={`${recipe.totalTimeMinutes} min`} label="Total" />
            <QuickInfoItem icon="hourglass-outline" value={`${recipe.prepTimeMinutes} min`} label="Prep" />
            <QuickInfoItem icon="flame-outline" value={`${recipe.cookTimeMinutes} min`} label="Cuisson" />
            <QuickInfoItem icon="people-outline" value={`${recipe.servings}`} label="Portions" />
          </View>

          {/* Macros */}
          <View style={styles.macrosCard}>
            <Text style={styles.macrosTitle}>Valeurs nutritionnelles / portion</Text>
            <View style={styles.macrosRow}>
              <MacroCircle label="Calories" value={`${recipe.caloriesPerServing}`} unit="kcal" color={Colors.primary} />
              <MacroCircle label="Proteines" value={`${Math.round(recipe.proteinsGPerServing)}`} unit="g" color={Colors.accent} />
              <MacroCircle label="Glucides" value={`${Math.round(recipe.carbsGPerServing)}`} unit="g" color={Colors.secondary} />
              <MacroCircle label="Lipides" value={`${Math.round(recipe.fatsGPerServing)}`} unit="g" color={Colors.gold} />
            </View>
          </View>

          {/* Language selector */}
          <View style={styles.langSelector}>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'fr' && styles.langBtnActive]}
              onPress={() => setLang('fr')}
            >
              <Text style={[styles.langBtnText, lang === 'fr' && styles.langBtnTextActive]}>Francais</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'darija' && styles.langBtnActive]}
              onPress={() => setLang('darija')}
            >
              <Text style={[styles.langBtnText, lang === 'darija' && styles.langBtnTextActive]}>الدارجة</Text>
            </TouchableOpacity>
          </View>

          {/* Ingredients */}
          {(() => {
            const isRtl = lang === 'darija';
            const ingredients = isRtl ? (recipe.ingredientsDarija || []) : (recipe.ingredients || []);
            const title = isRtl ? 'المكونات' : 'Ingredients';
            if (ingredients.length === 0) return null;
            return (
              <View style={styles.section}>
                <View style={[styles.sectionHeader, isRtl && styles.sectionHeaderRtl]}>
                  <Ionicons name="cart-outline" size={20} color={Colors.primary} />
                  <Text style={[styles.sectionTitle, isRtl && styles.textRtl]}>{title}</Text>
                  <Text style={styles.sectionCount}>{ingredients.length}</Text>
                </View>
                <View style={styles.sectionCard}>
                  {ingredients.map((ing, i) => (
                    <View key={i} style={[styles.ingredientRow, isRtl && { flexDirection: 'row-reverse' }]}>
                      <View style={styles.bulletDot} />
                      <Text style={[styles.ingredientText, isRtl && styles.textRtl, isRtl && { flex: 1 }]}>{ing}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}

          {/* Steps */}
          {(() => {
            const isRtl = lang === 'darija';
            const steps = isRtl ? (recipe.stepsDarija || []) : (recipe.steps || []);
            const title = isRtl ? 'طريقة التحضير' : 'Preparation';
            if (steps.length === 0) return null;
            return (
              <View style={styles.section}>
                <View style={[styles.sectionHeader, isRtl && styles.sectionHeaderRtl]}>
                  <Ionicons name="list-outline" size={20} color={Colors.primary} />
                  <Text style={[styles.sectionTitle, isRtl && styles.textRtl]}>{title}</Text>
                </View>
                <View style={styles.sectionCard}>
                  {steps.map((step, i) => (
                    <View key={i} style={[styles.stepRow, isRtl && { flexDirection: 'row-reverse' }]}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{i + 1}</Text>
                      </View>
                      <Text style={[styles.stepText, isRtl && styles.textRtl, isRtl && { flex: 1 }]}>{step}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}

          {/* Description */}
          {(() => {
            const isRtl = lang === 'darija';
            const desc = isRtl ? recipe.descriptionDarija : recipe.description;
            const title = isRtl ? 'الوصف' : 'Description';
            if (!desc) return null;
            return (
              <View style={styles.section}>
                <View style={[styles.sectionHeader, isRtl && styles.sectionHeaderRtl]}>
                  <Ionicons name="information-circle-outline" size={20} color={Colors.gray} />
                  <Text style={[styles.sectionTitle, isRtl && styles.textRtl]}>{title}</Text>
                </View>
                <Text style={[styles.descriptionText, isRtl && styles.textRtl]}>{desc}</Text>
              </View>
            );
          })()}

          {/* Add to journal button */}
          <TouchableOpacity
            style={styles.addToJournalBtn}
            activeOpacity={0.85}
            onPress={() => {
              router.push({
                pathname: '/(main)/nutrition/add-meal',
                params: {
                  prefillName: (recipe as any).title || recipe.titleFr,
                  prefillCalories: String(recipe.caloriesPerServing),
                  prefillProtein: String(Math.round(recipe.proteinsGPerServing)),
                  prefillCarbs: String(Math.round(recipe.carbsGPerServing)),
                  prefillFat: String(Math.round(recipe.fatsGPerServing)),
                },
              } as any);
            }}
          >
            <Ionicons name="add-circle-outline" size={22} color={Colors.white} />
            <Text style={styles.addToJournalText}>Ajouter au journal</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DietBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.dietBadge, { backgroundColor: `${color}15` }]}>
      <Text style={[styles.dietBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function QuickInfoItem({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.quickInfoItem}>
      <Ionicons name={icon} size={20} color={Colors.primary} />
      <Text style={styles.quickInfoValue}>{value}</Text>
      <Text style={styles.quickInfoLabel}>{label}</Text>
    </View>
  );
}

function MacroCircle({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={styles.macroCircle}>
      <Text style={[styles.macroCircleValue, { color }]}>{value}</Text>
      <Text style={styles.macroCircleUnit}>{unit}</Text>
      <Text style={styles.macroCircleLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { ...Typography.body, color: Colors.gray },
  linkText: { ...Typography.body, color: Colors.primary, fontWeight: Fonts.weight.semiBold },

  heroImage: { width: '100%', height: 280 },
  heroPlaceholder: { backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },

  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 44 : 12,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  favBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 44 : 12,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxWidth: 500,
    alignSelf: 'center' as const,
    width: '100%',
  },

  title: { ...Typography.h2, color: Colors.dark, marginBottom: 12 },

  // Language selector
  langSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  langBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  langBtnActive: {
    backgroundColor: Colors.primary,
  },
  langBtnText: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.base,
    color: Colors.gray,
  },
  langBtnTextActive: {
    color: Colors.white,
  },

  // RTL support
  textRtl: {
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
  sectionHeaderRtl: {
    flexDirection: 'row-reverse' as const,
  },
  ingredientRowRtl: {
    flexDirection: 'row-reverse' as const,
  },
  stepRowRtl: {
    flexDirection: 'row-reverse' as const,
  },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  categoryBadge: { backgroundColor: Colors.primaryDim, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  categoryBadgeText: { fontSize: Fonts.size.sm, fontWeight: Fonts.weight.semiBold, color: Colors.primary },
  moroccanBadge: {
    backgroundColor: Colors.goldDim,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  moroccanBadgeText: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.sm,
    color: Colors.goldDark,
  },
  dietBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  dietBadgeText: { fontSize: Fonts.size.sm, fontWeight: Fonts.weight.semiBold },

  quickInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickInfoItem: { alignItems: 'center', gap: 4 },
  quickInfoValue: { fontSize: Fonts.size.base, fontWeight: Fonts.weight.bold, color: Colors.dark },
  quickInfoLabel: { fontSize: Fonts.size.xs, color: Colors.gray },

  macrosCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  macrosTitle: {
    ...Typography.caption,
    fontWeight: Fonts.weight.bold,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  macrosRow: { flexDirection: 'row', justifyContent: 'space-around' },
  macroCircle: { alignItems: 'center' },
  macroCircleValue: { fontSize: Fonts.size.xl, fontWeight: Fonts.weight.bold },
  macroCircleUnit: { fontSize: Fonts.size.xs, color: Colors.gray },
  macroCircleLabel: { fontSize: Fonts.size.xs, color: Colors.lightGray, marginTop: 2 },

  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { ...Typography.h4, color: Colors.dark },
  sectionCount: { ...Typography.caption, color: Colors.gray, backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },

  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
  ingredientText: { ...Typography.body, color: Colors.dark, flex: 1 },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontSize: Fonts.size.sm, fontWeight: Fonts.weight.bold, color: Colors.primary },
  stepText: { ...Typography.body, color: Colors.dark, flex: 1, lineHeight: 22 },

  descriptionText: { ...Typography.body, color: Colors.gray, lineHeight: 22 },

  addToJournalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addToJournalText: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.md,
    color: Colors.white,
    letterSpacing: 0.3,
  },
});
