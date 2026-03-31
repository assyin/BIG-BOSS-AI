import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
  PanResponder,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, Typography } from '@/constants/fonts';
import { ProgressService, ProgressPhoto } from '@/services/progress.service';

const SCREEN_WIDTH = Dimensions.get('window').width;
const COMPARE_WIDTH = SCREEN_WIDTH - 40;
const COMPARE_HEIGHT = COMPARE_WIDTH * 1.33; // 3:4 aspect ratio
const PHOTO_GRID_SIZE = (SCREEN_WIDTH - 60) / 3;

type Step = 'select-before' | 'select-after' | 'compare';

export default function CompareScreen() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('select-before');
  const [beforePhoto, setBeforePhoto] = useState<ProgressPhoto | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<ProgressPhoto | null>(null);
  const [sliderX, setSliderX] = useState(COMPARE_WIDTH / 2);
  const sliderXRef = useRef(COMPARE_WIDTH / 2);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const list = await ProgressService.getProgressPhotos();
      setPhotos(list);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(20, Math.min(COMPARE_WIDTH - 20, sliderXRef.current + gestureState.dx));
        setSliderX(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        sliderXRef.current = Math.max(20, Math.min(COMPARE_WIDTH - 20, sliderXRef.current + gestureState.dx));
        setSliderX(sliderXRef.current);
      },
    })
  ).current;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleSelectBefore = (photo: ProgressPhoto) => {
    setBeforePhoto(photo);
    setStep('select-after');
  };

  const handleSelectAfter = (photo: ProgressPhoto) => {
    setAfterPhoto(photo);
    sliderXRef.current = COMPARE_WIDTH / 2;
    setSliderX(COMPARE_WIDTH / 2);
    setStep('compare');
  };

  const handleReset = () => {
    setBeforePhoto(null);
    setAfterPhoto(null);
    setStep('select-before');
    sliderXRef.current = COMPARE_WIDTH / 2;
    setSliderX(COMPARE_WIDTH / 2);
  };

  const renderPhotoGrid = (
    titleText: string,
    onSelect: (photo: ProgressPhoto) => void,
    excludeId?: string
  ) => {
    const filteredPhotos = excludeId
      ? photos.filter((p) => p.id !== excludeId)
      : photos;

    if (filteredPhotos.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={48} color={Colors.lightGray} />
          <Text style={styles.emptyText}>Aucune photo disponible</Text>
          <Text style={styles.emptySubtext}>
            Ajoute des photos de progression depuis l'onglet Photos.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.gridScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepTitle}>{titleText}</Text>
        <Text style={styles.stepSubtitle}>
          Selectionne une photo dans la grille
        </Text>
        <View style={styles.photoGrid}>
          {filteredPhotos.map((photo) => (
            <TouchableOpacity
              key={photo.id}
              style={styles.gridItem}
              onPress={() => onSelect(photo)}
              activeOpacity={0.7}
            >
              {photo.photoUrl ? (
                <Image
                  source={{ uri: photo.photoUrl }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.gridPlaceholder}>
                  <Ionicons name="image-outline" size={24} color={Colors.lightGray} />
                </View>
              )}
              <Text style={styles.gridDate}>{formatDate(photo.recordedAt)}</Text>
              {photo.poseType && (
                <Text style={styles.gridCaption} numberOfLines={1}>
                  {photo.poseType}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderCompareView = () => {
    if (!beforePhoto || !afterPhoto) return null;

    return (
      <ScrollView
        contentContainerStyle={styles.compareScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.compareTitle}>Comparaison</Text>

        {/* Comparison slider */}
        <View style={styles.compareContainer}>
          {/* Before image (full width, behind) */}
          <Image
            source={{ uri: beforePhoto.photoUrl }}
            style={styles.compareImageFull}
            resizeMode="cover"
          />

          {/* After image (clipped to right side of slider) */}
          <View
            style={[
              styles.afterClip,
              {
                left: sliderX,
                width: COMPARE_WIDTH - sliderX,
              },
            ]}
          >
            <Image
              source={{ uri: afterPhoto.photoUrl }}
              style={[
                styles.compareImageAfter,
                {
                  width: COMPARE_WIDTH,
                  left: -sliderX,
                },
              ]}
              resizeMode="cover"
            />
          </View>

          {/* Slider line */}
          <View
            style={[styles.sliderLine, { left: sliderX - 1 }]}
          />

          {/* Slider handle */}
          <View
            {...panResponder.panHandlers}
            style={[styles.sliderHandle, { left: sliderX - 20 }]}
          >
            <View style={styles.sliderHandleInner}>
              <Ionicons name="code-outline" size={16} color={Colors.white} />
            </View>
          </View>

          {/* Before / After labels */}
          <View style={styles.labelBefore}>
            <Text style={styles.labelText}>AVANT</Text>
          </View>
          <View style={styles.labelAfter}>
            <Text style={styles.labelText}>APRES</Text>
          </View>
        </View>

        {/* Date info */}
        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
            <Text style={styles.dateText}>{formatDate(beforePhoto.recordedAt)}</Text>
          </View>
          <View style={styles.dateSpacer} />
          <View style={styles.dateItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.success} />
            <Text style={styles.dateText}>{formatDate(afterPhoto.recordedAt)}</Text>
          </View>
        </View>

        {/* Reset button */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh-outline" size={20} color={Colors.primary} />
          <Text style={styles.resetButtonText}>Choisir d'autres photos</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comparer</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step indicator */}
      {step !== 'compare' && (
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step === 'select-before' && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step === 'select-before' && styles.stepDotTextActive]}>1</Text>
          </View>
          <View style={[styles.stepLine, step === 'select-after' && styles.stepLineActive]} />
          <View style={[styles.stepDot, step === 'select-after' && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step === 'select-after' && styles.stepDotTextActive]}>2</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <>
          {step === 'select-before' &&
            renderPhotoGrid('Choisis la photo "Avant"', handleSelectBefore)}
          {step === 'select-after' &&
            renderPhotoGrid(
              'Choisis la photo "Apres"',
              handleSelectAfter,
              beforePhoto?.id
            )}
          {step === 'compare' && renderCompareView()}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 44 : 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
  },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 0,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
  },
  stepDotText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.bold,
    color: Colors.gray,
  },
  stepDotTextActive: {
    color: Colors.white,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.border,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },

  // Photo grid
  gridScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  stepTitle: {
    ...Typography.h4,
    color: Colors.dark,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  stepSubtitle: {
    ...Typography.caption,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: PHOTO_GRID_SIZE,
  },
  gridImage: {
    width: PHOTO_GRID_SIZE,
    height: PHOTO_GRID_SIZE,
    borderRadius: 10,
  },
  gridPlaceholder: {
    width: PHOTO_GRID_SIZE,
    height: PHOTO_GRID_SIZE,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gridDate: {
    fontSize: 9,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 4,
  },
  gridCaption: {
    fontSize: 9,
    color: Colors.lightGray,
    textAlign: 'center',
    marginTop: 1,
  },

  // Compare view
  compareScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  compareTitle: {
    ...Typography.h4,
    color: Colors.dark,
    marginBottom: 16,
  },
  compareContainer: {
    width: COMPARE_WIDTH,
    height: COMPARE_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.dark,
    position: 'relative',
  },
  compareImageFull: {
    width: COMPARE_WIDTH,
    height: COMPARE_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  afterClip: {
    position: 'absolute',
    top: 0,
    height: COMPARE_HEIGHT,
    overflow: 'hidden',
  },
  compareImageAfter: {
    height: COMPARE_HEIGHT,
    position: 'absolute',
    top: 0,
  },

  // Slider
  sliderLine: {
    position: 'absolute',
    top: 0,
    width: 3,
    height: COMPARE_HEIGHT,
    backgroundColor: Colors.white,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  sliderHandle: {
    position: 'absolute',
    top: COMPARE_HEIGHT / 2 - 20,
    width: 40,
    height: 40,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderHandleInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 2,
    borderColor: Colors.white,
  },

  // Labels
  labelBefore: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 5,
  },
  labelAfter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 5,
  },
  labelText: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.bold,
    color: Colors.white,
    letterSpacing: 1,
  },

  // Date row
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  dateItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dateSpacer: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
  },
  dateText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.medium,
    color: Colors.gray,
  },

  // Reset button
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryDim,
  },
  resetButtonText: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.primary,
  },

  // Empty / Loading
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    ...Typography.h4,
    color: Colors.dark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.gray,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
