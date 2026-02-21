/**
 * GLB Optimization Script
 * -----------------------
 * Uses @gltf-transform to compress and optimize .glb files.
 *
 * Optimizations applied:
 *  1. Dedup        — remove duplicate meshes, accessors, textures, materials
 *  2. Flatten      — flatten node hierarchy where possible
 *  3. Prune        — remove unused nodes, materials, textures
 *  4. Draco        — mesh geometry compression
 *  5. Texture resize — downscale textures above a max resolution
 *  6. Texture WebP — re-encode textures to WebP
 *  7. Quantize     — reduce precision of vertex attributes
 *
 * Usage:
 *   node scripts/optimize-glb.mjs <input.glb> [output.glb] [--max-texture=1024]
 *
 * Examples:
 *   node scripts/optimize-glb.mjs public/museum.glb
 *   node scripts/optimize-glb.mjs public/museum.glb public/museum-optimized.glb
 *   node scripts/optimize-glb.mjs public/museum.glb --max-texture=512
 */

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  flatten,
  prune,
  quantize,
  textureCompress,
  draco,
} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  console.log(`
Usage: node scripts/optimize-glb.mjs <input.glb> [output.glb] [--max-texture=1024]

Options:
  --max-texture=N   Max texture dimension in px (default: 1024)
  --help            Show this help
`);
  process.exit(0);
}

const inputPath = args.find((a) => !a.startsWith('--'));
const outputArg = args.filter((a) => !a.startsWith('--'))[1];
const maxTexFlag = args.find((a) => a.startsWith('--max-texture='));
const MAX_TEXTURE_SIZE = maxTexFlag ? parseInt(maxTexFlag.split('=')[1], 10) : 1024;

if (!inputPath || !fs.existsSync(inputPath)) {
  console.error(`Error: file not found — ${inputPath}`);
  process.exit(1);
}

const outputPath =
  outputArg ||
  path.join(
    path.dirname(inputPath),
    path.basename(inputPath, path.extname(inputPath)) + '-optimized.glb'
  );

// ---------------------------------------------------------------------------
// Optimize
// ---------------------------------------------------------------------------
async function optimize() {
  const inputSize = fs.statSync(inputPath).size;
  console.log(`\n📂 Input:  ${inputPath}  (${(inputSize / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`🎯 Output: ${outputPath}`);
  console.log(`📐 Max texture size: ${MAX_TEXTURE_SIZE}px\n`);

  // IO setup with Draco support
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
    });

  console.log('⏳ Reading GLB...');
  const document = await io.read(inputPath);

  // Log stats before
  const root = document.getRoot();
  const meshCount = root.listMeshes().length;
  const texCount = root.listTextures().length;
  const matCount = root.listMaterials().length;
  const nodeCount = root.listNodes().length;
  console.log(`   Meshes: ${meshCount} | Textures: ${texCount} | Materials: ${matCount} | Nodes: ${nodeCount}\n`);

  // 1. Dedup
  console.log('🔄 Dedup...');
  await document.transform(dedup());

  // 2. Flatten hierarchy
  console.log('📦 Flatten...');
  await document.transform(flatten());

  // 3. Prune unused
  console.log('✂️  Prune...');
  await document.transform(prune());

  // 4. Compress textures → WebP + resize
  console.log(`�️  Compress textures → WebP (max ${MAX_TEXTURE_SIZE}px)...`);
  await document.transform(
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      resize: [MAX_TEXTURE_SIZE, MAX_TEXTURE_SIZE],
    })
  );

  // 5. Quantize vertex attributes
  console.log('📉 Quantize...');
  await document.transform(quantize());

  // 6. Draco mesh compression
  console.log('🔧 Draco compression...');
  await document.transform(draco());

  // Write output
  console.log('\n💾 Writing optimized GLB...');
  await io.write(outputPath, document);

  const outputSize = fs.statSync(outputPath).size;
  const ratio = ((1 - outputSize / inputSize) * 100).toFixed(1);

  console.log(`\n✅ Done!`);
  console.log(`   Input:    ${(inputSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   Output:   ${(outputSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   Saved:    ${ratio}%\n`);
}

optimize().catch((err) => {
  console.error('❌ Optimization failed:', err);
  process.exit(1);
});
