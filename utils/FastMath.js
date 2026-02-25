/**
 * Re-export for subpath compatibility.
 * Some module resolvers request utils/FastMath.js (without js/ prefix).
 * This file re-exports from the actual location.
 */
export * from '../js/utils/FastMath.js';
