import api from './api';

export interface BodyMeasurements {
  chest?: number;
  waist?: number;
  hips?: number;
  leftArm?: number;
  rightArm?: number;
  leftThigh?: number;
  rightThigh?: number;
  leftCalf?: number;
  rightCalf?: number;
  shoulders?: number;
  neck?: number;
}

export interface BodyStat {
  id: string;
  weightKg: number;
  bodyFatPercent?: number;
  measurements?: BodyMeasurements;
  notes?: string;
  recordedAt: string;
}

export interface AddBodyStatRequest {
  weightKg: number;
  bodyFatPercent?: number;
  measurements?: BodyMeasurements;
  notes?: string;
}

export interface ProgressPhoto {
  id: string;
  photoUrl: string;
  poseType?: string;
  caption?: string;
  recordedAt: string;
}

export interface AddProgressPhotoRequest {
  photoBase64: string;
  caption?: string;
}

// Map from backend flat fields (chestCm, waistCm, etc.) to our nested measurements
function mapBackendBodyStat(raw: any): BodyStat {
  const measurements: BodyMeasurements = {};
  let hasMeasurements = false;

  const fieldMap: Record<string, keyof BodyMeasurements> = {
    chestCm: 'chest',
    waistCm: 'waist',
    hipsCm: 'hips',
    leftArmCm: 'leftArm',
    rightArmCm: 'rightArm',
    leftThighCm: 'leftThigh',
    rightThighCm: 'rightThigh',
    leftCalfCm: 'leftCalf',
    rightCalfCm: 'rightCalf',
    shouldersCm: 'shoulders',
    neckCm: 'neck',
  };

  for (const [backendKey, frontendKey] of Object.entries(fieldMap)) {
    const val = raw[backendKey] ?? raw[backendKey.charAt(0).toUpperCase() + backendKey.slice(1)];
    if (val != null && val > 0) {
      (measurements as any)[frontendKey] = val;
      hasMeasurements = true;
    }
  }

  // Also handle if backend already sends nested measurements
  if (raw.measurements && typeof raw.measurements === 'object') {
    for (const [key, val] of Object.entries(raw.measurements)) {
      if (val != null && (val as number) > 0) {
        (measurements as any)[key] = val;
        hasMeasurements = true;
      }
    }
  }

  return {
    id: (raw.id ?? raw.Id ?? '').toString(),
    weightKg: raw.weightKg ?? raw.WeightKg ?? 0,
    bodyFatPercent: raw.bodyFatPercent ?? raw.BodyFatPercent ?? undefined,
    measurements: hasMeasurements ? measurements : undefined,
    notes: raw.notes ?? raw.Notes ?? undefined,
    recordedAt: raw.recordedAt ?? raw.RecordedAt ?? raw.createdAt ?? raw.CreatedAt ?? new Date().toISOString(),
  };
}

function mapBackendPhoto(raw: any): ProgressPhoto {
  return {
    id: (raw.id ?? raw.Id ?? '').toString(),
    photoUrl: raw.storageUrlEncrypted ?? raw.photoUrl ?? raw.PhotoUrl ?? '',
    poseType: raw.poseType ?? raw.PoseType ?? undefined,
    caption: raw.caption ?? raw.Caption ?? undefined,
    recordedAt: raw.takenAt ?? raw.TakenAt ?? raw.recordedAt ?? raw.RecordedAt ?? new Date().toISOString(),
  };
}

// Map frontend measurements to backend flat fields for POST
function buildBackendPayload(data: AddBodyStatRequest): Record<string, any> {
  const payload: Record<string, any> = {
    weightKg: data.weightKg,
  };

  if (data.bodyFatPercent != null) {
    payload.bodyFatPercent = data.bodyFatPercent;
  }

  if (data.measurements) {
    const reverseMap: Record<string, string> = {
      chest: 'chestCm',
      waist: 'waistCm',
      hips: 'hipsCm',
      leftArm: 'leftArmCm',
      rightArm: 'rightArmCm',
      leftThigh: 'leftThighCm',
      rightThigh: 'rightThighCm',
      leftCalf: 'leftCalfCm',
      rightCalf: 'rightCalfCm',
      shoulders: 'shouldersCm',
      neck: 'neckCm',
    };

    for (const [frontendKey, backendKey] of Object.entries(reverseMap)) {
      const val = (data.measurements as any)[frontendKey];
      if (val != null && val > 0) {
        payload[backendKey] = val;
      }
    }
  }

  if (data.notes) {
    payload.notes = data.notes;
  }

  return payload;
}

export const ProgressService = {
  async getBodyStats(): Promise<BodyStat[]> {
    const response = await api.get('/api/bodystats');
    const rawList = Array.isArray(response.data) ? response.data : (response.data?.items || response.data?.data || []);
    return rawList.map(mapBackendBodyStat);
  },

  async getLatestBodyStat(): Promise<BodyStat> {
    const response = await api.get('/api/bodystats/latest');
    return mapBackendBodyStat(response.data);
  },

  async addBodyStat(data: AddBodyStatRequest): Promise<BodyStat> {
    const payload = buildBackendPayload(data);
    const response = await api.post('/api/bodystats', payload);
    return mapBackendBodyStat(response.data);
  },

  async getProgressPhotos(): Promise<ProgressPhoto[]> {
    const response = await api.get('/api/progressphotos');
    const rawList = Array.isArray(response.data) ? response.data : (response.data?.items || response.data?.data || []);
    return rawList.map(mapBackendPhoto);
  },

  async addProgressPhoto(data: AddProgressPhotoRequest): Promise<ProgressPhoto> {
    const response = await api.post('/api/progressphotos', data);
    return mapBackendPhoto(response.data);
  },
};

export default ProgressService;
