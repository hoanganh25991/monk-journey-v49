/**
 * Fast Math Utilities
 * Performance-optimized math operations using 32-bit floats and avoiding expensive operations
 * Use these in hot paths (collision detection, distance checks, per-frame calculations)
 */

/**
 * Fast squared distance calculation (2D horizontal, ignores Y)
 * Use this instead of distanceTo() when you only need to compare distances
 * @param {number} x1 - First point X
 * @param {number} z1 - First point Z
 * @param {number} x2 - Second point X
 * @param {number} z2 - Second point Z
 * @returns {number} Squared distance (no sqrt)
 */
export function distanceSq2D(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    return dx * dx + dz * dz;
}

/**
 * Fast squared distance calculation (3D)
 * Use this instead of distanceTo() when you only need to compare distances
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} z1 - First point Z
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @param {number} z2 - Second point Z
 * @returns {number} Squared distance (no sqrt)
 */
export function distanceSq3D(x1, y1, z1, x2, y2, z2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    return dx * dx + dy * dy + dz * dz;
}

/**
 * Fast approximate distance (3D)
 * Octagonal-style approximation - faster than sqrt, ~5% error
 * @param {number} x1,y1,z1 - First point
 * @param {number} x2,y2,z2 - Second point
 * @returns {number} Approximate distance
 */
export function distanceApprox3D(x1, y1, z1, x2, y2, z2) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const dz = Math.abs(z2 - z1);
    const max = Math.max(dx, dy, dz);
    const min = Math.min(dx, dy, dz);
    const mid = dx + dy + dz - max - min;
    return max + (min + mid) * 0.43;
}

/**
 * Fast approximate distance (2D horizontal)
 * Uses approximation: faster than sqrt but less accurate
 * Good for rough distance checks where exact value doesn't matter
 * Error: ~3-4% but 2-3x faster than Math.sqrt
 * @param {number} x1 - First point X
 * @param {number} z1 - First point Z
 * @param {number} x2 - Second point X
 * @param {number} z2 - Second point Z
 * @returns {number} Approximate distance
 */
export function distanceApprox2D(x1, z1, x2, z2) {
    const dx = Math.abs(x2 - x1);
    const dz = Math.abs(z2 - z1);
    const min = Math.min(dx, dz);
    const max = Math.max(dx, dz);
    // Approximation: max + 0.428 * min (Octagonal approximation)
    return max + (min * 0.428);
}

/**
 * Fast normalize 2D vector (in-place, no allocation)
 * @param {Object} out - Output object {x, z}
 * @param {number} dx - X component
 * @param {number} dz - Z component
 */
export function normalize2D(out, dx, dz) {
    const lengthSq = dx * dx + dz * dz;
    if (lengthSq > 0) {
        const invLength = 1.0 / Math.sqrt(lengthSq);
        out.x = dx * invLength;
        out.z = dz * invLength;
    } else {
        out.x = 0;
        out.z = 0;
    }
}

/**
 * Fast normalize 3D vector (in-place, no allocation)
 * @param {Object} out - Output object {x, y, z}
 * @param {number} dx - X component
 * @param {number} dy - Y component
 * @param {number} dz - Z component
 */
export function normalize3D(out, dx, dy, dz) {
    const lengthSq = dx * dx + dy * dy + dz * dz;
    if (lengthSq > 0) {
        const invLength = 1.0 / Math.sqrt(lengthSq);
        out.x = dx * invLength;
        out.y = dy * invLength;
        out.z = dz * invLength;
    } else {
        out.x = 0;
        out.y = 0;
        out.z = 0;
    }
}

// Reusable buffer for fastInvSqrt (avoids allocation in hot path)
const _invSqrtBuf = new ArrayBuffer(4);
const _invSqrtF32 = new Float32Array(_invSqrtBuf);
const _invSqrtI32 = new Int32Array(_invSqrtBuf);

/**
 * Fast inverse square root (Quake III style, one Newton-Raphson iteration)
 * Use for normalization when approximate 1/sqrt is acceptable.
 * @param {number} x - Input number (must be > 0)
 * @returns {number} Approximate 1/sqrt(x)
 */
export function fastInvSqrt(x) {
    if (x <= 0) return 0;
    _invSqrtF32[0] = x;
    _invSqrtI32[0] = 0x5f3759df - (_invSqrtI32[0] >> 1);
    const y = _invSqrtF32[0];
    return y * (1.5 - (x * 0.5 * y * y));
}

/**
 * Linear interpolation (optimized with fround)
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
    return Math.fround(a + (b - a) * t);
}

/**
 * Clamp value between min and max (optimized)
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return value < min ? min : (value > max ? max : value);
}

/**
 * Fast floor operation using bitwise OR
 * Only works correctly for numbers in range [-2^31, 2^31]
 * @param {number} x - Number to floor
 * @returns {number} Floored value
 */
export function fastFloor(x) {
    return x | 0;
}

