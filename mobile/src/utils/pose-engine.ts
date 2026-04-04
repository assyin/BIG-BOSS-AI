/**
 * Pose Analysis Engine
 * Calculates joint angles and evaluates exercise form
 */

// Keypoint indices from MoveNet/MediaPipe
export const KEYPOINTS = {
  NOSE: 0,
  LEFT_EYE: 1,
  RIGHT_EYE: 2,
  LEFT_EAR: 3,
  RIGHT_EAR: 4,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,
  RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
} as const;

export interface Keypoint {
  x: number;
  y: number;
  score: number; // confidence 0-1
  name?: string;
}

export interface PoseFeedback {
  score: number; // 0-100
  issues: FeedbackItem[];
  repCount: number;
  phase: 'up' | 'down' | 'neutral';
}

export interface FeedbackItem {
  type: 'good' | 'warning' | 'error';
  message: string;
  messageAr?: string;
}

export interface ExerciseConfig {
  name: string;
  checkPoints: (keypoints: Keypoint[]) => FeedbackItem[];
  detectRep: (keypoints: Keypoint[], prevPhase: string) => { phase: string; counted: boolean };
}

// ─── Angle Calculation ───

/** Calculate angle between 3 points (in degrees) */
export function calculateAngle(
  a: Keypoint,
  b: Keypoint, // vertex
  c: Keypoint
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

/** Get midpoint between two keypoints */
function midpoint(a: Keypoint, b: Keypoint): Keypoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, score: Math.min(a.score, b.score) };
}

/** Check if keypoints are visible enough */
function isVisible(kp: Keypoint, threshold = 0.3): boolean {
  return kp.score >= threshold;
}

// ─── Exercise Configurations ───

