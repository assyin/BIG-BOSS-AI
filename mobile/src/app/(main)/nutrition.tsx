import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { NutritionService } from '@/services/nutrition.service';
import { NutritionDay, Meal, FoodItem, MealType, ScanMealResponse, DetectedFoodItem } from '@/types/nutrition.types';
import { MacroRing } from '@/components/ui/MacroRing';

const MEAL_SECTIONS: { key: MealType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'Breakfast', label: 'Petit-dejeuner', icon: 'sunny-outline' },
  { key: 'Lunch', label: 'Dejeuner', icon: 'restaurant-outline' },
  { key: 'Dinner', label: 'Diner', icon: 'moon-outline' },
  { key: 'AfternoonSnack', label: 'Collation', icon: 'cafe-outline' },
];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date: Date): string {
  const today = new Date();
  const todayStr = formatDate(today);
  const dateStr = formatDate(date);

  if (dateStr === todayStr) return "Aujourd'hui";

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === formatDate(yesterday)) return 'Hier';

  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// Swipeable food item
function SwipeableFoodItem({
  item,
  mealId,
  onDelete,
}: {
  item: FoodItem;
  mealId: string;
  onDelete: (mealId: string) => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [swiping, setSwiping] = useState(false);

  const handleSwipeLeft = () => {
    Alert.alert('Supprimer', `Supprimer ${item.name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => onDelete(mealId),
      },
    ]);
  };

  return (
    <TouchableOpacity
      style={styles.foodItem}
      onLongPress={handleSwipeLeft}
      activeOpacity={0.7}
    >
      <View style={styles.foodItemLeft}>
        <Text style={styles.foodName}>{item.name}</Text>
        <Text style={styles.foodQuantity}>{item.quantityG}g</Text>
      </View>
      <View style={styles.foodItemRight}>
        <Text style={styles.foodCalories}>{item.calories} kcal</Text>
        <Text style={styles.foodMacros}>
          P:{item.proteinsG}g  G:{item.carbsG}g  L:{item.fatsG}g
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NutritionScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [dayData, setDayData] = useState<NutritionDay | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanMealResponse | null>(null);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [addingScanMeal, setAddingScanMeal] = useState(false);

  const loadData = useCallback(async (date: Date) => {
    try {
      setLoading(true);
      const data = await NutritionService.getDayNutrition(formatDate(date));
      setDayData(data);
    } catch {
      // Use fallback empty data
      setDayData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData(selectedDate);
  }, []);

  // Reload when screen comes back into focus (e.g. after adding a meal)
  useFocusEffect(
    useCallback(() => {
      loadData(selectedDate);
    }, [selectedDate])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(selectedDate);
    setRefreshing(false);
  }, [selectedDate, loadData]);

  const changeDate = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta);
    setSelectedDate(newDate);
    loadData(newDate);
  };

  const handleDeleteMeal = async (mealId: string) => {
    try {
      await NutritionService.deleteMeal(mealId);
      await loadData(selectedDate);
    } catch {
      Alert.alert('Erreur', 'Impossible de supprimer ce repas.');
    }
  };

  const pickImageForScan = useCallback(async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission requise', 'Autorise l\'acces a la camera pour scanner un repas.');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            base64: true,
            allowsEditing: true,
            aspect: [4, 3],
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            base64: true,
            allowsEditing: true,
            aspect: [4, 3],
          });

      if (result.canceled || !result.assets?.[0]?.base64) return;

      setScanning(true);
      const scanResponse = await NutritionService.scanMeal(result.assets[0].base64);
      setScanResult(scanResponse);
      setScanModalVisible(true);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de scanner le repas. Reessaye.');
    } finally {
      setScanning(false);
    }
  }, []);

  const handleScan = useCallback(() => {
    Alert.alert('Scanner un repas', 'Choisis une source d\'image', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Camera', onPress: () => pickImageForScan(true) },
      { text: 'Galerie', onPress: () => pickImageForScan(false) },
    ]);
  }, [pickImageForScan]);

  const handleConfirmScan = useCallback(async () => {
    if (!scanResult) return;
    try {
      setAddingScanMeal(true);
      const items = scanResult.detectedItems.map((item) => ({
        name: item.name,
        quantityG: item.estimatedQuantityG,
        calories: item.calories,
        proteinsG: item.proteinsG,
        carbsG: item.carbsG,
        fatsG: item.fatsG,
      }));

      await NutritionService.logMeal({
        mealType: 'Lunch', // default, user can change later
        items,
        loggedAt: new Date().toISOString(),
      });

      setScanModalVisible(false);
      setScanResult(null);
      Alert.alert('Repas ajoute', 'Les aliments detectes ont ete ajoutes a ton journal.');
      await loadData(selectedDate);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible d\'ajouter le repas.');
    } finally {
      setAddingScanMeal(false);
    }
  }, [scanResult, selectedDate, loadData]);

  // Derived data
  const targets = dayData?.targets || { calories: 2200, proteinsG: 150, carbsG: 250, fatsG: 75 };
  const consumed = dayData?.consumed || { calories: 0, proteinsG: 0, carbsG: 0, fatsG: 0 };
  const meals = dayData?.meals || [];

  const getMealsForType = (type: MealType): Meal[] => {
    return meals.filter((m) => m.mealType === type);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Nutrition</Text>

        {loading && !refreshing && (
          <View style={{ paddingVertical: 12, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}

        {/* Date Selector */}
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
            <Ionicons name="chevron-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateCenter}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow}>
            <Ionicons name="chevron-forward" size={24} color={Colors.dark} />
          </TouchableOpacity>
        </View>

        {/* Macro Summary */}
        <View style={styles.macroCard}>
          <View style={styles.macroRow}>
            <MacroRing
              size={72}
              strokeWidth={6}
              progress={consumed.calories / targets.calories}
              color={Colors.primary}
              label="Calories"
              current={consumed.calories}
              target={targets.calories}
              unit=""
            />
            <MacroRing
              size={62}
              strokeWidth={5}
              progress={consumed.proteinsG / targets.proteinsG}
              color="#4CAF50"
              label="Proteines"
              current={consumed.proteinsG}
              target={targets.proteinsG}
              unit="g"
            />
            <MacroRing
              size={62}
              strokeWidth={5}
              progress={consumed.carbsG / targets.carbsG}
              color="#2196F3"
              label="Glucides"
              current={consumed.carbsG}
              target={targets.carbsG}
              unit="g"
            />
            <MacroRing
              size={62}
              strokeWidth={5}
              progress={consumed.fatsG / targets.fatsG}
              color="#FF9800"
              label="Lipides"
              current={consumed.fatsG}
              target={targets.fatsG}
              unit="g"
            />
          </View>
        </View>

        {/* Meal Sections */}
        {MEAL_SECTIONS.map((section) => {
          const sectionMeals = getMealsForType(section.key);
          const totalCalories = sectionMeals.reduce((sum, m) => sum + m.totalCalories, 0);

          return (
            <View key={section.key} style={styles.mealSection}>
              <View style={styles.mealSectionHeader}>
                <View style={styles.mealSectionLeft}>
                  <View style={styles.mealSectionIcon}>
                    <Ionicons name={section.icon} size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.mealSectionTitle}>{section.label}</Text>
                  {totalCalories > 0 && (
                    <Text style={styles.mealSectionCalories}>{totalCalories} kcal</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.addMealButton}
                  onPress={() =>
                    router.push({
                      pathname: '/(main)/nutrition/add-meal',
                      params: { mealType: section.key, date: formatDate(selectedDate) },
                    } as any)
                  }
                >
                  <Ionicons name="add" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {sectionMeals.length > 0 ? (
                sectionMeals.map((meal) =>
                  meal.items.map((item, idx) => (
                    <SwipeableFoodItem
                      key={`${meal.id}-${idx}`}
                      item={item}
                      mealId={meal.id}
                      onDelete={handleDeleteMeal}
                    />
                  ))
                )
              ) : (
                <View style={styles.emptyMealSection}>
                  <Text style={styles.emptyMealText}>Aucun aliment</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.scanButton} onPress={handleScan} activeOpacity={0.85}>
            <Ionicons name="camera-outline" size={22} color={Colors.white} />
            <Text style={styles.scanButtonText}>Scanner un repas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manualButton}
            onPress={() =>
              router.push({
                pathname: '/(main)/nutrition/add-meal',
                params: { date: formatDate(selectedDate) },
              } as any)
            }
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={22} color={Colors.primary} />
            <Text style={styles.manualButtonText}>Ajouter manuellement</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.recipesButton}
            onPress={() => router.push('/nutrition/recipes' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="book-outline" size={22} color={Colors.warning} />
            <Text style={styles.recipesButtonText}>Decouvrir les recettes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Scanning overlay */}
      {scanning && (
        <View style={styles.scanningOverlay}>
          <View style={styles.scanningBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.scanningText}>Analyse en cours...</Text>
            <Text style={styles.scanningSubtext}>L'IA analyse votre repas</Text>
          </View>
        </View>
      )}

      {/* Scan Result Modal */}
      <Modal
        visible={scanModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setScanModalVisible(false);
          setScanResult(null);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Resultat du scan</Text>
            <TouchableOpacity
              onPress={() => {
                setScanModalVisible(false);
                setScanResult(null);
              }}
            >
              <Ionicons name="close" size={24} color={Colors.dark} />
            </TouchableOpacity>
          </View>

          {scanResult && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* AI Analysis */}
              {scanResult.aiAnalysis ? (
                <View style={styles.scanAnalysisCard}>
                  <View style={styles.scanAnalysisHeader}>
                    <Ionicons name="sparkles" size={18} color={Colors.primary} />
                    <Text style={styles.scanAnalysisTitle}>Analyse IA</Text>
                  </View>
                  <Text style={styles.scanAnalysisText}>{scanResult.aiAnalysis}</Text>
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      Confiance : {Math.round(scanResult.confidenceScore * 100)}%
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Totals */}
              <View style={styles.scanTotalsCard}>
                <Text style={styles.scanTotalsTitle}>Totaux estimes</Text>
                <View style={styles.scanTotalsRow}>
                  <View style={styles.scanTotalItem}>
                    <Text style={styles.scanTotalValue}>{scanResult.estimatedTotalCalories}</Text>
                    <Text style={styles.scanTotalLabel}>kcal</Text>
                  </View>
                  <View style={styles.scanTotalItem}>
                    <Text style={[styles.scanTotalValue, { color: '#4CAF50' }]}>{scanResult.estimatedProteinsG}g</Text>
                    <Text style={styles.scanTotalLabel}>Prot.</Text>
                  </View>
                  <View style={styles.scanTotalItem}>
                    <Text style={[styles.scanTotalValue, { color: '#2196F3' }]}>{scanResult.estimatedCarbsG}g</Text>
                    <Text style={styles.scanTotalLabel}>Gluc.</Text>
                  </View>
                  <View style={styles.scanTotalItem}>
                    <Text style={[styles.scanTotalValue, { color: '#FF9800' }]}>{scanResult.estimatedFatsG}g</Text>
                    <Text style={styles.scanTotalLabel}>Lip.</Text>
                  </View>
                </View>
              </View>

              {/* Detected Items */}
              <Text style={styles.detectedItemsTitle}>
                Aliments detectes ({scanResult.detectedItems.length})
              </Text>
              {scanResult.detectedItems.map((item, idx) => (
                <View key={idx} style={styles.detectedItem}>
                  <View style={styles.detectedItemLeft}>
                    <Text style={styles.detectedItemName}>{item.name}</Text>
                    {item.nameAr && (
                      <Text style={styles.detectedItemNameAr}>{item.nameAr}</Text>
                    )}
                    <Text style={styles.detectedItemQuantity}>
                      ~{item.estimatedQuantityG}g
                    </Text>
                  </View>
                  <View style={styles.detectedItemRight}>
                    <Text style={styles.detectedItemCalories}>{item.calories} kcal</Text>
                    <Text style={styles.detectedItemMacros}>
                      P:{item.proteinsG}g  G:{item.carbsG}g  L:{item.fatsG}g
                    </Text>
                  </View>
                </View>
              ))}

              {/* Action buttons */}
              <View style={styles.scanActions}>
                <TouchableOpacity
                  style={styles.scanConfirmButton}
                  onPress={handleConfirmScan}
                  activeOpacity={0.85}
                  disabled={addingScanMeal}
                >
                  {addingScanMeal ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={22} color={Colors.white} />
                      <Text style={styles.scanConfirmText}>Ajouter au journal</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.scanCancelButton}
                  onPress={() => {
                    setScanModalVisible(false);
                    setScanResult(null);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.scanCancelText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 32,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.dark,
    marginBottom: 20,
  },

  // Date Selector
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateArrow: {
    padding: 8,
  },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  dateText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },

  // Macro Card
  macroCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },

  // Meal Sections
  mealSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  mealSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  mealSectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealSectionTitle: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  mealSectionCalories: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.medium,
    color: Colors.gray,
  },
  addMealButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Food Items
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  foodItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  foodName: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.medium,
    color: Colors.dark,
  },
  foodQuantity: {
    fontSize: Fonts.size.sm,
    color: Colors.lightGray,
    marginTop: 2,
  },
  foodItemRight: {
    alignItems: 'flex-end',
  },
  foodCalories: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  foodMacros: {
    fontSize: Fonts.size.xs,
    color: Colors.gray,
    marginTop: 2,
  },

  // Empty State
  emptyMealSection: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyMealText: {
    ...Typography.caption,
    color: Colors.lightGray,
  },

  // Action Buttons
  actionButtons: {
    gap: 12,
    marginTop: 10,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  scanButtonText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.white,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  manualButtonText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.primary,
  },
  recipesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.warning,
    backgroundColor: Colors.warningLight,
  },
  recipesButtonText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.warning,
  },

  // Scanning overlay
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  scanningBox: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  scanningText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  scanningSubtext: {
    fontSize: Fonts.size.sm,
    color: Colors.gray,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    ...Typography.h4,
    color: Colors.dark,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Scan Analysis
  scanAnalysisCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  scanAnalysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  scanAnalysisTitle: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  scanAnalysisText: {
    ...Typography.body,
    color: Colors.gray,
    lineHeight: 20,
  },
  confidenceBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryDim,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confidenceText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.primary,
  },

  // Scan Totals
  scanTotalsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  scanTotalsTitle: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    marginBottom: 12,
  },
  scanTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scanTotalItem: {
    alignItems: 'center',
  },
  scanTotalValue: {
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    color: Colors.primary,
  },
  scanTotalLabel: {
    fontSize: Fonts.size.xs,
    color: Colors.gray,
    marginTop: 2,
  },

  // Detected Items
  detectedItemsTitle: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    marginBottom: 10,
  },
  detectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  detectedItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  detectedItemName: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.medium,
    color: Colors.dark,
  },
  detectedItemNameAr: {
    fontSize: Fonts.size.sm,
    color: Colors.gray,
    marginTop: 2,
  },
  detectedItemQuantity: {
    fontSize: Fonts.size.sm,
    color: Colors.lightGray,
    marginTop: 2,
  },
  detectedItemRight: {
    alignItems: 'flex-end',
  },
  detectedItemCalories: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },
  detectedItemMacros: {
    fontSize: Fonts.size.xs,
    color: Colors.gray,
    marginTop: 2,
  },

  // Scan Actions
  scanActions: {
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  scanConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
  },
  scanConfirmText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.white,
  },
  scanCancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  scanCancelText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    color: Colors.gray,
  },
});
