/**
 * Pose Detector — TF.js MoveNet wrapper for Coach Vision.
 *
 * Sprint 1.4 Jour 1: POC single-frame inference.
 *   1. initTfjs() — wait for TF runtime ready + set backend
 *   2. loadMoveNet() — create singleton detector
 *   3. inferFromBase64() — JPEG b64 → tensor → 17 keypoints
 */
import * as tf from '@tensorflow/tfjs';
import * as posedetection from '@tensorflow-models/pose-detection';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import type { Keypoint } from './pose-engine';

let _initialized = false;
let _detector: posedetection.PoseDetector | null = null;
let _loadPromise: Promise<posedetection.PoseDetector> | null = null;

/**
 * Initialize TF.js runtime. Idempotent.
 * Call once at app/screen mount before anything else.
 */
export async function initTfjs(): Promise<void> {
  if (_initialized) return;
  await tf.ready();
  // RN backend is auto-selected; log for debugging
  console.log('[pose-detector] tf.ready, backend =', tf.getBackend());
  _initialized = true;
}

/**
 * Load (or return cached) MoveNet detector.
 *
 * Models:
 *   - SINGLEPOSE_LIGHTNING: fast (~50 fps mid-range), ok accuracy (~70%)
 *   - SINGLEPOSE_THUNDER: slower (~25 fps), better accuracy (~75%)
 *
 * Lightning chosen by default for real-time use case.
 */
export async function loadMoveNet(
  modelType: 'lightning' | 'thunder' = 'lightning',
): Promise<posedetection.PoseDetector> {
  if (_detector) return _detector;
  if (_loadPromise) return _loadPromise;

  await initTfjs();

  _loadPromise = posedetection
    .createDetector(posedetection.SupportedModels.MoveNet, {
      modelType:
        modelType === 'thunder'
          ? posedetection.movenet.modelType.SINGLEPOSE_THUNDER
          : posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      enableSmoothing: true,
    })
    .then((d) => {
      _detector = d;
      console.log('[pose-detector] MoveNet', modelType, 'loaded');
      return d;
    });

  return _loadPromise;
}

/**
 * Infer pose from a JPEG base64 string (typically from CameraView.takePictureAsync).
 *
 * @param base64 - JPEG image as base64 string (no data: prefix)
 * @returns Array of 17 keypoints (MoveNet order, see pose-engine.KEYPOINTS).
 *          Each keypoint has x/y in image pixel coords + confidence score.
 */
export async function inferFromBase64(base64: string): Promise<Keypoint[] | null> {
  const detector = await loadMoveNet();

  // Decode JPEG → 3D uint8 tensor [height, width, 3]
  const raw = base64ToUint8Array(base64);
  const imageTensor = decodeJpeg(raw);

  try {
    const poses = await detector.estimatePoses(imageTensor as unknown as tf.Tensor3D, {
      maxPoses: 1,
      flipHorizontal: false,
    });
    if (poses.length === 0) return null;
    // MoveNet keypoints are already in MoveNet order, compatible with pose-engine KEYPOINTS.
    return poses[0].keypoints.map((kp) => ({
      x: kp.x,
      y: kp.y,
      score: kp.score ?? 0,
      name: kp.name,
    }));
  } finally {
    imageTensor.dispose(); // important: avoid GPU memory leak
  }
}

/**
 * Helper: decode base64 string → Uint8Array (binary).
 * Manual implementation to avoid pulling buffer polyfill.
 */
function base64ToUint8Array(b64: string): Uint8Array {
  // Strip data URI prefix if present
  const clean = b64.includes(',') ? b64.split(',')[1] : b64;
  const binStr = globalThis.atob ? globalThis.atob(clean) : decodeBase64Fallback(clean);
  const arr = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    arr[i] = binStr.charCodeAt(i);
  }
  return arr;
}

// Tiny fallback if atob is unavailable in the JS runtime
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decodeBase64Fallback(input: string): string {
  let output = '';
  let buf = 0;
  let bits = 0;
  for (const c of input) {
    if (c === '=') break;
    const v = B64_CHARS.indexOf(c);
    if (v < 0) continue;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buf >> bits) & 0xff);
    }
  }
  return output;
}
