import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import ProgrammeService, { NutritionPlan } from '@/services/programme.service';

const MEAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  snack: 'cafe-outline',
};
const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Petit-dejeuner',
  lunch: 'Dejeuner',
  dinner: 'Diner',
  snack: 'Collation',
};

interface MealRecipe {
  recipeId: string;
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  photoUrl: string | null;
}

interface DayPlan {
  day: number;
  dayName: string;
  breakfast: MealRecipe | null;
  lunch: MealRecipe | null;
  dinner: MealRecipe | null;
  snack: MealRecipe | null;
}

export default function NutritionPlanScreen() {
  const { programmeId } = useLocalSearchParams<{ programmeId: string }>();

  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null);
  const [mealPlan, setMealPlan] = useState<DayPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0); // index in mealPlan

  useFocusEffect(
    useCallback(() => {
      if (!programmeId) return;
      let active = true;
      setLoading(true);

      ProgrammeService.getNutritionPlan(programmeId)
        .then((data) => {
          if (!active) return;
          setNutritionPlan(data);
          if (data.mealPlan && Array.isArray(data.mealPlan)) {
            setMealPlan(data.mealPlan as DayPlan[]);
            // Select today
            const jsDay = new Date().getDay();
            const mondayDay = jsDay === 0 ? 7 : jsDay;
            const todayIdx = (data.mealPlan as DayPlan[]).findIndex((d) => d.day === mondayDay);
            if (todayIdx >= 0) setSelectedDay(todayIdx);
          }
        })
        .catch((err) => console.error('Failed to load nutrition plan:', err))
        .finally(() => { if (active) setLoading(false); });

      return () => { active = false; };
    }, [programmeId]),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const dayPlan = mealPlan[selectedDay];
  const meals = dayPlan
    ? ['breakfast', 'lunch', 'dinner', 'snack']
        .map((key) => ({ key, recipe: (dayPlan as any)[key] as MealRecipe | null }))
        .filter((m) => m.recipe != null)
    : [];

  // Compute day totals
  const dayTotals = meals.reduce(
    (acc, m) => {
      if (m.recipe) {
        acc.calories += m.recipe.calories || 0;
        acc.protein += m.recipe.protein || 0;
        acc.carbs += m.recipe.carbs || 0;
        acc.fat += m.recipe.fat || 0;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plan Nutrition</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Day selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daySelector}
      >
        {mealPlan.map((day, idx) => {
          const isSelected = idx === selectedDay;
          return (
            <TouchableOpacity
              key={day.day}
              style={[styles.dayTab, isSelected && styles.dayTabSelected]}
              onPress={() => setSelectedDay(idx)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayTabText, isSelected && styles.dayTabTextSelected]}>
                {day.dayName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.webWrapper}>
          {/* Macro targets */}
          {nutritionPlan && (
            <View style={styles.targetCard}>
              <Text style={styles.targetTitle}>Objectifs journaliers</Text>
              <View style={styles.targetRow}>
                <MacroPill label="Calories" value={`${nutritionPlan.dailyCalories}`} unit="kcal" color={Colors.dark} />
                <MacroPill label="Prot" value={`${Math.round(nutritionPlan.dailyProtein)}`} unit="g" color={Colors.primary} />
                <MacroPill label="Gluc" value={`${Math.round(nutritionPlan.dailyCarbs)}`} unit="g" color={Colors.warning} />
                <MacroPill label="Lip" value={`${Math.round(nutritionPlan.dailyFat)}`} unit="g" color={Colors.info} />
              </View>
            </View>
          )}

          {/* Day total vs target */}
          {dayPlan && (
            <View style={styles.dayTotalCard}>
              <Text style={styles.dayTotalTitle}>Total {dayPlan.dayName}</Text>
              <View style={styles.dayTotalRow}>
                <Text style={styles.dayTotalValue}>{dayTotals.calories} kcal</Text>
                <Text style={styles.dayTotalMacros}>
                  P:{dayTotals.protein}g · G:{dayTotals.carbs}g · L:{dayTotals.fat}g
                </Text>
              </View>
              {nutritionPlan && (
                <View style={styles.comparisonBar}>
                  <View
                    style={[
                      styles.comparisonFill,
                      {
                        width: `${Math.min((dayTotals.calories / nutritionPlan.dailyCalories) * 100, 100)}%`,
                        backgroundColor:
                          dayTotals.calories > nutritionPlan.dailyCalories * 1.1
                            ? Colors.error
                            : Colors.success,
                      },
                    ]}
                  />
                </View>
              )}
            </View>
          )}

          {/* Meals */}
          {meals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="nutrition-outline" size={48} color={Colors.lightGray} />
              <Text style={styles.emptyText}>Aucun repas suggere pour ce jour</Text>
            </View>
          ) : (
            meals.map((m) => {
              const recipe = m.recipe!;
              return (
                <View key={m.key} style={styles.mealCard}>
                  <View style={styles.mealCardHeader}>
                    <View style={styles.mealIconCircle}>
                      <Ionicons
                        name={MEAL_ICONS[m.key] || 'restaurant-outline'}
                        size={20}
                        color={Colors.primary}
                      />
                    </View>
                    <Text style={styles.mealCardType}>{MEAL_LABELS[m.key] || m.key}</Text>
                  </View>

                  <Text style={styles.mealCardTitle}>{recipe.title}</Text>

                  <View style={styles.mealCardMacros}>
                    <View style={styles.macroChip}>
                      <Text style={styles.macroChipValue}>{recipe.calories}</Text>
                      <Text style={styles.macroChipLabel}>kcal</Text>
                    </View>
                    <View style={[styles.macroChip, { backgroundColor: Colors.primaryDim }]}>
                      <Text style={[styles.macroChipValue, { color: Colors.primary }]}>{recipe.protein}g</Text>
                      <Text style={styles.macroChipLabel}>Prot</Text>
                    </View>
                    <View style={[styles.macroChip, { backgroundColor: Colors.warningLight }]}>
                      <Text style={[styles.macroChipValue, { color: Colors.warning }]}>{recipe.carbs}g</Text>
                      <Text style={styles.macroChipLabel}>Gluc</Text>
                    </View>
                    <View style={[styles.macroChip, { backgroundColor: Colors.infoLight }]}>
                      <Text style={[styles.macroChipValue, { color: Colors.info }]}>{recipe.fat}g</Text>
                      <Text style={styles.macroChipLabel}>Lip</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroPill({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <View style={styles.macroPill}>
      <Text style={[styles.macroPillValue, { color }]}>{value}</Text>
      <Text style={styles.macroPillUnit}>{unit}</Text>
      <Text style={styles.macroPillLabel}>{label}</Text>
    </View>
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
    backgroundColor: Colors.background,
  },
  headerTitle: { ...Typography.h4, color: Colors.dark, flex: 1, textAlign: 'center' },

  // Day selector
  daySelector: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayTabSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayTabText: {
    ...Typography.body,
    fontWeight: Fonts.weight.medium,
    color: Colors.gray,
  },
  dayTabTextSelected: {
    color: Colors.white,
    fontWeight: Fonts.weight.semiBold,
  },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  webWrapper: { width: '100%', maxWidth: 500, alignSelf: 'center' as const },

  // Target card
  targetCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  targetTitle: {
    ...Typography.caption,
    fontWeight: Fonts.weight.bold,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  targetRow: { flexDirection: 'row', justifyContent: 'space-around' },
  macroPill: { alignItems: 'center' },
  macroPillValue: { fontSize: Fonts.size.lg, fontWeight: Fonts.weight.bold },
  macroPillUnit: { ...Typography.caption, color: Colors.gray },
  macroPillLabel: { ...Typography.caption, color: Colors.lightGray, marginTop: 2 },

  // Day total
  dayTotalCard: {
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
  dayTotalTitle: { ...Typography.bodyLarge, fontWeight: Fonts.weight.semiBold, color: Colors.dark, marginBottom: 6 },
  dayTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayTotalValue: { ...Typography.h4, color: Colors.dark },
  dayTotalMacros: { ...Typography.caption, color: Colors.gray },
  comparisonBar: { height: 6, backgroundColor: Colors.background, borderRadius: 3, overflow: 'hidden' },
  comparisonFill: { height: 6, borderRadius: 3 },

  // Meal card
  mealCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  mealCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  mealIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealCardType: {
    ...Typography.caption,
    fontWeight: Fonts.weight.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  mealCardTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 12 },
  mealCardMacros: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  macroChip: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  macroChipValue: { fontSize: Fonts.size.base, fontWeight: Fonts.weight.bold, color: Colors.dark },
  macroChipLabel: { fontSize: Fonts.size.xs, color: Colors.gray },

  emptyState: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyText: { ...Typography.body, color: Colors.gray },
});
