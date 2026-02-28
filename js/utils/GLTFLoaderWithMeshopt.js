/**
 * Provides a GLTFLoader configured with MeshoptDecoder so that meshopt-compressed
 * GLB files (e.g. EXT_meshopt_compression) load correctly in the browser.
 * Use this for loading any GLB that may be compressed (e.g. assets/models/*.glb).
 */

import { GLTFLoader } from '../../libs/three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../../libs/three/examples/jsm/libs/meshopt_decoder.module.js';

let sharedLoader = null;

/**
 * Returns a GLTFLoader with MeshoptDecoder set (for loading compressed GLBs).
 * @returns {GLTFLoader}
 */
export function getGLTFLoader() {
  if (!sharedLoader) {
    sharedLoader = new GLTFLoader();
    sharedLoader.setMeshoptDecoder(MeshoptDecoder);
  }
  return sharedLoader;
}
