import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import * as THREE from '../../libs/three/three.module.js';

/**
 * High-profile post-processing: bloom + ACES (IMP0001 Phase 4).
 */
export class HighQualityPostProcessing {
    /**
     * @param {THREE.WebGLRenderer} renderer
     * @param {THREE.Scene} scene
     * @param {THREE.Camera} camera
     * @param {{ strength?: number, radius?: number, threshold?: number }} [opts]
     */
    constructor(renderer, scene, camera, opts = {}) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.enabled = true;

        const size = new THREE.Vector2();
        renderer.getSize(size);

        this.composer = new EffectComposer(renderer);
        this.composer.setSize(size.x, size.y);
        this.composer.setPixelRatio(renderer.getPixelRatio());

        this.renderPass = new RenderPass(scene, camera);
        this.composer.addPass(this.renderPass);

        this.bloomPass = new UnrealBloomPass(
            size,
            opts.strength ?? 0.32,
            opts.radius ?? 0.38,
            opts.threshold ?? 0.88
        );
        this.composer.addPass(this.bloomPass);
    }

    setSize(width, height) {
        this.composer.setSize(width, height);
        this.bloomPass.resolution.set(width, height);
    }

    setPixelRatio(ratio) {
        this.composer.setPixelRatio(ratio);
    }

    render() {
        if (!this.enabled) return false;
        this.composer.render();
        return true;
    }

    dispose() {
        this.composer?.dispose?.();
        this.bloomPass?.dispose?.();
    }
}
