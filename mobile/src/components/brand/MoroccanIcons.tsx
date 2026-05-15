/**
 * Big Boss Fitness — Icônes culturelles marocaines
 *
 * Icônes customs SVG pour donner une signature visuelle marocaine.
 * Style outline 2px, cohérent avec Ionicons.
 *
 * Usage :
 *   import { TagineIcon, ZelligeStarIcon, CrescentIcon } from '@/components/brand/MoroccanIcons';
 *   <TagineIcon size={24} color={Colors.primary} />
 */
import React from 'react';
import Svg, { Path, Circle, Line, G, Polygon } from 'react-native-svg';
import { Colors } from '@/constants/colors';

interface IconProps {
  size?: number;
  color?: string;
  filled?: boolean;
}

// ─── Étoile zellige (8 pointes) ─────────────────────────────────
export const ZelligeStarIcon: React.FC<IconProps> = ({ size = 24, color = Colors.primary, filled = false }) => {
  const cx = 12, cy = 12, r = 10;
  const points: string[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.71;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  const d = `M ${points[0]} ${points.slice(1).map((p) => 'L ' + p).join(' ')} Z`;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} fill={filled ? color : 'none'} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
};

// ─── Tagine (pour recettes marocaines) ──────────────────────────
export const TagineIcon: React.FC<IconProps> = ({ size = 24, color = Colors.primary, filled = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Base/plat */}
    <Path
      d="M 3 18 L 4 20 L 20 20 L 21 18"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={filled ? color : 'none'}
    />
    {/* Couvercle conique */}
    <Path
      d="M 4 18 Q 4 8 12 4 Q 20 8 20 18"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
      fill={filled ? color : 'none'}
    />
    {/* Pommeau du couvercle */}
    <Circle cx={12} cy={4} r={1} fill={color} />
    {/* Vapeur (3 traits ondulés) */}
    <Path
      d="M 8 14 Q 9 13 8 12 M 12 14 Q 13 13 12 12 M 16 14 Q 17 13 16 12"
      stroke={color}
      strokeWidth={1.2}
      strokeLinecap="round"
      fill="none"
      opacity={0.7}
    />
  </Svg>
);

// ─── Croissant + étoile (Ramadan) ───────────────────────────────
export const CrescentIcon: React.FC<IconProps> = ({ size = 24, color = Colors.primary, filled = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Croissant */}
    <Path
      d="M 16 4 a 9 9 0 1 0 0 16 a 7 7 0 1 1 0 -16 Z"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    {/* Petite étoile à 5 branches à droite */}
    <Path
      d="M 19 9 L 19.6 10.4 L 21 10.6 L 20 11.6 L 20.3 13 L 19 12.3 L 17.7 13 L 18 11.6 L 17 10.6 L 18.4 10.4 Z"
      fill={color}
    />
  </Svg>
);

// ─── Hammam (récupération / spa) ────────────────────────────────
export const HammamIcon: React.FC<IconProps> = ({ size = 24, color = Colors.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Arche décorative */}
    <Path
      d="M 4 20 L 4 12 Q 4 4 12 4 Q 20 4 20 12 L 20 20"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    {/* Sol */}
    <Line x1={3} y1={20} x2={21} y2={20} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    {/* Vapeur */}
    <Path
      d="M 8 11 Q 9 9 8 7 M 12 11 Q 13 9 12 7 M 16 11 Q 17 9 16 7"
      stroke={color}
      strokeWidth={1.4}
      strokeLinecap="round"
      opacity={0.6}
    />
    {/* Décoration centre arche */}
    <Circle cx={12} cy={11} r={1.5} fill={color} />
  </Svg>
);

// ─── Couronne berbère (achievement / champion) ──────────────────
export const BerberCrownIcon: React.FC<IconProps> = ({ size = 24, color = Colors.gold, filled = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Triangles berbères stylisés (3 pics) */}
    <Path
      d="M 3 18 L 3 12 L 7 14 L 12 6 L 17 14 L 21 12 L 21 18 Z"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    {/* Base */}
    <Line x1={3} y1={20} x2={21} y2={20} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    {/* Petites étoiles décoratives sur la couronne */}
    <Circle cx={7} cy={15} r={0.8} fill={color} />
    <Circle cx={12} cy={11} r={0.8} fill={color} />
    <Circle cx={17} cy={15} r={0.8} fill={color} />
  </Svg>
);

// ─── Tapis berbère (programme) ──────────────────────────────────
export const BerberRugIcon: React.FC<IconProps> = ({ size = 24, color = Colors.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Cadre extérieur */}
    <Path d="M 4 5 L 20 5 L 20 19 L 4 19 Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    {/* Losange central */}
    <Path d="M 12 8 L 17 12 L 12 16 L 7 12 Z" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
    {/* Petite croix au centre */}
    <Line x1={12} y1={11} x2={12} y2={13} stroke={color} strokeWidth={1.2} strokeLinecap="round" />
    <Line x1={11} y1={12} x2={13} y2={12} stroke={color} strokeWidth={1.2} strokeLinecap="round" />
  </Svg>
);

// ─── Khamsa / Main de Fatma (protection) ────────────────────────
export const KhamsaIcon: React.FC<IconProps> = ({ size = 24, color = Colors.primary, filled = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Main stylisée (paume + 3 doigts visibles) */}
    <Path
      d="M 8 20 L 8 12 Q 8 10 9.5 10 Q 11 10 11 12 L 11 8 Q 11 6 12.5 6 Q 14 6 14 8 L 14 9 Q 14 6 15.5 6 Q 17 6 17 8 L 17 16 Q 17 20 13 20 Z"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
    {/* Œil au centre */}
    <Circle cx={12.5} cy={14} r={1.5} stroke={color} strokeWidth={1} fill="none" />
    <Circle cx={12.5} cy={14} r={0.5} fill={color} />
  </Svg>
);

// ─── Atlas / Montagne (force, programmes) ───────────────────────
export const AtlasMountainIcon: React.FC<IconProps> = ({ size = 24, color = Colors.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Soleil/lune en arrière */}
    <Circle cx={17} cy={7} r={2} stroke={color} strokeWidth={1.4} fill="none" opacity={0.7} />
    {/* Montagnes Atlas (2 pics) */}
    <Path
      d="M 2 20 L 8 11 L 12 16 L 16 8 L 22 20 Z"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    {/* Neige sur les sommets */}
    <Path d="M 7 12 L 9 12 M 15 9 L 17 9" stroke={color} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
  </Svg>
);

// ─── Cèdre (symbole de l'Atlas) ─────────────────────────────────
export const CedarIcon: React.FC<IconProps> = ({ size = 24, color = Colors.accent }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Tronc */}
    <Line x1={12} y1={12} x2={12} y2={20} stroke={color} strokeWidth={2} strokeLinecap="round" />
    {/* 3 niveaux de branches stylisées */}
    <Path d="M 6 7 L 12 4 L 18 7 Z" fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M 5 12 L 12 8 L 19 12 Z" fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    {/* Base */}
    <Line x1={9} y1={20} x2={15} y2={20} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);
