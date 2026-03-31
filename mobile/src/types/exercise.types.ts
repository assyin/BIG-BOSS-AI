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
  nameFr: string;
  nameEn: string | null;
  nameAr: string | null;
  nameDarija: string | null;
  primaryMuscle: MuscleGroup;
  category: MuscleGroup;
  difficulty: DifficultyLevel;
  requiredEquipment: string;
  thumbnailUrl: string | null;
  gifPreviewUrl: string | null;
  videoDemoUrl: string | null;
  isActive: boolean;
  hasVideo: boolean;
}

export interface ExerciseDetail extends Exercise {
  descriptionFr: string | null;
  secondaryMuscles: MuscleGroup[];
  requiredEquipmentList: Equipment[];
  videos: ExerciseVideos;
  instructionsFr: string[];
  instructionsEn: string[];
  tipsCoachFr: string[];
  tipsEn: string[];
  erreursCourantesFr: string[];
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
  items: Exercise[];
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
