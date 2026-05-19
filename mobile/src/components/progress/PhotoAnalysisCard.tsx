import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import type { PhotoAnalysis } from '@/services/progress.service';

/**
 * Sprint 4.4 — Affiche le résultat de l'analyse Claude Vision d'une photo de progression.
 */
export function PhotoAnalysisCard({ analysis }: { analysis: PhotoAnalysis }) {
  const muscleColor = (level: string): string => {
    switch (level) {
      case 'well-developed': return Colors.success;
      case 'developed': return '#4A7C59';      // vert atlas
      case 'average': return '#D4A24C';        // gold safran
      case 'underdeveloped': return Colors.warning;
      default: return Colors.gray;
    }
  };

  const muscleLabel = (level: string): string => {
    switch (level) {
      case 'well-developed': return 'Excellent';
      case 'developed': return 'Bon';
      case 'average': return 'Moyen';
      case 'underdeveloped': return 'À travailler';
      default: return level;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header avec body fat */}
      <View style={styles.bodyFatCard}>
        <View style={styles.bodyFatHeader}>
          <Ionicons name="body-outline" size={22} color={Colors.gold} />
          <Text style={styles.bodyFatTitle}>Body Fat estimé</Text>
        </View>
        <Text style={styles.bodyFatValue}>{analysis.bodyFatEstimate}%</Text>
        <Text style={styles.bodyFatRange}>Plage estimée : {analysis.bodyFatRange}</Text>
      </View>

      {/* Scores posture + masse */}
      <View style={styles.scoresRow}>
        <View style={styles.scoreCard}>
          <Ionicons name="walk-outline" size={20} color={Colors.primary} />
          <Text style={styles.scoreLabel}>Posture</Text>
          <Text style={styles.scoreValue}>{analysis.postureScore}<Text style={styles.scoreMax}>/10</Text></Text>
        </View>
        <View style={styles.scoreCard}>
          <Ionicons name="fitness-outline" size={20} color={Colors.primary} />
          <Text style={styles.scoreLabel}>Masse musculaire</Text>
          <Text style={styles.scoreValue}>{analysis.muscleMassScore}<Text style={styles.scoreMax}>/10</Text></Text>
        </View>
      </View>

      {/* Distribution musculaire */}
      <Text style={styles.sectionTitle}>Distribution musculaire</Text>
      <View style={styles.muscleGrid}>
        {Object.entries(analysis.muscleDistribution).map(([muscle, level]) => (
          <View key={muscle} style={[styles.muscleChip, { borderColor: muscleColor(level) + '55' }]}>
            <Text style={styles.muscleName}>{labelFr(muscle)}</Text>
            <Text style={[styles.muscleLevel, { color: muscleColor(level) }]}>{muscleLabel(level)}</Text>
          </View>
        ))}
      </View>

      {/* Points forts */}
      {analysis.strengths?.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Points forts ✨</Text>
          {analysis.strengths.map((s, i) => (
            <View key={i} style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.bulletText}>{s}</Text>
            </View>
          ))}
        </>
      )}

      {/* À améliorer */}
      {analysis.areasToImprove?.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>À travailler 💪</Text>
          {analysis.areasToImprove.map((s, i) => (
            <View key={i} style={styles.bulletRow}>
              <Ionicons name="trending-up" size={16} color={Colors.warning} />
              <Text style={styles.bulletText}>{s}</Text>
            </View>
          ))}
        </>
      )}

      {/* Recommandation */}
      {analysis.recommendation && (
        <View style={styles.recoCard}>
          <View style={styles.recoHeader}>
            <Ionicons name="bulb" size={20} color={Colors.gold} />
            <Text style={styles.recoTitle}>Recommandation coach</Text>
          </View>
          <Text style={styles.recoText}>{analysis.recommendation}</Text>
        </View>
      )}

      {/* Confidence + disclaimer */}
      <View style={styles.footerRow}>
        <Text style={styles.confidence}>Confiance IA : {Math.round((analysis.confidenceScore || 0) * 100)}%</Text>
      </View>
      {analysis.disclaimer && (
        <Text style={styles.disclaimer}>⚠ {analysis.disclaimer}</Text>
      )}
    </ScrollView>
  );
}

function labelFr(muscle: string): string {
  const map: Record<string, string> = {
    chest: 'Pectoraux',
    back: 'Dos',
    arms: 'Bras',
    shoulders: 'Épaules',
    core: 'Abdos',
    legs: 'Jambes',
  };
  return map[muscle] ?? muscle;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  bodyFatCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  bodyFatHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  bodyFatTitle: { fontSize: Fonts.size.md, fontWeight: Fonts.weight.semiBold, color: Colors.dark },
  bodyFatValue: { fontSize: Fonts.size['4xl'], fontWeight: Fonts.weight.bold, color: Colors.gold, lineHeight: 48 },
  bodyFatRange: { fontSize: Fonts.size.sm, color: Colors.gray, marginTop: 4 },

  scoresRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  scoreCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreLabel: { fontSize: Fonts.size.xs, color: Colors.gray, marginTop: 4 },
  scoreValue: { fontSize: Fonts.size['2xl'], fontWeight: Fonts.weight.bold, color: Colors.dark, marginTop: 2 },
  scoreMax: { fontSize: Fonts.size.md, color: Colors.lightGray, fontWeight: Fonts.weight.medium },

  sectionTitle: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.dark,
    marginTop: 16,
    marginBottom: 10,
  },
  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muscleChip: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  muscleName: { fontSize: Fonts.size.xs, fontWeight: Fonts.weight.medium, color: Colors.dark },
  muscleLevel: { fontSize: Fonts.size.xs, fontWeight: Fonts.weight.semiBold },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginVertical: 4 },
  bulletText: { flex: 1, fontSize: Fonts.size.sm, color: Colors.dark, lineHeight: 20 },

  recoCard: {
    backgroundColor: '#F8F2E8',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.gold,
  },
  recoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  recoTitle: { fontSize: Fonts.size.sm, fontWeight: Fonts.weight.semiBold, color: Colors.dark },
  recoText: { fontSize: Fonts.size.sm, color: Colors.dark, lineHeight: 20 },

  footerRow: { marginTop: 16, alignItems: 'center' },
  confidence: { fontSize: Fonts.size.xs, color: Colors.gray },
  disclaimer: {
    fontSize: Fonts.size.xs,
    color: Colors.lightGray,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
});

export default PhotoAnalysisCard;
