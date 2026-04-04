import api from './api';
import { API_CONFIG } from '@/constants/api';

// Types
export interface RecipeListItem {
  id: string;
  titleFr: string;
  category: number;
  totalTimeMinutes: number;
  caloriesPerServing: number;
  proteinsGPerServing: number;
  photoUrl: string | null;
  isVegetarian: boolean;
  isVegan: boolean;
  isFeatured: boolean;
}

export interface RecipeDetail {
  id: string;
  titleFr: string;
  titleAr: string | null;
  titleDarija: string | null;
  description: string | null;
  descriptionDarija: string | null;
  ingredientsDarija: string[];
  stepsDarija: string[];
  category: number;
  mealType: string | null;
  cuisineType: string | null;
  difficultyLevel: string | null;
  dietTags: string[];
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  servings: number;
  caloriesPerServing: number;
  proteinsGPerServing: number;
  carbsGPerServing: number;
  fatsGPerServing: number;
  ingredients: string[];
  steps: string[];
  photoUrl: string | null;
  videoUrl: string | null;
  tags: string[];
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isRamadanFriendly: boolean;
  isBulking: boolean;
  isCutting: boolean;
  isFeatured: boolean;
}

export interface RecipeFilter {
  category?: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isRamadanFriendly?: boolean;
  isBulking?: boolean;
  isCutting?: boolean;
  maxCalories?: number;
  minProtein?: number;
  maxTotalTime?: number;
  search?: string;
}

// Helpers
function fixUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${API_CONFIG.BASE_URL}${url}`;
  return url;
}

function fixRecipePhoto(recipe: any): any {
  if (recipe) {
    recipe.photoUrl = fixUrl(recipe.photoUrl);
  }
  return recipe;
}

// Category labels
export const CATEGORY_LABELS: Record<number, string> = {
  1: 'Petit-dejeuner',
  2: 'Dejeuner',
  3: 'Diner',
  4: 'Collation',
  5: 'Pre-Workout',
  6: 'Post-Workout',
  7: 'Smoothie',
  8: 'Dessert',
};

export const CATEGORY_ICONS: Record<number, string> = {
  1: 'sunny-outline',
  2: 'restaurant-outline',
  3: 'moon-outline',
  4: 'cafe-outline',
  5: 'flash-outline',
  6: 'fitness-outline',
  7: 'water-outline',
  8: 'ice-cream-outline',
};

// Service
const BASE = '/api/recipes';

export const RecipeService = {
  async getAll(filter?: RecipeFilter): Promise<RecipeListItem[]> {
    const response = await api.get<RecipeListItem[]>(BASE, { params: filter });
    return (response.data || []).map(fixRecipePhoto);
  },

  async getFeatured(count = 6): Promise<RecipeListItem[]> {
    const response = await api.get<RecipeListItem[]>(`${BASE}/featured`, { params: { count } });
    return (response.data || []).map(fixRecipePhoto);
  },

  async search(q: string): Promise<RecipeListItem[]> {
    const response = await api.get<RecipeListItem[]>(`${BASE}/search`, { params: { q } });
    return (response.data || []).map(fixRecipePhoto);
  },

  async getByCategory(category: number): Promise<RecipeListItem[]> {
    const response = await api.get<RecipeListItem[]>(`${BASE}/category/${category}`);
    return (response.data || []).map(fixRecipePhoto);
  },

  async getById(id: string): Promise<RecipeDetail> {
    const response = await api.get<RecipeDetail>(`${BASE}/${id}`);
    return fixRecipePhoto(response.data);
  },
};

export default RecipeService;
