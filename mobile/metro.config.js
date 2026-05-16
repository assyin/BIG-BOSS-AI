// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ─── Sprint 1.4 — Coach Vision ───
//
// Problème: @tensorflow-models/pose-detection charge @mediapipe/* (BlazePose
// backend, web-only) et @tensorflow/tfjs-backend-webgpu (web-only) même si
// on utilise ONLY MoveNet en React Native. Ces deps n'existent pas en RN.
//
// Solution: intercepter chaque résolution via resolveRequest et retourner
// un module vide (empty-module.js) pour ces packages. C'est plus robuste
// que extraNodeModules qui peut être contourné par certains imports.

const STUB = path.resolve(__dirname, 'empty-module.js');

const STUB_PACKAGES = [
  '@mediapipe/pose',
  '@mediapipe/hands',
  '@mediapipe/face_mesh',
  '@mediapipe/face_detection',
  '@mediapipe/holistic',
  '@mediapipe/selfie_segmentation',
  '@mediapipe/objectron',
  '@tensorflow/tfjs-backend-webgpu',
  '@tensorflow/tfjs-backend-wasm',
];

const upstreamResolveRequest = config.resolver.resolveRequest;

// Web-only stubs: tfjs-react-native est uniquement pour iOS/Android, il faut
// le stub côté bundle web sinon ça casse les imports natifs (TextEncoder, etc.).
const WEB_ONLY_STUBS = [
  '@tensorflow/tfjs-react-native',
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (STUB_PACKAGES.some((pkg) => moduleName === pkg || moduleName.startsWith(pkg + '/'))) {
    return { type: 'sourceFile', filePath: STUB };
  }
  if (platform === 'web' && WEB_ONLY_STUBS.some((pkg) => moduleName === pkg || moduleName.startsWith(pkg + '/'))) {
    return { type: 'sourceFile', filePath: STUB };
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Force Metro à privilégier le main field (CommonJS) sur module (ESM bundle)
config.resolver.resolverMainFields = ['react-native', 'main', 'browser'];

module.exports = config;
