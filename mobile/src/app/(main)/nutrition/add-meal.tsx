import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, Platform, Alert, KeyboardAvoidingView, ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { NutritionService } from '@/services/nutrition.service';
import { MealType, FoodItemRequest } from '@/types/nutrition.types';
import api from '@/services/api';

interface SearchResult {
  id: string;
  type: 'food' | 'recipe';
  name: string;
  nameFr?: string;
  category: string;
  servingSize: number;
  servingDescription?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: 'Breakfast', label: 'Petit-dej', icon: '🌅' },
  { key: 'Lunch', label: 'Dejeuner', icon: '☀️' },
  { key: 'Dinner', label: 'Diner', icon: '🌙' },
  { key: 'AfternoonSnack', label: 'Collation', icon: '🍎' },
];

export default function AddMealScreen() {
  const params = useLocalSearchParams<{ mealType?: string; date?: string }>();

  const [selectedType, setSelectedType] = useState<MealType>((params.mealType as MealType) || 'Lunch');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(true);

  // Selected food details
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [baseServing, setBaseServing] = useState(100);
  const [calories, setCalories] = useState('');
  const [proteins, setProteins] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Base macros (per serving) for recalculation
  const [baseCals, setBaseCals] = useState(0);
  const [baseProt, setBaseProt] = useState(0);
  const [baseCarbs, setBaseCarbs] = useState(0);
  const [baseFats, setBaseFats] = useState(0);

  // Search with debounce
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/api/foods/search', { params: { q: searchQuery, limit: 15 } });
        const data = res.data;
        const combined = [...(data.foods || []), ...(data.recipes || [])];
        setSearchResults(combined);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectItem = (item: SearchResult) => {
    setFoodName(item.nameFr || item.name);
    setBaseServing(item.servingSize || 100);
    setQuantity(String(item.servingSize || 100));
    setBaseCals(item.calories);
    setBaseProt(item.protein);
    setBaseCarbs(item.carbs);
    setBaseFats(item.fat);
    // Set macros for current serving
    setCalories(String(Math.round(item.calories)));
    setProteins(String(Math.round(item.protein * 10) / 10));
    setCarbs(String(Math.round(item.carbs * 10) / 10));
    setFats(String(Math.round(item.fat * 10) / 10));
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Recalculate macros when quantity changes
  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    const qty = parseFloat(val) || 0;
    if (baseServing > 0 && baseCals > 0) {
      const ratio = qty / baseServing;
      setCalories(String(Math.round(baseCals * ratio)));
      setProteins(String(Math.round(baseProt * ratio * 10) / 10));
      setCarbs(String(Math.round(baseCarbs * ratio * 10) / 10));
      setFats(String(Math.round(baseFats * ratio * 10) / 10));
    }
  };

  const handleAddFood = async () => {
    if (!foodName.trim()) { Alert.alert('Erreur', "Entre le nom de l'aliment."); return; }
    setSubmitting(true);
    try {
      await NutritionService.logMeal({
        mealType: selectedType,
        items: [{
          name: foodName.trim(),
          quantityG: parseInt(quantity) || 100,
          calories: parseInt(calories) || 0,
          proteinsG: parseFloat(proteins) || 0,
          carbsG: parseFloat(carbs) || 0,
          fatsG: parseFloat(fats) || 0,
        }],
        loggedAt: params.date ? new Date(params.date + 'T12:00:00').toISOString() : new Date().toISOString(),
      });
      resetForm();
      if (Platform.OS === 'web') {
        window.alert('Repas ajoute!');
        router.replace('/nutrition');
      } else {
        Alert.alert('Succes', 'Repas ajoute!', [
          { text: 'Ajouter un autre', onPress: () => resetForm() },
          { text: 'Retour', onPress: () => router.replace('/nutrition') },
        ]);
      }
    } catch {
      Alert.alert('Erreur', "Impossible d'ajouter le repas.");
    } finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setFoodName(''); setQuantity('100'); setCalories(''); setProteins(''); setCarbs(''); setFats('');
    setBaseCals(0); setBaseProt(0); setBaseCarbs(0); setBaseFats(0); setBaseServing(100);
    setShowSearch(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/nutrition')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ajouter un repas</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Meal Type */}
          <View style={styles.mealTypeRow}>
            {MEAL_TYPES.map((t) => (
              <TouchableOpacity key={t.key}
                style={[styles.mealChip, selectedType === t.key && styles.mealChipActive]}
                onPress={() => setSelectedType(t.key)}>
                <Text style={styles.mealChipEmoji}>{t.icon}</Text>
                <Text style={[styles.mealChipText, selectedType === t.key && styles.mealChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search or Selected */}
          {showSearch ? (
            <View style={styles.searchSection}>
              <Text style={styles.label}>Chercher un aliment ou recette</Text>
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={18} color={Colors.gray} />
                <TextInput style={styles.searchInput} placeholder="Poulet, riz, tagine, eggs..."
                  placeholderTextColor={Colors.lightGray} value={searchQuery}
                  onChangeText={setSearchQuery} autoFocus />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                    <Ionicons name="close-circle" size={18} color={Colors.lightGray} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Results */}
              {searching && <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />}
              {searchResults.length > 0 && (
                <View style={styles.resultsList}>
                  {searchResults.map((item) => (
                    <TouchableOpacity key={`${item.type}-${item.id}`} style={styles.resultItem}
                      onPress={() => selectItem(item)} activeOpacity={0.7}>
                      <View style={[styles.resultIcon, { backgroundColor: item.type === 'food' ? '#E8F5E9' : '#FFF3E0' }]}>
                        <Ionicons name={item.type === 'food' ? 'leaf-outline' : 'restaurant-outline'}
                          size={16} color={item.type === 'food' ? '#4CAF50' : '#FF9800'} />
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultName} numberOfLines={1}>{item.nameFr || item.name}</Text>
                        <Text style={styles.resultMeta}>
                          {item.type === 'food' ? '🥗 Aliment' : '🍽️ Recette'} · {Math.round(item.calories)} cal · P:{Math.round(item.protein)}g
                        </Text>
                      </View>
                      <View style={styles.resultCals}>
                        <Text style={styles.resultCalsNum}>{Math.round(item.calories)}</Text>
                        <Text style={styles.resultCalsUnit}>kcal</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <Text style={styles.noResults}>Aucun resultat. Tu peux ajouter manuellement.</Text>
              )}

              {/* Manual entry button */}
              <TouchableOpacity style={styles.manualBtn} onPress={() => setShowSearch(false)}>
                <Ionicons name="create-outline" size={18} color={Colors.primary} />
                <Text style={styles.manualBtnText}>Saisie manuelle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Selected food header */}
              <View style={styles.selectedHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Aliment selectionne</Text>
                  <TextInput style={styles.foodNameInput} value={foodName}
                    onChangeText={setFoodName} placeholder="Nom de l'aliment" />
                </View>
                <TouchableOpacity style={styles.changeBtn} onPress={resetForm}>
                  <Ionicons name="swap-horizontal" size={16} color={Colors.primary} />
                  <Text style={styles.changeBtnText}>Changer</Text>
                </TouchableOpacity>
              </View>

              {/* Quantity with slider feel */}
              <Text style={styles.label}>Quantite</Text>
              <View style={styles.quantityRow}>
                {[50, 100, 150, 200, 300].map((q) => (
                  <TouchableOpacity key={q}
                    style={[styles.qtyChip, quantity === String(q) && styles.qtyChipActive]}
                    onPress={() => handleQuantityChange(String(q))}>
                    <Text style={[styles.qtyChipText, quantity === String(q) && styles.qtyChipTextActive]}>{q}g</Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.qtyInputWrap}>
                  <TextInput style={styles.qtyInput} keyboardType="numeric"
                    value={quantity} onChangeText={handleQuantityChange} />
                  <Text style={styles.qtyInputUnit}>g</Text>
                </View>
              </View>

              {/* Macros display */}
              <Text style={styles.label}>Nutrition</Text>
              <View style={styles.macroCards}>
                <View style={[styles.macroCard, { borderTopColor: Colors.primary }]}>
                  <Text style={styles.macroCardValue}>{calories || '0'}</Text>
                  <Text style={styles.macroCardLabel}>Calories</Text>
                </View>
                <View style={[styles.macroCard, { borderTopColor: '#4CAF50' }]}>
                  <Text style={styles.macroCardValue}>{proteins || '0'}g</Text>
                  <Text style={styles.macroCardLabel}>Proteines</Text>
                </View>
                <View style={[styles.macroCard, { borderTopColor: '#2196F3' }]}>
                  <Text style={styles.macroCardValue}>{carbs || '0'}g</Text>
                  <Text style={styles.macroCardLabel}>Glucides</Text>
                </View>
                <View style={[styles.macroCard, { borderTopColor: '#FF9800' }]}>
                  <Text style={styles.macroCardValue}>{fats || '0'}g</Text>
                  <Text style={styles.macroCardLabel}>Lipides</Text>
                </View>
              </View>

              {/* Edit macros manually */}
              <TouchableOpacity style={styles.editMacrosBtn}
                onPress={() => {
                  // Allow manual edit - just show it's editable
                  Alert.alert('Modifier', 'Les macros sont calculees automatiquement selon la quantite. Vous pouvez les ajuster ci-dessus.');
                }}>
                <Ionicons name="pencil-outline" size={14} color={Colors.gray} />
                <Text style={styles.editMacrosText}>Macros calculees pour {quantity}g</Text>
              </TouchableOpacity>

              {/* Add Button */}
              <TouchableOpacity style={[styles.addBtn, submitting && { opacity: 0.6 }]}
                onPress={handleAddFood} disabled={submitting} activeOpacity={0.85}>
                <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
                <Text style={styles.addBtnText}>{submitting ? 'Ajout...' : 'Ajouter au journal'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F0F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 8, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // Meal type
  mealTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  mealChip: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
  },
  mealChipActive: { backgroundColor: Colors.primaryDim, borderColor: Colors.primary },
  mealChipEmoji: { fontSize: 18, marginBottom: 4 },
  mealChipText: { fontSize: 11, fontWeight: '600', color: Colors.gray },
  mealChipTextActive: { color: Colors.primary },

  // Labels
  label: { fontSize: 12, fontWeight: '600', color: Colors.gray, textTransform: 'uppercase', marginBottom: 8, marginTop: 16, marginLeft: 4 },

  // Search
  searchSection: {},
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.dark, padding: 0 },

  // Results
  resultsList: { marginTop: 8, borderRadius: 14, overflow: 'hidden', backgroundColor: Colors.white },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  resultIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '600', color: Colors.dark },
  resultMeta: { fontSize: 11, color: Colors.gray, marginTop: 2 },
  resultCals: { alignItems: 'flex-end', marginLeft: 8 },
  resultCalsNum: { fontSize: 16, fontWeight: '700', color: Colors.dark },
  resultCalsUnit: { fontSize: 10, color: Colors.gray },
  noResults: { fontSize: 13, color: Colors.gray, textAlign: 'center', marginTop: 20 },
  manualBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed',
  },
  manualBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  // Selected food
  selectedHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  foodNameInput: { fontSize: 18, fontWeight: '700', color: Colors.dark, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 4 },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 },
  changeBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  // Quantity
  quantityRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  qtyChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.white },
  qtyChipActive: { backgroundColor: Colors.primary },
  qtyChipText: { fontSize: 13, fontWeight: '600', color: Colors.dark },
  qtyChipTextActive: { color: Colors.white },
  qtyInputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 10,
    paddingHorizontal: 12, borderWidth: 1.5, borderColor: Colors.border,
  },
  qtyInput: { fontSize: 15, fontWeight: '600', color: Colors.dark, width: 50, textAlign: 'center', paddingVertical: 8 },
  qtyInputUnit: { fontSize: 12, color: Colors.gray },

  // Macro cards
  macroCards: { flexDirection: 'row', gap: 8 },
  macroCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 12, alignItems: 'center',
    borderTopWidth: 3,
  },
  macroCardValue: { fontSize: 18, fontWeight: '700', color: Colors.dark },
  macroCardLabel: { fontSize: 10, color: Colors.gray, marginTop: 4, fontWeight: '500' },

  editMacrosBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 },
  editMacrosText: { fontSize: 12, color: Colors.gray },

  // Add button
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, marginTop: 24,
  },
  addBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
