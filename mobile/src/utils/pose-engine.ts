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

  // ─── BENCH PRESS ───
  bench_press: {
    name: 'Developpe couche',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) return feedback;
      const elbowAngle = calculateAngle(lShoulder, lElbow, lWrist);
      if (elbowAngle < 95) {
        feedback.push({ type: 'good', message: 'Bonne amplitude!', messageAr: 'نزول مزيان!' });
      } else if (elbowAngle > 170) {
        feedback.push({ type: 'good', message: 'Lockout complet', messageAr: 'مد كامل' });
      }
      // Check elbow flare
      if (isVisible(lShoulder) && isVisible(lElbow)) {
        const flare = Math.abs(lElbow.y - lShoulder.y);
        if (flare < 15) {
          feedback.push({ type: 'warning', message: 'Coudes trop ouverts', messageAr: 'الكيعان مفتوحين بزاف' });
        }
      }
      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) return { phase: prevPhase, counted: false };
      const angle = calculateAngle(lShoulder, lElbow, lWrist);
      const phase = angle < 120 ? 'down' : 'up';
      return { phase, counted: prevPhase === 'down' && phase === 'up' };
    },
  },

  // ─── ROWING ───
  rowing: {
    name: 'Rowing',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lKnee = kps[KEYPOINTS.LEFT_KNEE];
      if (!isVisible(lShoulder) || !isVisible(lHip)) return feedback;
      const backAngle = calculateAngle(lShoulder, lHip, lKnee);
      if (backAngle < 50) {
        feedback.push({ type: 'error', message: 'Dos trop arrondi!', messageAr: 'الضهر محني!' });
      } else if (backAngle >= 50 && backAngle <= 80) {
        feedback.push({ type: 'good', message: 'Bon angle du dos', messageAr: 'زاوية الضهر مزيانة' });
      }
      if (isVisible(lElbow) && isVisible(lHip)) {
        if (lElbow.y > lHip.y) {
          feedback.push({ type: 'good', message: 'Bonne contraction!', messageAr: 'انقباض مزيان!' });
        }
      }
      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) return { phase: prevPhase, counted: false };
      const angle = calculateAngle(lShoulder, lElbow, lWrist);
      const phase = angle < 100 ? 'up' : 'down';
      return { phase, counted: prevPhase === 'up' && phase === 'down' };
    },
  },

  // ─── LUNGE / FENTES ───
  lunge: {
    name: 'Fentes',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lKnee = kps[KEYPOINTS.LEFT_KNEE];
      const lAnkle = kps[KEYPOINTS.LEFT_ANKLE];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      if (!isVisible(lHip) || !isVisible(lKnee) || !isVisible(lAnkle)) return feedback;
      const kneeAngle = calculateAngle(lHip, lKnee, lAnkle);
      if (kneeAngle >= 80 && kneeAngle <= 100) {
        feedback.push({ type: 'good', message: 'Bon angle du genou!', messageAr: 'زاوية الركبة مزيانة!' });
      } else if (kneeAngle < 80) {
        feedback.push({ type: 'warning', message: 'Genou trop fléchi', messageAr: 'الركبة مطوية بزاف' });
      }
      if (isVisible(lShoulder) && isVisible(lHip)) {
        const torsoLean = Math.abs(lShoulder.x - lHip.x);
        if (torsoLean > 30) {
          feedback.push({ type: 'warning', message: 'Buste droit!', messageAr: 'نوض الصدر!' });
        }
      }
      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lKnee = kps[KEYPOINTS.LEFT_KNEE];
      const lAnkle = kps[KEYPOINTS.LEFT_ANKLE];
      if (!isVisible(lHip) || !isVisible(lKnee) || !isVisible(lAnkle)) return { phase: prevPhase, counted: false };
      const angle = calculateAngle(lHip, lKnee, lAnkle);
      const phase = angle < 120 ? 'down' : 'up';
      return { phase, counted: prevPhase === 'down' && phase === 'up' };
    },
  },

  // ─── DIPS ───
  dips: {
    name: 'Dips',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) return feedback;
      const elbowAngle = calculateAngle(lShoulder, lElbow, lWrist);
      if (elbowAngle <= 90) {
        feedback.push({ type: 'good', message: 'Bonne profondeur!', messageAr: 'عمق مزيان!' });
      } else if (elbowAngle > 160) {
        feedback.push({ type: 'good', message: 'Lockout!', messageAr: 'مد كامل!' });
      }
      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) return { phase: prevPhase, counted: false };
      const angle = calculateAngle(lShoulder, lElbow, lWrist);
      const phase = angle < 110 ? 'down' : 'up';
      return { phase, counted: prevPhase === 'down' && phase === 'up' };
    },
  },

  // ─── PULL UP / TRACTIONS ───
  pullup: {
    name: 'Tractions',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) return feedback;
      const elbowAngle = calculateAngle(lShoulder, lElbow, lWrist);
      if (elbowAngle < 80) {
        feedback.push({ type: 'good', message: 'Menton au-dessus!', messageAr: 'الذقن فوق!' });
      } else if (elbowAngle > 160) {
        feedback.push({ type: 'good', message: 'Extension complete', messageAr: 'مد كامل' });
      }
      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) return { phase: prevPhase, counted: false };
      const angle = calculateAngle(lShoulder, lElbow, lWrist);
      const phase = angle < 100 ? 'up' : 'down';
      return { phase, counted: prevPhase === 'up' && phase === 'down' };
    },
  },

  // ─── HIP THRUST ───
  hip_thrust: {
    name: 'Hip Thrust',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lKnee = kps[KEYPOINTS.LEFT_KNEE];
      if (!isVisible(lShoulder) || !isVisible(lHip) || !isVisible(lKnee)) return feedback;
      const hipAngle = calculateAngle(lShoulder, lHip, lKnee);
      if (hipAngle > 170) {
        feedback.push({ type: 'good', message: 'Full extension!', messageAr: 'مد كامل ديال الورك!' });
      } else if (hipAngle < 100) {
        feedback.push({ type: 'good', message: 'Position basse', messageAr: 'نزول' });
      }
      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lKnee = kps[KEYPOINTS.LEFT_KNEE];
      if (!isVisible(lShoulder) || !isVisible(lHip) || !isVisible(lKnee)) return { phase: prevPhase, counted: false };
      const angle = calculateAngle(lShoulder, lHip, lKnee);
      const phase = angle > 150 ? 'up' : 'down';
      return { phase, counted: prevPhase === 'down' && phase === 'up' };
    },
  },

  // ─── PLANCHE ───
  plank: {
    name: 'Planche',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lAnkle = kps[KEYPOINTS.LEFT_ANKLE];
      if (!isVisible(lShoulder) || !isVisible(lHip) || !isVisible(lAnkle)) return feedback;
      const bodyAngle = calculateAngle(lShoulder, lHip, lAnkle);
      if (bodyAngle >= 165 && bodyAngle <= 195) {
        feedback.push({ type: 'good', message: 'Corps bien aligne!', messageAr: 'الجسم مستقيم مزيان!' });
      } else if (bodyAngle < 165) {
        feedback.push({ type: 'error', message: 'Hanches trop hautes!', messageAr: 'الوسط طالع بزاف!' });
      } else {
        feedback.push({ type: 'error', message: 'Hanches trop basses!', messageAr: 'الوسط نازل بزاف!' });
      }
      return feedback;
    },
    detectRep: (_kps, prevPhase) => ({ phase: 'neutral', counted: false }), // Isometric, no reps
  },

  // ─── CRUNCH ───
  crunch: {
    name: 'Crunch',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lKnee = kps[KEYPOINTS.LEFT_KNEE];
      if (!isVisible(lShoulder) || !isVisible(lHip)) return feedback;
      if (isVisible(lKnee)) {
        const angle = calculateAngle(lShoulder, lHip, lKnee);
        if (angle < 70) {
          feedback.push({ type: 'good', message: 'Bonne contraction!', messageAr: 'انقباض مزيان!' });
        }
      }
      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lKnee = kps[KEYPOINTS.LEFT_KNEE];
      if (!isVisible(lShoulder) || !isVisible(lHip) || !isVisible(lKnee)) return { phase: prevPhase, counted: false };
      const angle = calculateAngle(lShoulder, lHip, lKnee);
      const phase = angle < 80 ? 'up' : 'down';
      return { phase, counted: prevPhase === 'up' && phase === 'down' };
    },
  },

  // ─── LATERAL RAISE ───
  lateral_raise: {
    name: 'Elevations laterales',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lHip)) return feedback;
      const armAngle = calculateAngle(lElbow, lShoulder, lHip);
      if (armAngle >= 80 && armAngle <= 100) {
        feedback.push({ type: 'good', message: 'Bras a l\'horizontale!', messageAr: 'الذراع فالمستوى!' });
      } else if (armAngle > 100) {
        feedback.push({ type: 'warning', message: 'Pas trop haut!', messageAr: 'ما تطلعش بزاف!' });
      }
      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lHip)) return { phase: prevPhase, counted: false };
      const armAngle = calculateAngle(lElbow, lShoulder, lHip);
      const phase = armAngle > 60 ? 'up' : 'down';
      return { phase, counted: prevPhase === 'up' && phase === 'down' };
    },
  },

  // ─── TRICEP EXTENSION ───
  tricep_extension: {
    name: 'Extension triceps',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) return feedback;
      const elbowAngle = calculateAngle(lShoulder, lElbow, lWrist);
      if (elbowAngle > 165) {
        feedback.push({ type: 'good', message: 'Extension complete!', messageAr: 'مد كامل!' });
      }
      // Check elbow stability
      const elbowDrift = Math.abs(lElbow.x - lShoulder.x);
      if (elbowDrift > 40) {
        feedback.push({ type: 'warning', message: 'Coude fixe!', messageAr: 'ثبت الكوع!' });
      }
      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) return { phase: prevPhase, counted: false };
      const angle = calculateAngle(lShoulder, lElbow, lWrist);
      const phase = angle > 140 ? 'up' : 'down';
      return { phase, counted: prevPhase === 'down' && phase === 'up' };
    },
  },

  // ─── CALF RAISE ───
  calf_raise: {
    name: 'Mollets',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lKnee = kps[KEYPOINTS.LEFT_KNEE];
      const lAnkle = kps[KEYPOINTS.LEFT_ANKLE];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      if (!isVisible(lKnee) || !isVisible(lAnkle) || !isVisible(lHip)) return feedback;
      // Check if on toes (ankle rises)
      const kneeAngle = calculateAngle(lHip, lKnee, lAnkle);
      if (kneeAngle > 170) {
        feedback.push({ type: 'good', message: 'Jambes tendues', messageAr: 'الرجلين مدودين' });
      }
      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lAnkle = kps[KEYPOINTS.LEFT_ANKLE];
      if (!isVisible(lHip) || !isVisible(lAnkle)) return { phase: prevPhase, counted: false };
      // Detect by hip height change
      const hipHeight = lHip.y;
      const phase = hipHeight < 0.45 ? 'up' : 'down'; // Normalized coordinates
      return { phase, counted: prevPhase === 'up' && phase === 'down' };
    },
  },

  // ─── FRONT RAISE ───
  front_raise: {
    name: 'Elevations frontales',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lHip)) return feedback;
      const armAngle = calculateAngle(lElbow, lShoulder, lHip);
      if (armAngle >= 80 && armAngle <= 100) {
        feedback.push({ type: 'good', message: 'Hauteur parfaite!', messageAr: 'الارتفاع مزيان!' });
      } else if (armAngle > 110) {
        feedback.push({ type: 'warning', message: 'Trop haut!', messageAr: 'طالع بزاف!' });
      }
      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lHip)) return { phase: prevPhase, counted: false };
      const angle = calculateAngle(lElbow, lShoulder, lHip);
      const phase = angle > 60 ? 'up' : 'down';
      return { phase, counted: prevPhase === 'up' && phase === 'down' };
    },
  },

  // ─── LEG CURL ───
  leg_curl: {
    name: 'Leg Curl',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lKnee = kps[KEYPOINTS.LEFT_KNEE];
      const lAnkle = kps[KEYPOINTS.LEFT_ANKLE];
      if (!isVisible(lHip) || !isVisible(lKnee) || !isVisible(lAnkle)) return feedback;
      const kneeAngle = calculateAngle(lHip, lKnee, lAnkle);
      if (kneeAngle < 60) {
        feedback.push({ type: 'good', message: 'Contraction max!', messageAr: 'انقباض كامل!' });
      }
      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lKnee = kps[KEYPOINTS.LEFT_KNEE];
      const lAnkle = kps[KEYPOINTS.LEFT_ANKLE];
      if (!isVisible(lHip) || !isVisible(lKnee) || !isVisible(lAnkle)) return { phase: prevPhase, counted: false };
      const angle = calculateAngle(lHip, lKnee, lAnkle);
      const phase = angle < 90 ? 'up' : 'down';
      return { phase, counted: prevPhase === 'up' && phase === 'down' };
    },
  },

  // ─── LEG PRESS ───
  leg_press: {
    name: 'Leg Press',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lKnee = kps[KEYPOINTS.LEFT_KNEE];
      const lAnkle = kps[KEYPOINTS.LEFT_ANKLE];
      if (!isVisible(lHip) || !isVisible(lKnee) || !isVisible(lAnkle)) return feedback;
      const kneeAngle = calculateAngle(lHip, lKnee, lAnkle);
      if (kneeAngle >= 80 && kneeAngle <= 100) {
        feedback.push({ type: 'good', message: 'Bonne amplitude!', messageAr: 'عمق مزيان!' });
      }
      if (kneeAngle > 170) {
        feedback.push({ type: 'warning', message: 'Ne verrouille pas!', messageAr: 'ما تقفلش الركبة!' });
      }
      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lHip = kps[KEYPOINTS.LEFT_HIP];
      const lKnee = kps[KEYPOINTS.LEFT_KNEE];
      const lAnkle = kps[KEYPOINTS.LEFT_ANKLE];
      if (!isVisible(lHip) || !isVisible(lKnee) || !isVisible(lAnkle)) return { phase: prevPhase, counted: false };
      const angle = calculateAngle(lHip, lKnee, lAnkle);
      const phase = angle < 120 ? 'down' : 'up';
      return { phase, counted: prevPhase === 'down' && phase === 'up' };
    },
  },

  // ─── FACE PULL ───
  face_pull: {
    name: 'Face Pull',
    checkPoints: (kps) => {
      const feedback: FeedbackItem[] = [];
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      const nose = kps[KEYPOINTS.NOSE];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) return feedback;
      // Check if hands are at face level
      if (isVisible(nose) && Math.abs(lWrist.y - nose.y) < 40) {
        feedback.push({ type: 'good', message: 'Mains au niveau du visage!', messageAr: 'اليدين فمستوى الوجه!' });
      }
      const elbowAngle = calculateAngle(lShoulder, lElbow, lWrist);
      if (elbowAngle < 100) {
        feedback.push({ type: 'good', message: 'Bonne contraction!', messageAr: 'انقباض مزيان!' });
      }
      return feedback;
    },
    detectRep: (kps, prevPhase) => {
      const lShoulder = kps[KEYPOINTS.LEFT_SHOULDER];
      const lElbow = kps[KEYPOINTS.LEFT_ELBOW];
      const lWrist = kps[KEYPOINTS.LEFT_WRIST];
      if (!isVisible(lShoulder) || !isVisible(lElbow) || !isVisible(lWrist)) return { phase: prevPhase, counted: false };
      const angle = calculateAngle(lShoulder, lElbow, lWrist);
      const phase = angle < 110 ? 'up' : 'down';
      return { phase, counted: prevPhase === 'up' && phase === 'down' };
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
