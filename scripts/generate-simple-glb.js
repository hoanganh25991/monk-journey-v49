/**
 * Generate simple GLB files for the game
 * This script creates basic geometric shapes as GLB files for each required item
 */

const fs = require('fs');
const path = require('path');
const THREE = require('three');
const { GLTFExporter } = require('three/examples/jsm/exporters/GLTFExporter.js');

// Base directory for models
const BASE_DIR = path.join(__dirname, '../assets/models/items');

// Create directories if they don't exist
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }
}

// Save buffer as GLB file
function saveArrayBuffer(buffer, filePath) {
    ensureDirectoryExists(path.dirname(filePath));
    
    fs.writeFileSync(filePath, Buffer.from(buffer));
    console.log(`Generated: ${filePath}`);
}

// Generate a simple GLB model
function generateSimpleModel(type, color = 0x6699ff) {
    let geometry;
    let scale = new THREE.Vector3(1, 1, 1);
    
    // Create different geometries based on item type
    switch (type) {
        case 'gloves':
            geometry = new THREE.BoxGeometry(0.2, 0.2, 0.4);
            scale = new THREE.Vector3(1, 0.5, 0.3);
            break;
        case 'belt':
            geometry = new THREE.TorusGeometry(0.3, 0.05, 8, 24);
            scale = new THREE.Vector3(1, 1, 0.2);
            break;
        case 'boots':
            geometry = new THREE.ConeGeometry(0.2, 0.5, 8);
            geometry.rotateX(Math.PI / 2);
            scale = new THREE.Vector3(1, 0.6, 1.5);
            break;
        case 'amulet':
            geometry = new THREE.TorusKnotGeometry(0.2, 0.05, 64, 8);
            scale = new THREE.Vector3(0.5, 0.5, 0.5);
            break;
        case 'talisman':
            geometry = new THREE.OctahedronGeometry(0.2);
            scale = new THREE.Vector3(0.7, 1, 0.2);
            break;
        case 'scroll':
            geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 16);
            geometry.rotateZ(Math.PI / 2);
            scale = new THREE.Vector3(1, 1, 1);
            break;
        case 'food':
            geometry = new THREE.SphereGeometry(0.2, 16, 16);
            scale = new THREE.Vector3(1, 0.8, 1);
            break;
        default:
            // Default cube for anything else
            geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            break;
    }
    
    const material = new THREE.MeshStandardMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.copy(scale);
    
    // Create a scene and add the mesh
    const scene = new THREE.Scene();
    scene.add(mesh);
    
    // Add a light
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    scene.add(light);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    return scene;
}

// Export scene to GLB
function exportGLB(scene, filePath) {
    const exporter = new GLTFExporter();
    
    exporter.parse(scene, function(buffer) {
        saveArrayBuffer(buffer, filePath);
    }, { binary: true });
}

// Models to generate
const models = [
    // Armor
    {
        type: 'gloves',
        path: 'armor/gloves/basic_gloves.glb',
        color: 0xA0522D
    },
    {
        type: 'belt',
        path: 'armor/belt/basic_belt.glb',
        color: 0x8B4513
    },
    {
        type: 'boots',
        path: 'armor/boots/basic_boots.glb',
        color: 0x8B4513
    },
    
    // Accessory
    {
        type: 'amulet',
        path: 'accessory/basic_amulet.glb',
        color: 0xFFD700
    },
    {
        type: 'talisman',
        path: 'accessory/basic_talisman.glb',
        color: 0x9370DB
    },
    
    // Consumable
    {
        type: 'scroll',
        path: 'consumable/basic_scroll.glb',
        color: 0xF5F5DC
    },
    {
        type: 'food',
        path: 'consumable/basic_food.glb',
        color: 0xFF6347
    }
];

// Generate all models
function generateAllModels() {
    console.log('Starting model generation...');
    
    for (const model of models) {
        const scene = generateSimpleModel(model.type, model.color);
        const filePath = path.join(BASE_DIR, model.path);
        exportGLB(scene, filePath);
    }
    
    console.log('Model generation complete!');
}

// Run the generator
generateAllModels();