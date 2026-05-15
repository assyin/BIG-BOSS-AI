/**
 * Berber Pattern — losanges + triangles répétés en bandeau.
 * Implémentation safe (pas de <Pattern> SVG).
 */
import React from 'react';
import Svg, { Path, Line } from 'react-native-svg';
import { Colors } from '@/constants/colors';

interface BerberPatternProps {
  width?: number;
  height?: number;
  color?: string;
  opacity?: number;
  tileSize?: number;
}

export const BerberPattern: React.FC<BerberPatternProps> = ({
  width = 400,
  height = 40,
  color = Colors.primary,
  opacity = 0.5,
  tileSize = 24,
}) => {
  const cols = Math.ceil(width / tileSize) + 1;
  const rows = Math.ceil(height / tileSize) + 1;
  const elements: React.ReactNode[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * tileSize;
      const y = row * tileSize;
      const key = `${row}-${col}`;

      // Losange central
      elements.push(
        <Path
          key={`d-${key}`}
          d={`M ${x + tileSize / 2} ${y + 4} L ${x + tileSize - 4} ${y + tileSize / 2} L ${x + tileSize / 2} ${y + tileSize - 4} L ${x + 4} ${y + tileSize / 2} Z`}
          fill="none"
          stroke={color}
          strokeOpacity={opacity}
          strokeWidth={1}
        />,
      );
      // Croix au centre
      elements.push(
        <Line
          key={`cv-${key}`}
          x1={x + tileSize / 2}
          y1={y + tileSize / 2 - 3}
          x2={x + tileSize / 2}
          y2={y + tileSize / 2 + 3}
          stroke={color}
          strokeOpacity={opacity}
          strokeWidth={1}
        />,
      );
      elements.push(
        <Line
          key={`ch-${key}`}
          x1={x + tileSize / 2 - 3}
          y1={y + tileSize / 2}
          x2={x + tileSize / 2 + 3}
          y2={y + tileSize / 2}
          stroke={color}
          strokeOpacity={opacity}
          strokeWidth={1}
        />,
      );
    }
  }

  return (
    <Svg width={width} height={height} style={{ position: 'absolute' }} pointerEvents="none">
      {elements}
    </Svg>
  );
};

export default BerberPattern;
