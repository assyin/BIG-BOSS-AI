export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Quadriceps'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Abs'
  | 'Cardio'
  | 'Mobility'
  | 'Bodyweight';

export type Equipment =
  | 'Barbell'
  | 'Dumbbell'
  | 'Cable'
  | 'Machine'
  | 'Bodyweight'
  | 'TRX'
  | 'ResistanceBand'
  | 'Kettlebell'
  | 'PullUpBar'
  | 'Bench'
  | 'SquatRack';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface Exercise {
  id: string;
  name: string;
  nameAr: string | null;
  primaryMuscle: MuscleGroup;
  category: MuscleGroup;
  difficulty: DifficultyLevel;
  thumbnailUrl: string;
  gifPreviewUrl: string | null;
}

export interface ExerciseDetail extends Exercise {
  nameFr: string;
  nameDarija: string | null;
  nameEn: string | null;
  secondaryMuscles: MuscleGroup[];
  requiredEquipment: Equipment[];
  videos: ExerciseVideos;
  coachingCues: string[];
  commonMistakes: string[];
  alternativeExerciseIds: string[];
  repRanges: RepRanges;
  recommendedTempo: string | null;
  complexityScore: number;
  contraindications: string[];
}

export interface ExerciseVideos {
  demoUrl: string | null;
  formUrl: string | null;
  mistakesUrl: string | null;
  tipsUrl: string | null;
  thumbnailUrl: string | null;
  gifPreviewUrl: string | null;
}

export interface RepRanges {
  hypertrophy: RepRange;
  strength: RepRange;
  endurance: RepRange;
}

export interface RepRange {
  min: number;
  max: number;
}

export interface ExerciseListResponse {
  exercises: Exercise[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ExerciseFilterRequest {
  muscleGroup?: MuscleGroup;
  difficulty?: DifficultyLevel;
  equipment?: Equipment;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}
