// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ─── Sprint 1.4 ─── Stub MediaPipe imports
// @tensorflow-models/pose-detection's ESM entry imports @mediapipe/pose,
// @mediapipe/hands, @mediapipe/face_mesh, etc. for BlazePose/HandTracking
// backends — we use ONLY MoveNet in React Native, so we alias these to
// an empty module to avoid Metro resolution errors.
const STUB = path.resolve(__dirname, 'empty-module.js');

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  // MediaPipe stubs (BlazePose / hands / face — pas utilisés, MoveNet only)
  '@mediapipe/pose': STUB,
  '@mediapipe/hands': STUB,
  '@mediapipe/face_mesh': STUB,
  '@mediapipe/face_detection': STUB,
  '@mediapipe/holistic': STUB,
  '@mediapipe/selfie_segmentation': STUB,
  '@mediapipe/objectron': STUB,
  // TF.js WebGPU backend stub (web-only, pas dispo en React Native)
  '@tensorflow/tfjs-backend-webgpu': STUB,
};

// Force Metro à privilégier le sourceField 'main' (CommonJS) sur 'module' (ESM bundle)
// pour @tensorflow-models/pose-detection: le bundle ESM tire toutes les deps optionnelles
// même si on n'utilise que MoveNet.
config.resolver.resolverMainFields = ['react-native', 'main', 'browser'];

module.exports = config;
