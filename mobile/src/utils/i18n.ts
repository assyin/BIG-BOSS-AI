/**
 * Lightweight helpers to pick the right-language field from an object.
 * The backend always returns all language variants (nameFr, nameAr/nameDarija, nameEn, etc.)
 * Components call these helpers with the user's preferred language.
 */

import { useAuthStore } from '@/store/auth.store';

export type Lang = 'fr' | 'ar' | 'darija' | 'en';

/**
 * Read the user's preferred language from the auth store.
 * Returns 'fr' as default.
 */
export function useLang(): Lang {
  const profile = useAuthStore((s) => s.profile);
  const pref = (profile?.preferredLanguage as Lang) || 'fr';
  // Normalize Arabic variants
  if (pref === 'ar' || pref === 'darija') return 'ar';
  return pref;
}

/**
 * Pick the best name from an object based on the user's language.
 * Looks for (in order):
 *   - Arabic: nameDarija → nameAr → nameFr → name → ''
 *   - English: nameEn → nameFr → name → ''
 *   - French (default): nameFr → name → nameEn → ''
 */
export function pickName(obj: any, lang: Lang): string {
  if (!obj) return '';
  if (lang === 'ar') {
    return obj.nameDarija || obj.nameAr || obj.nameFr || obj.name || '';
  }
  if (lang === 'en') {
    return obj.nameEn || obj.nameFr || obj.name || '';
  }
  return obj.nameFr || obj.name || obj.nameEn || '';
}

/**
 * Same as pickName but for titles (recipes).
 * Note: for recipes, the `title` column on the entity holds the user-friendly
 * French label (titleFr historically holds the English source). For French we
 * therefore prefer `title` over `titleFr`.
 */
export function pickTitle(obj: any, lang: Lang): string {
  if (!obj) return '';
  if (lang === 'ar') {
    return obj.titleDarija || obj.titleAr || obj.title || obj.titleFr || '';
  }
  if (lang === 'en') {
    return obj.titleEn || obj.titleFr || obj.title || '';
  }
  return obj.title || obj.titleFr || obj.titleEn || '';
}

/**
 * Pick description in the user's language.
 */
export function pickDescription(obj: any, lang: Lang): string {
  if (!obj) return '';
  if (lang === 'ar') {
    return obj.descriptionDarija || obj.descriptionAr || obj.descriptionFr || obj.description || '';
  }
  if (lang === 'en') {
    return obj.descriptionEn || obj.descriptionFr || obj.description || '';
  }
  return obj.descriptionFr || obj.description || obj.descriptionEn || '';
}

/**
 * True if current language is RTL (right-to-left).
 */
export function isRTL(lang: Lang): boolean {
  return lang === 'ar';
}
