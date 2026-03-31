import api from './api';
import { ENDPOINTS, API_CONFIG } from '@/constants/api';
import {
  Exercise,
  ExerciseDetail,
  ExerciseListResponse,
  ExerciseFilterRequest,
  MuscleGroup,
} from '@/types/exercise.types';

// Prefix relative video URLs with backend base URL
function fixVideoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${API_CONFIG.BASE_URL}${url}`;
  return url;
}

// Helper to normalize backend ExerciseDto -> Exercise
function normalizeExercise(dto: any): Exercise {
  return {
    ...dto,
    name: dto.nameFr || dto.name || dto.nameEn || 'Exercice',
    videoDemoUrl: fixVideoUrl(dto.videoDemoUrl),
    thumbnailUrl: fixVideoUrl(dto.thumbnailUrl) || dto.thumbnailUrl,
  };
}

function normalizeExerciseDetail(dto: any): ExerciseDetail {
  // Fix video URLs in the videos object
  if (dto.videos) {
    dto.videos = {
      ...dto.videos,
      demoUrl: fixVideoUrl(dto.videos.demoUrl),
      formUrl: fixVideoUrl(dto.videos.formUrl),
      mistakesUrl: fixVideoUrl(dto.videos.mistakesUrl),
      tipsUrl: fixVideoUrl(dto.videos.tipsUrl),
      thumbnailUrl: fixVideoUrl(dto.videos.thumbnailUrl) || dto.videos.thumbnailUrl,
    };
  }
  return {
    ...dto,
    name: dto.nameFr || dto.name || dto.nameEn || 'Exercice',
    videoDemoUrl: fixVideoUrl(dto.videoDemoUrl),
    thumbnailUrl: fixVideoUrl(dto.thumbnailUrl) || dto.thumbnailUrl,
    requiredEquipmentList: dto.requiredEquipment instanceof Array
      ? dto.requiredEquipment
      : typeof dto.requiredEquipment === 'string'
        ? [dto.requiredEquipment].filter(Boolean)
        : [],
  };
}

export const ExerciseService = {
  async getExercises(filters?: ExerciseFilterRequest): Promise<ExerciseListResponse> {
    const response = await api.get<ExerciseListResponse>(ENDPOINTS.EXERCISES.LIST, {
      params: filters,
    });
    const data = response.data;
    return {
      ...data,
      items: (data.items || []).map(normalizeExercise),
    };
  },

  async getExercise(id: string): Promise<ExerciseDetail> {
    const response = await api.get<any>(ENDPOINTS.EXERCISES.DETAIL(id));
    return normalizeExerciseDetail(response.data);
  },

  async searchExercises(query: string): Promise<ExerciseListResponse> {
    const response = await api.get<any>(ENDPOINTS.EXERCISES.SEARCH, {
      params: { q: query },
    });
    // Backend returns List<ExerciseDto> directly, not paginated
    const data = response.data;
    if (Array.isArray(data)) {
      return {
        items: data.map(normalizeExercise),
        totalCount: data.length,
        page: 1,
        pageSize: data.length,
      };
    }
    // In case backend wraps it
    return {
      ...data,
      items: (data.items || []).map(normalizeExercise),
    };
  },

  async getByMuscleGroup(group: MuscleGroup): Promise<ExerciseListResponse> {
    const response = await api.get<any>(ENDPOINTS.EXERCISES.BY_MUSCLE(group));
    // Backend returns List<ExerciseDto> directly
    const data = response.data;
    if (Array.isArray(data)) {
      return {
        items: data.map(normalizeExercise),
        totalCount: data.length,
        page: 1,
        pageSize: data.length,
      };
    }
    return {
      ...data,
      items: (data.items || []).map(normalizeExercise),
    };
  },

  async getAlternatives(id: string): Promise<Exercise[]> {
    const response = await api.get<any[]>(ENDPOINTS.EXERCISES.ALTERNATIVES(id));
    return (response.data || []).map(normalizeExercise);
  },
};

export default ExerciseService;
