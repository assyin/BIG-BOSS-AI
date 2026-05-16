#!/usr/bin/env node
/**
 * Sprint 1.4 — Coach Vision dependency stubs.
 *
 * @tensorflow-models/pose-detection imports @mediapipe/* and
 * @tensorflow/tfjs-backend-webgpu which are not relevant for React Native
 * (MoveNet only). This script creates fake empty packages in node_modules
 * to satisfy the static imports.
 *
 * Run automatically via `npm install` (postinstall hook in package.json)
 * or manually: `node scripts/install-pose-stubs.js`
 */
const fs = require('node:fs');
const path = require('node:path');

const STUB_PACKAGES = [
  '@mediapipe/pose',
  '@mediapipe/hands',
  '@mediapipe/face_mesh',
  '@mediapipe/face_detection',
  '@mediapipe/holistic',
  '@mediapipe/selfie_segmentation',
  '@mediapipe/objectron',
  '@tensorflow/tfjs-backend-webgpu',
];

const NODE_MODULES = path.resolve(__dirname, '..', 'node_modules');

if (!fs.existsSync(NODE_MODULES)) {
  console.log('[pose-stubs] node_modules missing, skipping (run after npm install)');
  process.exit(0);
}

let created = 0;
let existed = 0;

for (const pkg of STUB_PACKAGES) {
  const pkgDir = path.join(NODE_MODULES, pkg);
  const indexPath = path.join(pkgDir, 'index.js');
  const packageJsonPath = path.join(pkgDir, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    // If a real package exists (non-stub), don't overwrite it.
    try {
      const existing = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (existing._bbf_stub !== true) {
        existed++;
        continue;
      }
    } catch {
      // continue and recreate
    }
  }

  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(
      {
        name: pkg,
        version: '0.0.0-stub',
        main: 'index.js',
        _bbf_stub: true,
        _bbf_note: 'Empty stub created by mobile/scripts/install-pose-stubs.js. See Sprint 1.4.',
      },
      null,
      2,
    ) + '\n',
  );
  fs.writeFileSync(indexPath, 'module.exports = {};\n');
  created++;
}

console.log(`[pose-stubs] OK: ${created} stubs created, ${existed} skipped (real packages).`);
