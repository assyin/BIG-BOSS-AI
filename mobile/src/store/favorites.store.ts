import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '@/services/api';

/**
 * Sprint 3.3 — Favoris recettes avec sync backend.
 *
 * Pattern offline-first :
 * - loadFavorites: load cache local immédiatement, puis fetch backend en background.
 * - toggleFavorite: optimistic update UI + cache local + sync backend.
 * - Si offline, le toggle reste en cache local (re-sync au prochain loadFavorites).
 */

interface FavoritesState {
  favoriteRecipeIds: Set<string>;
  loaded: boolean;

  loadFavorites: () => Promise<void>;
  toggleFavorite: (recipeId: string) => Promise<void>;
  isFavorite: (recipeId: string) => boolean;
}

const STORAGE_KEY = 'favorite_recipes';

async function readLocal(): Promise<string[]> {
  try {
    const data = await SecureStore.getItemAsync(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function writeLocal(ids: Iterable<string>): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* offline / no permission — local-only is OK */
  }
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoriteRecipeIds: new Set(),
  loaded: false,

  loadFavorites: async () => {
    // 1) Cache local immédiatement (UI réactive)
    const localIds = await readLocal();
    set({ favoriteRecipeIds: new Set(localIds), loaded: true });

    // 2) Sync backend en background (override local si serveur a la vérité)
    try {
      const res = await api.get<{ recipeIds: string[] }>('/api/users/me/favorites/recipes');
      const serverIds = res.data.recipeIds || [];
      const merged = new Set(serverIds); // serveur fait foi
      set({ favoriteRecipeIds: merged });
      await writeLocal(merged); // sync cache local
    } catch {
      // Offline ou backend indispo → on garde le cache local
    }
  },

  toggleFavorite: async (recipeId: string) => {
    const current = new Set(get().favoriteRecipeIds);
    const wasFavorite = current.has(recipeId);

    // Optimistic update UI
    if (wasFavorite) current.delete(recipeId);
    else current.add(recipeId);
    set({ favoriteRecipeIds: current });
    await writeLocal(current);

    // Sync backend
    try {
      if (wasFavorite) {
        await api.delete(`/api/users/me/favorites/recipes/${recipeId}`);
      } else {
        await api.post(`/api/users/me/favorites/recipes/${recipeId}`);
      }
    } catch {
      // Sync échoué — on garde l'optimistic update local
      // Au prochain loadFavorites, serveur fera foi
    }
  },

  isFavorite: (recipeId: string) => {
    return get().favoriteRecipeIds.has(recipeId);
  },
}));

export default useFavoritesStore;
