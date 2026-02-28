#!/usr/bin/env node
/**
 * Simplify GLB model(s) using gltf-transform (weld + simplify).
 * Reduces triangle/vertex count for better performance when models are
 * small on screen (e.g. on the battlefield).
 *
 * Run from project root:
 *   npm run simplify-monk
 *   npm run simplify-monk -- assets/models
 *   node simplify-monk-glb.js assets/models/monk-v2.glb
 *
 * Args:
 *   path  - File or directory (default: assets/models). Directories are
 *           scanned for *.glb (backups *.origin.glb are skipped).
 *
 * Options (env):
 *   RATIO  - Vertices to keep 0..1 (default: 0.4 = keep 40%, drop 60%)
 *   ERROR  - Max error as fraction of mesh radius (default: 0.002)
 *   BACKUP - Set to "0" to skip writing .origin.glb backups (default: backup)
 */

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer/decoder';
import { MeshoptEncoder } from 'meshoptimizer/encoder';
import { MeshoptSimplifier } from 'meshoptimizer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

const pathArg = process.argv[2] || 'assets/models';
const ratio = Math.max(0.01, Math.min(1, parseFloat(process.env.RATIO || '0.4')));
const error = Math.max(1e-6, parseFloat(process.env.ERROR || '0.002'));
const doBackup = process.env.BACKUP !== '0';

function resolveTarget(root, arg) {
  const resolved = path.isAbsolute(arg) ? arg : path.join(root, arg);
  return resolved;
}

function collectGlbFiles(targetPath) {
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    if (!targetPath.toLowerCase().endsWith('.glb')) {
      console.warn('Not a .glb file:', targetPath);
      return [];
    }
    if (targetPath.includes('.origin.glb')) return [];
    return [targetPath];
  }
  if (stat.isDirectory()) {
    return fs.readdirSync(targetPath)
      .filter((name) => name.toLowerCase().endsWith('.glb') && !name.includes('.origin.glb'))
      .map((name) => path.join(targetPath, name))
      .sort();
  }
  return [];
}

async function processOne(io, inputPath) {
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, '.glb');
  const backupPath = path.join(dir, base + '.origin.glb');

  const document = await io.read(inputPath);

  const meshesBefore = document.getRoot().listMeshes().length;
  let trisBefore = 0;
  document.getRoot().listMeshes().forEach((m) => {
    const prim = m.listPrimitives()[0];
    if (prim && prim.getIndices()) trisBefore += prim.getIndices().getCount() / 3;
  });

  await document.transform(
    dequantize(),
    weld({}),
    simplify({ simplifier: MeshoptSimplifier, ratio, error })
  );

  let trisAfter = 0;
  document.getRoot().listMeshes().forEach((m) => {
    const prim = m.listPrimitives()[0];
    if (prim && prim.getIndices()) trisAfter += prim.getIndices().getCount() / 3;
  });

  if (doBackup) {
    try {
      await fs.promises.copyFile(inputPath, backupPath);
      console.log('  Backup:', backupPath);
    } catch (e) {
      console.warn('  Could not backup:', e.message);
    }
  }

  await io.write(inputPath, document);
  console.log('  Wrote:', inputPath, '| Meshes:', meshesBefore, '->', document.getRoot().listMeshes().length, '| Triangles: ~' + Math.round(trisBefore) + ' -> ~' + Math.round(trisAfter));
}

async function main() {
  const target = resolveTarget(ROOT, pathArg);
  const files = collectGlbFiles(target);

  if (files.length === 0) {
    console.error('No .glb file(s) found at:', target);
    process.exit(1);
  }

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
  console.log('Waiting for WASM (MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier)...');
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
  console.log('Applying weld() then simplify(ratio=%s, error=%s) to %s file(s)', ratio, error, files.length);

  for (const file of files) {
    console.log('\n' + file);
    await processOne(io, file);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
