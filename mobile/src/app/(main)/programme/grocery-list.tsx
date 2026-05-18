import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import api from '@/services/api';

interface GroceryItem {
  text: string;
  recipe: string;
  meals: string[];
}

interface GroceryCategory {
  name: string;
  items: GroceryItem[];
}

interface GroceryListResponse {
  week: number;
  programmeId: string;
  totalItems: number;
  categories: GroceryCategory[];
}

export default function GroceryListScreen() {
  const { programmeId, week: weekParam } = useLocalSearchParams<{ programmeId?: string; week?: string }>();
  const week = weekParam ? parseInt(weekParam, 10) : undefined;

  const [data, setData] = useState<GroceryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // SecureStore key: only alphanumeric . _ - allowed
  const checkedKey = `grocery_${(programmeId || '').replace(/-/g, '')}_${week ?? 'current'}`;

  // Load grocery list + checked state
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = `/api/programmes/${programmeId}/grocery-list${week ? `?week=${week}` : ''}`;
        const res = await api.get<GroceryListResponse>(url);
        if (!cancelled) setData(res.data);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Erreur chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Restore checked state from local
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(checkedKey);
        if (saved && !cancelled) setChecked(new Set(JSON.parse(saved)));
      } catch {}
    })();

    return () => { cancelled = true; };
  }, [programmeId, week]);

  const toggleItem = useCallback(async (text: string) => {
    const next = new Set(checked);
    if (next.has(text)) next.delete(text); else next.add(text);
    setChecked(next);
    try { await SecureStore.setItemAsync(checkedKey, JSON.stringify([...next])); } catch {}
  }, [checked, checkedKey]);

  const toggleCategory = useCallback((cat: string) => {
    const next = new Set(collapsed);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    setCollapsed(next);
  }, [collapsed]);

  const handleShare = useCallback(async () => {
    if (!data) return;
    const lines: string[] = [`🛒 Liste de courses — Semaine ${data.week}`, ''];
    for (const cat of data.categories) {
      lines.push(cat.name);
      for (const item of cat.items) {
        const c = checked.has(item.text) ? '✓' : '◯';
        lines.push(`  ${c} ${item.text}`);
      }
      lines.push('');
    }
    lines.push('Généré par Big Boss Fitness 🇲🇦');
    const message = lines.join('\n');

    // Web: utiliser Web Share API + fallback clipboard / WhatsApp direct
    if (Platform.OS === 'web') {
      try {
        // @ts-ignore — navigator.share dispo Chrome Android 89+
        if (typeof navigator !== 'undefined' && navigator.share) {
          // @ts-ignore
          await navigator.share({ title: 'Liste de courses', text: message });
          return;
        }
      } catch {/* utilisateur a annulé ou bloqué */}

      // Fallback 1: ouvrir WhatsApp Web/App directement avec le texte
      try {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        if (typeof window !== 'undefined') {
          window.open(waUrl, '_blank');
          return;
        }
      } catch {/* bloqué par popup blocker */}

      // Fallback 2: copier dans le presse-papier
      try {
        // @ts-ignore
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          // @ts-ignore
          await navigator.clipboard.writeText(message);
          // @ts-ignore
          if (typeof window !== 'undefined') window.alert('Liste copiée dans le presse-papier !');
        }
      } catch {/* ignore */}
      return;
    }

    // Natif: Share API React Native
    try {
      await Share.share({ message });
    } catch {}
  }, [data, checked]);

  const handleReset = useCallback(() => {
    Alert.alert('Réinitialiser', 'Décocher tous les items ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Réinitialiser', style: 'destructive', onPress: async () => {
          setChecked(new Set());
          try { await SecureStore.deleteItemAsync(checkedKey); } catch {}
        },
      },
    ]);
  }, [checkedKey]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={Colors.gradientHero as unknown as readonly [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Liste de courses</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <Text style={styles.emptyText}>{error || 'Aucune donnée'}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalChecked = checked.size;
  const totalItems = data.totalItems;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={Colors.gradientHero as unknown as readonly [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Liste de courses</Text>
          <Text style={styles.headerSubtitle}>Semaine {data.week} · {totalChecked}/{totalItems}</Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
          <Ionicons name="share-social" size={20} color={Colors.white} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View
          style={[
            styles.progressFill,
            { width: totalItems > 0 ? `${(totalChecked / totalItems) * 100}%` : '0%' },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {data.categories.map((cat) => {
          const catChecked = cat.items.filter((i) => checked.has(i.text)).length;
          const isCollapsed = collapsed.has(cat.name);
          return (
            <View key={cat.name} style={styles.section}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleCategory(cat.name)}>
                <Text style={styles.sectionTitle}>{cat.name}</Text>
                <View style={styles.sectionRight}>
                  <Text style={styles.sectionCount}>{catChecked}/{cat.items.length}</Text>
                  <Ionicons
                    name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                    size={18}
                    color={Colors.gray}
                  />
                </View>
              </TouchableOpacity>

              {!isCollapsed && cat.items.map((item, idx) => {
                const isChecked = checked.has(item.text);
                return (
                  <TouchableOpacity
                    key={`${cat.name}-${idx}`}
                    style={[styles.item, isChecked && styles.itemChecked]}
                    onPress={() => toggleItem(item.text)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                      {isChecked && <Ionicons name="checkmark" size={16} color={Colors.white} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemText, isChecked && styles.itemTextChecked]}>
                        {item.text}
                      </Text>
                      <Text style={styles.itemRecipe} numberOfLines={1}>
                        {item.recipe} · {item.meals.join(', ')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {totalChecked > 0 && (
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Ionicons name="refresh" size={16} color={Colors.gray} />
            <Text style={styles.resetText}>Réinitialiser tout</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 48 : 12, paddingBottom: 16,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontFamily: Fonts.family.displayBold,
    fontSize: Fonts.size.xl,
    color: Colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontFamily: Fonts.family.regular,
    fontSize: Fonts.size.xs,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 2,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },

  progressBg: {
    height: 6, backgroundColor: Colors.border, marginHorizontal: 20, borderRadius: 3, marginTop: 12, overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: Colors.accent, borderRadius: 3 },

  scroll: { padding: 20, paddingBottom: 40 },

  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: Fonts.size.md, color: Colors.dark,
  },
  sectionRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionCount: {
    fontFamily: Fonts.family.displayMedium,
    fontSize: Fonts.size.sm, color: Colors.gray,
  },

  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  itemChecked: { backgroundColor: Colors.background, borderColor: Colors.accent + '30' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  itemText: {
    fontFamily: Fonts.family.regular,
    fontSize: Fonts.size.base, color: Colors.dark,
  },
  itemTextChecked: { color: Colors.gray, textDecorationLine: 'line-through' },
  itemRecipe: {
    fontFamily: Fonts.family.regular,
    fontSize: Fonts.size.xs, color: Colors.lightGray, marginTop: 2,
  },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 16, padding: 12,
  },
  resetText: { fontFamily: Fonts.family.regular, fontSize: Fonts.size.sm, color: Colors.gray },

  emptyText: { fontFamily: Fonts.family.regular, fontSize: Fonts.size.md, color: Colors.gray, textAlign: 'center' },
  link: { fontFamily: Fonts.family.displaySemiBold, fontSize: Fonts.size.base, color: Colors.primary },
});
