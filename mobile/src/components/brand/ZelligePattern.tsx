/**
 * Zellige Pattern — étoiles à 8 pointes répétées en grille.
 *
 * Implémentation safe : on rend chaque étoile individuellement
 * (pas de <Pattern> SVG element qui peut crasher sur certaines versions du dev client).
 */
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/constants/colors';

interface ZelligePatternProps {
  width?: number;
  height?: number;
  color?: string;
  opacity?: number;
  tileSize?: number;
}

function buildStarPath(cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.71;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M ${points[0]} ${points.slice(1).map((p) => 'L ' + p).join(' ')} Z`;
}

export const ZelligePattern: React.FC<ZelligePatternProps> = ({
  width = 400,
  height = 400,
  color = Colors.primary,
  opacity = 0.06,
  tileSize = 60,
}) => {
  const cols = Math.ceil(width / tileSize) + 1;
  const rows = Math.ceil(height / tileSize) + 1;
  const r = tileSize * 0.4;

  const stars: string[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * tileSize + tileSize / 2;
      const cy = row * tileSize + tileSize / 2;
      stars.push(buildStarPath(cx, cy, r));
    }
  }

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute' }}
      pointerEvents="none"
    >
      {stars.map((d, idx) => (
        <Path key={idx} d={d} fill={color} fillOpacity={opacity} />
      ))}
    </Svg>
  );
};

export default ZelligePattern;
