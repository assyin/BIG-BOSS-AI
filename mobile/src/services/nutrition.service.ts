import api from './api';
import { ENDPOINTS } from '@/constants/api';
import {
  NutritionDay,
  NutritionTargets,
  WeeklyNutritionSummary,
  Meal,
  MealType,
  MealLogRequest,
  ScanMealRequest,
  ScanMealResponse,
} from '@/types/nutrition.types';

// Backend enum: Breakfast=1, MorningSnack=2, Lunch=3, AfternoonSnack=4, Dinner=5, etc.
const MEAL_TYPE_MAP: Record<MealType, number> = {
  Breakfast: 1,
  MorningSnack: 2,
  Lunch: 3,
  AfternoonSnack: 4,
  Dinner: 5,
  EveningSnack: 6,
  PreWorkout: 7,
  PostWorkout: 8,
};

// Reverse map: integer -> MealType string
const MEAL_TYPE_REVERSE: Record<number, MealType> = Object.fromEntries(
  Object.entries(MEAL_TYPE_MAP).map(([k, v]) => [v, k as MealType])
) as Record<number, MealType>;

// Map a backend meal object (with integer mealType) to our frontend Meal type
function mapBackendMeal(raw: any): Meal {
  const mealTypeInt = typeof raw.mealType === 'number' ? raw.mealType : raw.mealType;
  const mealTypeStr = typeof mealTypeInt === 'number' ? (MEAL_TYPE_REVERSE[mealTypeInt] || 'Lunch') : mealTypeInt;

  // Parse itemsJson if it's a string
  let items = raw.items || [];
  if (raw.itemsJson) {
    try {
      items = typeof raw.itemsJson === 'string' ? JSON.parse(raw.itemsJson) : raw.itemsJson;
    } catch {
      items = [];
    }
  }

  return {
    id: raw.id?.toString() || raw.Id?.toString() || '',
    mealType: mealTypeStr,
    loggedAt: raw.loggedAt || raw.createdAt || new Date().toISOString(),
    photoUrl: raw.photoUrl || null,
    items: items.map((item: any) => ({
      name: item.name || item.Name || '',
      quantityG: item.quantityG || item.QuantityG || item.quantity || 0,
      calories: item.calories || item.Calories || 0,
      proteinsG: item.proteinsG || item.ProteinsG || item.proteins || 0,
      carbsG: item.carbsG || item.CarbsG || item.carbs || 0,
      fatsG: item.fatsG || item.FatsG || item.fats || 0,
    })),
    totalCalories: raw.totalCalories || raw.TotalCalories || 0,
    proteinsG: raw.proteinsG || raw.ProteinsG || 0,
    carbsG: raw.carbsG || raw.CarbsG || 0,
    fatsG: raw.fatsG || raw.FatsG || 0,
  };
}

// Map backend day response to our NutritionDay type
function mapBackendDayResponse(raw: any): NutritionDay {
  const meals = (raw.meals || []).map(mapBackendMeal);
  const totals = raw.totals || raw.consumed || {};
  const targets = raw.targets || {};

  return {
    date: raw.date || '',
    targets: {
      calories: targets.targetCalories || targets.calories || 2200,
      proteinsG: targets.targetProteins || targets.proteinsG || 150,
      carbsG: targets.targetCarbs || targets.carbsG || 250,
      fatsG: targets.targetFats || targets.fatsG || 75,
    },
    consumed: {
      calories: totals.calories || 0,
      proteinsG: totals.proteins || totals.proteinsG || 0,
      carbsG: totals.carbs || totals.carbsG || 0,
      fatsG: totals.fats || totals.fatsG || 0,
    },
    remaining: {
      calories: (targets.targetCalories || targets.calories || 2200) - (totals.calories || 0),
      proteinsG: (targets.targetProteins || targets.proteinsG || 150) - (totals.proteins || totals.proteinsG || 0),
      carbsG: (targets.targetCarbs || targets.carbsG || 250) - (totals.carbs || totals.carbsG || 0),
      fatsG: (targets.targetFats || targets.fatsG || 75) - (totals.fats || totals.fatsG || 0),
    },
    meals,
    compliancePercent: raw.compliancePercent || 0,
  };
}

export const NutritionService = {
  async logMeal(data: MealLogRequest): Promise<Meal> {
    // Backend expects: { mealType: int, items: [{name, quantityG, calories, proteinsG, carbsG, fatsG}], loggedAt }
    const payload = {
      mealType: MEAL_TYPE_MAP[data.mealType] ?? 3,
      items: data.items.map(i => ({
        name: i.name,
        quantityG: i.quantityG || 100,
        calories: Math.round(i.calories),
        proteinsG: Math.round(i.proteinsG * 10) / 10,
        carbsG: Math.round(i.carbsG * 10) / 10,
        fatsG: Math.round(i.fatsG * 10) / 10,
      })),
      loggedAt: data.loggedAt || new Date().toISOString(),
    };

    const response = await api.post(ENDPOINTS.NUTRITION.LOG_MEAL, payload);
    return mapBackendMeal(response.data);
  },

  async deleteMeal(id: string): Promise<void> {
    await api.delete(ENDPOINTS.NUTRITION.DELETE_MEAL(id));
  },

  async getDayNutrition(date: string): Promise<NutritionDay> {
    const response = await api.get(ENDPOINTS.NUTRITION.DAY, {
      params: { date },
    });
    return mapBackendDayResponse(response.data);
  },

  async getWeekNutrition(weekStart: string): Promise<WeeklyNutritionSummary> {
    const response = await api.get<WeeklyNutritionSummary>(ENDPOINTS.NUTRITION.WEEK, {
      params: { weekStart },
    });
    return response.data;
  },

  async getTargets(): Promise<NutritionTargets> {
    const response = await api.get<NutritionTargets>(ENDPOINTS.NUTRITION.TARGETS);
    return response.data;
  },

  async scanMeal(imageBase64: string): Promise<ScanMealResponse> {
    const response = await api.post<ScanMealResponse>(ENDPOINTS.NUTRITION.SCAN, {
      imageBase64,
    });
    return response.data;
  },
};

export default NutritionService;
