/**
 * Convert GLB (Blender/Sketchfab export) into a web-ready glTF.
 *
 * Target: Three.js r186 as the *only* runtime consumer.
 *
 * Why this script exists
 * ----------------------
 * r186 dropped the KHR_materials_pbrSpecularGlossiness loader plugin. Every
 * incoming model here uses the spec/gloss workflow, so the raw files would be
 * rejected outright (non-fatal, but materials silently fall back to white).
 * We convert to the metal/rough workflow ourselves, tuned for this scene:
 * dark near-black background, so dielectric diffuse reads correctly without
 * needing the IOR=1000 mirror that gltf-transform's stock metalRough() emits.
 *
 * Output contract (kept tight on purpose):
 *   extensionsUsed     = EXT_texture_webp, KHR_mesh_quantization
 *   extensionsRequired = (none)            ← every ext is optional at runtime
 *
 * So the browser never needs Draco or meshopt decoders.
 *
 * Jalankan:  node scripts/build-astronaut-glb.mjs
 */

import { NodeIO } from '@gltf-transform/core';
import { dedup, prune, textureCompress, weld, quantize } from '@gltf-transform/functions';
import {
  EXTTextureWebP,
  KHRMaterialsPBRSpecularGlossiness,
  KHRMaterialsSpecular,
  KHRMeshQuantization,
} from '@gltf-transform/extensions';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const targets = [
  { src: 'assets/3D/melayang.glb', out: 'assets/3D/astronaut-hero.glb' },
  { src: 'assets/3D/lambai.glb',   out: 'assets/3D/astronaut-wave.glb' },
];

const BYTE = 1024 * 1024;
const mb = (bytes) => (bytes / BYTE).toFixed(2) + ' MB';

const io = new NodeIO().registerExtensions([
  EXTTextureWebP,
  KHRMaterialsPBRSpecularGlossiness,
  KHRMaterialsSpecular,
  KHRMeshQuantization,
]);

/**
 * Spec/gloss → metal/rough, tuned for this portfolio's dark scene.
 *
 * The visor is genuinely mirror-like in the source (white diffuse + full
 * gloss), so we keep a real specular response rather than flattening it to
 * pure diffuse. Dielectric plastic stays matte. metallic = 0 everywhere:
 * nothing in the model is a metal, and guessing otherwise just turns parts
 * black.
 *
 * Runs as a Transform so it composes inside doc.transform().
 */
function toMetalRough() {
  return async (doc) => {
    const logger = doc.getLogger();
    const specGlossExt = doc.createExtension(KHRMaterialsPBRSpecularGlossiness);
    const specExt = doc.createExtension(KHRMaterialsSpecular);

    for (const mat of doc.getRoot().listMaterials()) {
      const sg = mat.getExtension('KHR_materials_pbrSpecularGlossiness');
      if (!sg) continue;

      mat
        .setBaseColorFactor(sg.getDiffuseFactor())
        .setMetallicFactor(0)
        // Floor at 0.06: a true 0 roughness produces firefly highlights under
        // punctual lights. The visor still reads mirror-smooth.
        .setRoughnessFactor(Math.max(0.06, 1 - sg.getGlossinessFactor()));

      const diffuse = sg.getDiffuseTexture();
      if (diffuse) {
        mat.setBaseColorTexture(diffuse);
        mat.getBaseColorTextureInfo().copy(sg.getDiffuseTextureInfo());
      }

      // Preserve the dielectric highlight, scaled down for a dark scene.
      const s = sg.getSpecularFactor();
      const peak = Math.max(s[0], s[1], s[2]);
      if (peak > 0) {
        const tint = [s[0] / peak, s[1] / peak, s[2] / peak];
        const specular = specExt
          .createSpecular()
          .setSpecularFactor(Math.min(0.45, peak * 0.45))
          .setSpecularColorFactor(tint);
        mat.setExtension('KHR_materials_specular', specular);
      }

      mat.setExtension('KHR_materials_pbrSpecularGlossiness', null);
    }

    specGlossExt.dispose();
    logger.debug('toMetalRough: complete.');
  };
}

for (const { src, out } of targets) {
  const srcPath = path.join(root, src);
  const outPath = path.join(root, out);
  const before = (await fs.stat(srcPath)).size;

  const doc = await io.read(srcPath);
  doc.getLogger().verbosity = 2;

  // KHR_mesh_quantization must be declared *before* quantize() runs, or the
  // accessor quantization lands in the file without its extension entry and
  // glTF consumers reject the document.
  doc.createExtension(KHRMeshQuantization).setRequired(true);
  doc.createExtension(EXTTextureWebP).setRequired(true);

  await doc.transform(
    dedup(),
    prune(),
    weld({ tolerance: 0.0001 }),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      quality: 80,
      resize: { width: 1024, height: 1024, fit: 'inside' },
    }),
    toMetalRough(),
    quantize(),
  );

  await io.write(outPath, doc);

  const after = (await fs.stat(outPath)).size;
  console.log(`${src}: ${mb(before)} -> ${mb(after)}`);
}
