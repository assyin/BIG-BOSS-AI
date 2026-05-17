/**
 * Sprint 3.4 — Calculs IMC + FFMI + interpretations.
 *
 * Tous les calculs sont synchrones et 100% locaux (pas d'API).
 */

export interface ImcResult {
  value: number;
  category: 'underweight' | 'normal' | 'overweight' | 'obese';
  label: string;
  labelAr: string;
  color: string;
}

export interface FfmiResult {
  value: number;
  normalized: number; // FFMI normalisé pour taille (rare en pratique)
  category: 'low' | 'average' | 'good' | 'advanced' | 'high' | 'elite';
  label: string;
  labelAr: string;
  color: string;
}

const IMC_COLORS = {
  underweight: '#4A7BA8', // bleu froid
  normal: '#4A7C59', // vert atlas
  overweight: '#D4A24C', // gold safran
  obese: '#B5283A', // rouge
};

const FFMI_COLORS = {
  low: '#8B7B6E', // gris terre
  average: '#4A7C59', // vert atlas
  good: '#4A7C59',
  advanced: '#D4A24C', // gold
  high: '#C84B31', // terre marrakech
  elite: '#B5283A', // rouge profond (suspect natural)
};

/**
 * IMC = poids (kg) / taille² (m).
 * Catégories OMS:
 *   < 18.5 → underweight
 *   18.5–24.9 → normal
 *   25–29.9 → overweight
 *   ≥ 30 → obese
 */
export function calcIMC(weightKg: number, heightCm: number): ImcResult | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const imc = weightKg / (heightM * heightM);
  const rounded = Math.round(imc * 10) / 10;

  if (imc < 18.5) {
    return { value: rounded, category: 'underweight', label: 'Sous-poids', labelAr: 'وزن ناقص', color: IMC_COLORS.underweight };
  } else if (imc < 25) {
    return { value: rounded, category: 'normal', label: 'Normal', labelAr: 'وزن طبيعي', color: IMC_COLORS.normal };
  } else if (imc < 30) {
    return { value: rounded, category: 'overweight', label: 'Surpoids', labelAr: 'وزن زايد', color: IMC_COLORS.overweight };
  } else {
    return { value: rounded, category: 'obese', label: 'Obésité', labelAr: 'سمنة', color: IMC_COLORS.obese };
  }
}

/**
 * FFMI = (masse maigre / taille²) avec masse maigre = poids × (1 − bodyFat%).
 * Normalisation pour taille (FFMI adjusté) : FFMI + 6.1 × (1.8 − tailleM)
 *
 * Catégories (homme natural):
 *   < 17 → low
 *   17-19 → average
 *   19-21 → good (athlète régulier)
 *   21-23 → advanced (bodybuilder amateur)
 *   23-25 → high (pro natural max)
 *   > 25 → elite (suspect non-natural)
 *
 * Note: pour les femmes, soustraire ~3 pour interpretation équivalente.
 */
export function calcFFMI(weightKg: number, heightCm: number, bodyFatPercent: number): FfmiResult | null {
  if (!weightKg || !heightCm || bodyFatPercent === null || bodyFatPercent === undefined) return null;
  if (weightKg <= 0 || heightCm <= 0 || bodyFatPercent < 1 || bodyFatPercent > 60) return null;

  const heightM = heightCm / 100;
  const leanMass = weightKg * (1 - bodyFatPercent / 100);
  const ffmi = leanMass / (heightM * heightM);
  const ffmiNormalized = ffmi + 6.1 * (1.8 - heightM);

  const rounded = Math.round(ffmi * 10) / 10;
  const roundedNorm = Math.round(ffmiNormalized * 10) / 10;

  if (ffmi < 17) {
    return { value: rounded, normalized: roundedNorm, category: 'low', label: 'Faible masse maigre', labelAr: 'كتلة عضلية ضعيفة', color: FFMI_COLORS.low };
  } else if (ffmi < 19) {
    return { value: rounded, normalized: roundedNorm, category: 'average', label: 'Moyenne', labelAr: 'متوسطة', color: FFMI_COLORS.average };
  } else if (ffmi < 21) {
    return { value: rounded, normalized: roundedNorm, category: 'good', label: 'Bonne', labelAr: 'مزيانة', color: FFMI_COLORS.good };
  } else if (ffmi < 23) {
    return { value: rounded, normalized: roundedNorm, category: 'advanced', label: 'Avancée', labelAr: 'متقدمة', color: FFMI_COLORS.advanced };
  } else if (ffmi < 25) {
    return { value: rounded, normalized: roundedNorm, category: 'high', label: 'Élite (natural max)', labelAr: 'ممتازة', color: FFMI_COLORS.high };
  } else {
    return { value: rounded, normalized: roundedNorm, category: 'elite', label: '> Max naturel', labelAr: 'فوق الطبيعي', color: FFMI_COLORS.elite };
  }
}

/**
 * Poids cible pour un IMC donné (utilisé pour suggérer objectif).
 */
export function targetWeightForImc(heightCm: number, targetImc = 22): number | null {
  if (!heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return Math.round(targetImc * heightM * heightM * 10) / 10;
}
