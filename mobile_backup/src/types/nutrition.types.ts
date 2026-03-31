export type MealType =
  | 'Breakfast'
  | 'MorningSnack'
  | 'Lunch'
  | 'AfternoonSnack'
  | 'Dinner'
  | 'EveningSnack'
  | 'PreWorkout'
  | 'PostWorkout';

export interface NutritionTargets {
  calories: number;
  proteinsG: number;
  carbsG: number;
  fatsG: number;
}

export interface NutritionTotals {
  calories: number;
  proteinsG: number;
  carbsG: number;
  fatsG: number;
}

export interface NutritionDay {
  date: string;
  targets: NutritionTargets;
  consumed: NutritionTotals;
  remaining: NutritionTotals;
  meals: Meal[];
  compliancePercent: number;
}

export interface Meal {
  id: string;
  mealType: MealType;
  loggedAt: string;
  photoUrl: string | null;
  items: FoodItem[];
  totalCalories: number;
  proteinsG: number;
  carbsG: number;
  fatsG: number;
}

export interface FoodItem {
  name: string;
  quantityG: number;
  calories: number;
  proteinsG: number;
  carbsG: number;
  fatsG: number;
}

export interface MealLogRequest {
  mealType: MealType;
  items: FoodItemRequest[];
  loggedAt?: string;
}

export interface FoodItemRequest {
  name: string;
  quantityG: number;
  calories: number;
  proteinsG: number;
  carbsG: number;
  fatsG: number;
}

export interface ScanMealRequest {
  imageBase64: string;
  mealType?: MealType;
}

export interface ScanMealResponse {
  detectedItems: DetectedFoodItem[];
  estimatedTotalCalories: number;
  estimatedProteinsG: number;
  estimatedCarbsG: number;
  estimatedFatsG: number;
  aiAnalysis: string;
  confidenceScore: number;
}

export interface DetectedFoodItem {
  name: string;
  nameAr: string | null;
  estimatedQuantityG: number;
  calories: number;
  proteinsG: number;
  carbsG: number;
  fatsG: number;
  confidence: number;
}

export interface WeeklyNutritionSummary {
  weekStart: string;
  weekEnd: string;
  averageCalories: number;
  averageProteinsG: number;
  averageCarbsG: number;
  averageFatsG: number;
  averageCompliancePercent: number;
  dailyCompliance: DailyCompliance[];
}

export interface DailyCompliance {
  date: string;
  compliancePercent: number;
  mealsLogged: boolean;
}
