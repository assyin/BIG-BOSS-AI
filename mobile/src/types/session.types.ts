import { MuscleGroup, Equipment } from './exercise.types';

export type SessionStatus = 'Generated' | 'InProgress' | 'Completed' | 'Abandoned';

export interface Session {
  id: string;
  title: string;
  description: string | null;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups: MuscleGroup[];
  plannedDurationMinutes: number;
  status: SessionStatus;
  generatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  exercises: SessionExercise[];
  stats: SessionStats | null;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  thumbnailUrl: string | null;
  orderIndex: number;
  setsPlanned: number;
  repsPlanned: number;
  weightPlannedKg: number | null;
  restSecondsPlanned: number;
  isCompleted: boolean;
  completedSets: CompletedSet[] | null;
}

export interface CompletedSet {
  setNumber: number;
  reps: number;
  weightKg: number;
  formScore: number | null;
}

export interface SessionStats {
  totalVolumeKg: number;
  totalSets: number;
  totalReps: number;
  averageFormScore: number | null;
  actualDurationMinutes: number;
}

export interface GenerateSessionRequest {
  preferredMuscleGroup?: MuscleGroup;
  durationMinutes?: number;
  energyLevel?: number;
  sleepHours?: number;
  excludeExerciseIds?: string[];
  availableEquipment?: Equipment;
}

export interface LogSetRequest {
  sessionExerciseId: string;
  reps: number;
  weightKg: number;
  formScore?: number;
  restSeconds?: number;
  notes?: string;
  // Sprint 3.2 — idempotence offline replay
  clientUuid?: string;
}

export interface SkipExerciseRequest {
  sessionExerciseId: string;
  reason?: string;
}

export interface SessionSummary {
  sessionId: string;
  title: string;
  stats: SummaryStats;
  newPersonalRecords: PersonalRecord[];
  comparisonWithLastSession: SessionComparison | null;
  aiRecommendations: string[];
  aiMotivationalMessage: string;
  postWorkoutNutrition: NutritionRecommendation | null;
  nextRecommendedWorkoutDate: string | null;
}

export interface SummaryStats {
  plannedDurationMinutes: number;
  actualDurationMinutes: number;
  totalVolumeKg: number;
  totalSets: number;
  totalReps: number;
  averageIntensityPercent: number;
  averageFormScore: number | null;
  exercisesCompleted: number;
  exercisesSkipped: number;
}

export interface PersonalRecord {
  exerciseName: string;
  recordType: string;
  previousValue: number;
  newValue: number;
  unit: string;
}

export interface SessionComparison {
  volumeChangePercent: number;
  intensityChangePercent: number;
  durationChangeMinutes: number;
}

export interface NutritionRecommendation {
  recommendedCalories: number;
  recommendedProteinG: number;
  suggestedFoods: string[];
}