export const EXERCISE_CONFIGS: Record<string, ExerciseConfig> = {
  squat: {
    name: 'Squat',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lKnee = kps[KEYPOINTS.LEFT_KNEE];
      const lAnkle = kps[KEYPOINTS.LEFT_ANKLE];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const rHip = kps[KEYPOINTS.RIGHT_HIP];
      const rKnee = kps[KEYPOINTS.RIGHT_KNEE];
      const rAnkle = kps[KEYPOINTS.RIGHT_ANKLE];

      if (!isVisible(lHip) || !isVisible(lKnee) || !isVisible(lAnkle)) return feedback;

      // Knee angle (should be 80-100° at bottom)
      const kneeAngle = calculateAngle(lHip, lKnee, lAnkle);

      // Hip angle (torso lean)
      const hipAngle = calculateAngle(lShoulder, lHip, lKnee);

      // Check depth
      if (kneeAngle > 160) {
        feedback.push({ type: 'good', message: 'Position debout', messageAr: 'واقف مزيان' });
      } else if (kneeAngle >= 80 && kneeAngle <= 110) {
        feedback.push({ type: 'good', message: 'Bonne profondeur!', messageAr: 'عمق مزيان!' });
      } else if (kneeAngle < 80) {
        feedback.push({ type: 'warning', message: 'Trop profond', messageAr: 'نزلت بزاف' });
      }

      // Check back angle
      if (hipAngle < 60) {
        feedback.push({ type: 'error', message: 'Redresse ton dos!', messageAr: 'نوض ضهرك!' });
      } else if (hipAngle >= 60 && hipAngle <= 90) {
        feedback.push({ type: 'good', message: 'Dos bien droit', messageAr: 'الضهر مزيان' });
      }

      // Check knees over toes
      if (isVisible(lKnee) && isVisible(lAnkle) && lKnee.x > lAnkle.x + 30) {
        feedback.push({ type: 'warning', message: 'Genoux trop en avant', messageAr: 'الركبة قدام بزاف' });
      }

      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lKnee = kps[KEYPOINTS.LEFT_KNEE];
      const lAnkle = kps[KEYPOINTS.LEFT_ANKLE];
      if (!isVisible(lHip) || !isVisible(lKnee) || !isVisible(lAnkle)) {
        return { phase: prevPhase, counted: false };
      }
      const kneeAngle = calculateAngle(lHip, lKnee, lAnkle);
      const phase = kneeAngle < 120 ? 'down' : 'up';
      const counted = prevPhase === 'down' && phase === 'up';
      return { phase, counted };
    },
  },

  pushup: {
    name: 'Pompes',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lAnkle = kps[KEYPOINTS.LEFT_ANKLE];

      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) return feedback;

      // Elbow angle
      const elbowAngle = calculateAngle(lShoulder, lElbow, lWrist);

      // Body alignment (shoulder-hip-ankle should be ~180°)
      if (isVisible(lHip) && isVisible(lAnkle)) {
        const bodyAngle = calculateAngle(lShoulder, lHip, lAnkle);
        if (bodyAngle < 160) {
          feedback.push({ type: 'error', message: 'Hanches trop hautes!', messageAr: 'الوسط طالع بزاف!' });
        } else if (bodyAngle > 195) {
          feedback.push({ type: 'warning', message: 'Hanches trop basses', messageAr: 'الوسط نازل' });
        } else {
          feedback.push({ type: 'good', message: 'Corps bien aligne', messageAr: 'الجسم مستقيم مزيان' });
        }
      }

      if (elbowAngle < 100) {
        feedback.push({ type: 'good', message: 'Bonne amplitude!', messageAr: 'نزول مزيان!' });
      }

      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) {
        return { phase: prevPhase, counted: false };
      }
      const elbowAngle = calculateAngle(lShoulder, lElbow, lWrist);
      const phase = elbowAngle < 120 ? 'down' : 'up';
      const counted = prevPhase === 'down' && phase === 'up';
      return { phase, counted };
    },
  },

  curl: {
    name: 'Curl Biceps',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      const lHip = kps[KEYPOINTS.LEFT_HIP];

      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) return feedback;

      const elbowAngle = calculateAngle(lShoulder, lElbow, lWrist);

      // Check elbow stays fixed (shoulder-elbow-hip angle)
      if (isVisible(lHip)) {
        const shoulderDrift = Math.abs(lElbow.x - lHip.x);
        if (shoulderDrift > 50) {
          feedback.push({ type: 'warning', message: 'Coude fixe!', messageAr: 'ثبت الكوع!' });
        }
      }

      if (elbowAngle < 50) {
        feedback.push({ type: 'good', message: 'Contraction max!', messageAr: 'انقباض مزيان!' });
      } else if (elbowAngle > 160) {
        feedback.push({ type: 'good', message: 'Extension complete', messageAr: 'مد كامل' });
      }

      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) {
        return { phase: prevPhase, counted: false };
      }
      const elbowAngle = calculateAngle(lShoulder, lElbow, lWrist);
      const phase = elbowAngle < 90 ? 'up' : 'down';
      const counted = prevPhase === 'up' && phase === 'down';
      return { phase, counted };
    },
  },

  deadlift: {
    name: 'Souleve de terre',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lKnee = kps[KEYPOINTS.LEFT_KNEE];
      const lAnkle = kps[KEYPOINTS.LEFT_ANKLE];

      if (!isVisible(lShoulder) || !isVisible(lHip) || !isVisible(lKnee)) return feedback;

      // Back angle
      const backAngle = calculateAngle(lShoulder, lHip, lKnee);
      if (backAngle < 50) {
        feedback.push({ type: 'error', message: 'Dos trop arrondi!', messageAr: 'الضهر محني بزاف!' });
      } else {
        feedback.push({ type: 'good', message: 'Dos plat', messageAr: 'الضهر مستقيم' });
      }

      // Hip hinge
      const hipAngle = calculateAngle(lShoulder, lHip, lAnkle);
      if (hipAngle > 170) {
        feedback.push({ type: 'good', message: 'Position haute', messageAr: 'واقف' });
      }

      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lKnee = kps[KEYPOINTS.LEFT_KNEE];
      if (!isVisible(lShoulder) || !isVisible(lHip) || !isVisible(lKnee)) {
        return { phase: prevPhase, counted: false };
      }
      const hipAngle = calculateAngle(lShoulder, lHip, lKnee);
      const phase = hipAngle < 120 ? 'down' : 'up';
      const counted = prevPhase === 'down' && phase === 'up';
      return { phase, counted };
    },
  },

  overhead_press: {
    name: 'Developpe epaules',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      const lHip = kps[KEYPOINTS.LEFT_HIP];

      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) return feedback;

      const elbowAngle = calculateAngle(lShoulder, lElbow, lWrist);

      if (elbowAngle > 165) {
        feedback.push({ type: 'good', message: 'Extension complete!', messageAr: 'مد كامل!' });
      }

      // Check core stability
      if (isVisible(lHip)) {
        const torsoLean = Math.abs(lShoulder.x - lHip.x);
        if (torsoLean > 40) {
          feedback.push({ type: 'warning', message: 'Reste droit, pas de lean!', messageAr: 'بقا مستقيم!' });
        }
      }

      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) {
        return { phase: prevPhase, counted: false };
      }
      const elbowAngle = calculateAngle(lShoulder, lElbow, lWrist);
      const phase = elbowAngle > 150 ? 'up' : 'down';
      const counted = prevPhase === 'down' && phase === 'up';
      return { phase, counted };
    },
  },
};

/** Calculate overall form score from feedback items */
export function calculateFormScore(items: FeedbackItem[]): number {
  if (items.length === 0) return 100;
  let score = 100;
  for (const item of items) {
    if (item.type === 'error') score -= 25;
    else if (item.type === 'warning') score -= 10;
  }
  return Math.max(0, Math.min(100, score));
}
