import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface FavoritesState {
  favoriteRecipeIds: Set<string>;
  loaded: boolean;

  loadFavorites: () => Promise<void>;
  toggleFavorite: (recipeId: string) => Promise<void>;
  isFavorite: (recipeId: string) => boolean;
}

const STORAGE_KEY = 'favorite_recipes';

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoriteRecipeIds: new Set(),
  loaded: false,

  loadFavorites: async () => {
    try {
      const data = await SecureStore.getItemAsync(STORAGE_KEY);
      if (data) {
        const ids: string[] = JSON.parse(data);
        set({ favoriteRecipeIds: new Set(ids), loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  toggleFavorite: async (recipeId: string) => {
    const current = new Set(get().favoriteRecipeIds);
    if (current.has(recipeId)) {
      current.delete(recipeId);
    } else {
      current.add(recipeId);
    }
    set({ favoriteRecipeIds: current });
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify([...current]));
  },

  isFavorite: (recipeId: string) => {
    return get().favoriteRecipeIds.has(recipeId);
  },
}));
