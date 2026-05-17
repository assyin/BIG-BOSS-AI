import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

export interface MuscleRadarPoint {
  label: string;       // ex: "Pectoraux"
  value: number;       // ratio 0-1 (1 = max)
}

interface Props {
  data: MuscleRadarPoint[];
  size?: number;
  fillColor?: string;
  strokeColor?: string;
  gridColor?: string;
  labelColor?: string;
}

/**
 * Sprint 3.4 — Radar chart musculaire en SVG natif (react-native-svg).
 *
 * Affiche un polygone régulier (1 axe par muscle) avec valeurs normalisées 0-1.
 * Grille concentrique à 25/50/75/100%.
 */
export function MuscleRadarChart({
  data,
  size = 280,
  fillColor = 'rgba(212, 162, 76, 0.25)',  // gold safran translucide
  strokeColor = '#D4A24C',                  // gold safran
  gridColor = '#E5DDD2',                    // beige tadelakt
  labelColor = '#3F2E1E',                   // brun foncé
}: Props) {
  if (!data || data.length < 3) {
    return (
      <View style={[styles.empty, { width: size, height: size }]}>
        <Text style={styles.emptyText}>
          Pas encore assez de données pour le radar musculaire.{'\n'}
          Complète quelques séances pour voir ta répartition.
        </Text>
      </View>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.34; // laisse de la place pour les labels

  const angleStep = (2 * Math.PI) / data.length;
  const startAngle = -Math.PI / 2; // start at top

  // Calcule un point sur l'axe i à une valeur donnée (0-1)
  const pointOnAxis = (i: number, value: number) => {
    const angle = startAngle + i * angleStep;
    const r = radius * value;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  // Polygones de grille (25, 50, 75, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  // Polygon string for data
  const dataPoints = data.map((d, i) => {
    const p = pointOnAxis(i, Math.min(1, Math.max(0, d.value)));
    return `${p.x},${p.y}`;
  }).join(' ');

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <G>
          {/* Concentric grid polygons */}
          {gridLevels.map((level, idx) => {
            const points = data.map((_, i) => {
              const p = pointOnAxis(i, level);
              return `${p.x},${p.y}`;
            }).join(' ');
            return (
              <Polygon
                key={`grid-${idx}`}
                points={points}
                fill="none"
                stroke={gridColor}
                strokeWidth={0.8}
                strokeDasharray={idx === gridLevels.length - 1 ? undefined : '3,3'}
              />
            );
          })}

          {/* Axis lines */}
          {data.map((_, i) => {
            const p = pointOnAxis(i, 1);
            return (
              <Line
                key={`axis-${i}`}
                x1={cx}
                y1={cy}
                x2={p.x}
                y2={p.y}
                stroke={gridColor}
                strokeWidth={0.6}
              />
            );
          })}

          {/* Data polygon */}
          <Polygon
            points={dataPoints}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Data vertex dots */}
          {data.map((d, i) => {
            const p = pointOnAxis(i, Math.min(1, Math.max(0, d.value)));
            return (
              <Circle key={`dot-${i}`} cx={p.x} cy={p.y} r={3.5} fill={strokeColor} />
            );
          })}

          {/* Labels */}
          {data.map((d, i) => {
            const labelP = pointOnAxis(i, 1.22);
            return (
              <SvgText
                key={`label-${i}`}
                x={labelP.x}
                y={labelP.y}
                fontSize={11}
                fontWeight="600"
                fill={labelColor}
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {d.label}
              </SvgText>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: Fonts.size.sm,
    color: Colors.lightGray,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MuscleRadarChart;