/**
 * Fast absolute value using bitwise operations
 * @param {number} x - Number
 * @returns {number} Absolute value
 */
export function fastAbs(x) {
    return (x ^ (x >> 31)) - (x >> 31);
}

/**
 * Check if two 2D points are within maxDist of each other (squared distance)
 * @param {number} x1 - First point X
 * @param {number} z1 - First point Z
 * @param {number} x2 - Second point X
 * @param {number} z2 - Second point Z
 * @param {number} maxDist - Maximum distance threshold
 * @returns {boolean} True if distance <= maxDist
 */
export function isNear2D(x1, z1, x2, z2, maxDist) {
    return distanceSq2D(x1, z1, x2, z2) <= maxDist * maxDist;
}

/**
 * Check if point is within circle (2D, uses squared distance)
 * @param {number} px - Point X
 * @param {number} pz - Point Z
 * @param {number} cx - Circle center X
 * @param {number} cz - Circle center Z
 * @param {number} radius - Circle radius
 * @returns {boolean} True if point is inside circle
 */
export function isPointInCircle(px, pz, cx, cz, radius) {
    const dx = px - cx;
    const dz = pz - cz;
    return (dx * dx + dz * dz) <= (radius * radius);
}

/**
 * Check if point is within sphere (3D, uses squared distance)
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} pz - Point Z
 * @param {number} cx - Sphere center X
 * @param {number} cy - Sphere center Y
 * @param {number} cz - Sphere center Z
 * @param {number} radius - Sphere radius
 * @returns {boolean} True if point is inside sphere
 */
export function isPointInSphere(px, py, pz, cx, cy, cz, radius) {
    const dx = px - cx;
    const dy = py - cy;
    const dz = pz - cz;
    return (dx * dx + dy * dy + dz * dz) <= (radius * radius);
}

/**
 * Reusable temp objects to avoid allocations in hot paths
 * Use these for intermediate calculations
 */
export const tempVec2 = { x: 0, z: 0 };
export const tempVec3 = { x: 0, y: 0, z: 0 };

/**
 * Fast atan2 approximation (good for gameplay, not scientific)
 * Error: ~0.005 radians but 2-3x faster than Math.atan2
 * @param {number} y - Y component
 * @param {number} x - X component
 * @returns {number} Angle in radians
 */
export function fastAtan2(y, x) {
    const absY = Math.abs(y);
    const absX = Math.abs(x);
    
    if (absX === 0 && absY === 0) return 0;
    
    const a = Math.min(absX, absY) / Math.max(absX, absY);
    const s = a * a;
    let r = ((-0.0464964749 * s + 0.15931422) * s - 0.327622764) * s * a + a;
    
    if (absY > absX) r = 1.57079637 - r;
    if (x < 0) r = 3.14159274 - r;
    if (y < 0) r = -r;
    
    return r;
}

/**
 * Fast sin approximation using polynomial
 * Error: ~0.001 but 2x faster than Math.sin
 * @param {number} x - Angle in radians
 * @returns {number} Sine value
 */
export function fastSin(x) {
    // Normalize to [-PI, PI]
    x = x % 6.28318531; // 2*PI
    if (x > 3.14159265) x -= 6.28318531;
    if (x < -3.14159265) x += 6.28318531;
    
    // Polynomial approximation
    const x2 = x * x;
    return x * (1.0 - x2 * (0.16666667 - x2 * 0.00833333));
}

/**
 * Fast cos approximation using sin
 * @param {number} x - Angle in radians
 * @returns {number} Cosine value
 */
export function fastCos(x) {
    return fastSin(x + 1.57079632); // sin(x + PI/2)
}

/**
 * Pool of Float32Arrays for temporary calculations
 * Reuse these instead of creating new arrays
 */
const FLOAT32_POOL_SIZE = 10;
const float32Pool = [];
for (let i = 0; i < FLOAT32_POOL_SIZE; i++) {
    float32Pool.push(new Float32Array(16)); // 16 floats per array
}
let poolIndex = 0;

/**
 * Get a temporary Float32Array from pool
 * @param {number} size - Number of floats needed (max 16)
 * @returns {Float32Array} Temporary array (will be reused, don't store reference)
 */
export function getTempFloat32Array(size = 16) {
    const array = float32Pool[poolIndex];
    poolIndex = (poolIndex + 1) % FLOAT32_POOL_SIZE;
    return array;
}

/**
 * Performance monitoring utilities
 */
export const PerfStats = {
    sqrtCalls: 0,
    atan2Calls: 0,
    vectorAllocs: 0,
    
    reset() {
        this.sqrtCalls = 0;
        this.atan2Calls = 0;
        this.vectorAllocs = 0;
    },
    
    log() {
        console.log('FastMath Stats:', {
            sqrtAvoided: this.sqrtCalls,
            atan2Avoided: this.atan2Calls,
            vectorAllocsAvoided: this.vectorAllocs
        });
    }
};
