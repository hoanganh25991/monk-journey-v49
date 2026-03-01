/**
 * Camera view mode values.
 * Stored under STORAGE_KEYS.CAMERA_MODE; used so first/third person are keyed consistently (InputHandler, PlayerMovement, CameraControlUI).
 * First-person view = eye button → OVER_SHOULDER; persisted via storage-key CAMERA_MODE.
 */
export const CAMERA_MODES = {
    THIRD_PERSON: 'third-person',
    OVER_SHOULDER: 'over-shoulder'   // First-person (eye button)
};
