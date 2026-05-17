/**
 * PoseOverlay — Affiche les 17 keypoints MoveNet en SVG par-dessus la caméra.
 *
 * Sprint 1.4 Jour 3.
 *
 * Inputs:
 *   - keypoints: 17 points MoveNet (x/y en pixels source image)
 *   - sourceWidth/Height: dimensions de l'image inférée (depuis takePictureAsync)
 *   - displayWidth/Height: dimensions de la zone caméra à l'écran
 *
 * Tracé:
 *   - Cercles colorés sur chaque keypoint (vert > 0.5 conf, jaune > 0.3, gris < 0.3)
 *   - Segments blancs reliant les paires articulaires (épaule-coude-poignet, etc.)
 */
import React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { KEYPOINTS, type Keypoint } from '@/utils/pose-engine';

const CONFIDENCE_THRESHOLD = 0.3;

// Segments squelette MoveNet (paires d'indices)
const SKELETON_EDGES: [number, number][] = [
  [KEYPOINTS.LEFT_SHOULDER, KEYPOINTS.RIGHT_SHOULDER],
  [KEYPOINTS.LEFT_SHOULDER, KEYPOINTS.LEFT_ELBOW],
  [KEYPOINTS.RIGHT_SHOULDER, KEYPOINTS.RIGHT_ELBOW],
  [KEYPOINTS.LEFT_ELBOW, KEYPOINTS.LEFT_WRIST],
  [KEYPOINTS.RIGHT_ELBOW, KEYPOINTS.RIGHT_WRIST],
  [KEYPOINTS.LEFT_SHOULDER, KEYPOINTS.LEFT_HIP],
  [KEYPOINTS.RIGHT_SHOULDER, KEYPOINTS.RIGHT_HIP],
  [KEYPOINTS.LEFT_HIP, KEYPOINTS.RIGHT_HIP],
  [KEYPOINTS.LEFT_HIP, KEYPOINTS.LEFT_KNEE],
  [KEYPOINTS.RIGHT_HIP, KEYPOINTS.RIGHT_KNEE],
  [KEYPOINTS.LEFT_KNEE, KEYPOINTS.LEFT_ANKLE],
  [KEYPOINTS.RIGHT_KNEE, KEYPOINTS.RIGHT_ANKLE],
];

interface Props {
  keypoints: Keypoint[] | null;
  sourceWidth: number;
  sourceHeight: number;
  displayWidth: number;
  displayHeight: number;
  /** Si true, miroir horizontal (front camera affichée mirrored) */
  mirrored?: boolean;
}

function getColor(score: number): string {
  if (score > 0.5) return Colors.accent; // vert atlas — confiance haute
  if (score > 0.3) return Colors.gold; // safran — confiance moyenne
  return 'rgba(255,255,255,0.3)'; // gris transparent — pas sûr
}

export const PoseOverlay: React.FC<Props> = React.memo(
  ({ keypoints, sourceWidth, sourceHeight, displayWidth, displayHeight, mirrored = false }) => {
    if (!keypoints || keypoints.length === 0) return null;

    // Scale factor pour mapper coords source → display
    const scaleX = displayWidth / sourceWidth;
    const scaleY = displayHeight / sourceHeight;

    const mapX = (x: number) => (mirrored ? displayWidth - x * scaleX : x * scaleX);
    const mapY = (y: number) => y * scaleY;

    return (
      <Svg
        width={displayWidth}
        height={displayHeight}
        style={{ position: 'absolute', top: 0, left: 0 }}
        pointerEvents="none"
      >
        {/* Segments squelette */}
        {SKELETON_EDGES.map(([i1, i2], idx) => {
          const p1 = keypoints[i1];
          const p2 = keypoints[i2];
          if (!p1 || !p2 || p1.score < CONFIDENCE_THRESHOLD || p2.score < CONFIDENCE_THRESHOLD) {
            return null;
          }
          return (
            <Line
              key={`edge-${idx}`}
              x1={mapX(p1.x)}
              y1={mapY(p1.y)}
              x2={mapX(p2.x)}
              y2={mapY(p2.y)}
              stroke="rgba(255,255,255,0.85)"
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}

        {/* Cercles keypoints */}
        {keypoints.map((kp, idx) => {
          if (kp.score < 0.15) return null; // hide low-confidence noise
          return (
            <Circle
              key={`kp-${idx}`}
              cx={mapX(kp.x)}
              cy={mapY(kp.y)}
              r={6}
              fill={getColor(kp.score)}
              stroke={Colors.white}
              strokeWidth={1.5}
            />
          );
        })}
      </Svg>
    );
  },
);

PoseOverlay.displayName = 'PoseOverlay';

export default PoseOverlay;
