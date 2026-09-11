import { Quaternion, Vector3 } from "three";
/**
 * Finds the two keyframes surrounding a time value
 */
export function findKeyframeSegment(keyframes, time) {
    if (keyframes.length === 0) {
        throw new Error("Cannot sample empty keyframe array");
    }
    if (keyframes.length === 1) {
        return {
            start: keyframes[0],
            end: keyframes[0],
            progress: 0,
        };
    }
    if (time <= keyframes[0].time) {
        return {
            start: keyframes[0],
            end: keyframes[1],
            progress: 0,
        };
    }
    for (let i = 0; i < keyframes.length - 1; i++) {
        const start = keyframes[i];
        const end = keyframes[i + 1];
        if (time <= end.time) {
            return {
                start,
                end,
                progress: inverseLerp(start.time, end.time, time),
            };
        }
    }
    const last = keyframes.length - 1;
    return {
        start: keyframes[last - 1],
        end: keyframes[last],
        progress: 1,
    };
}
/**
 * Samples a keyframe track using a custom interpolation function
 */
export function sampleKeyframes(keyframes, time, interpolate) {
    const segment = findKeyframeSegment(keyframes, time);
    const easing = segment.start.easing ?? linear;
    return interpolate(segment.start.value, segment.end.value, easing(segment.progress));
}
/**
 * Restricts a value to a given range.
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
/**
 * Restricts a value to the normalized range [0, 1]
 */
export function clamp01(value) {
    return clamp(value, 0, 1);
}
/**
 * Linearly interpolates between 2 values
 * t = 0 -> a
 * t = 1 -> b
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}
/**
 * Computes the normalized position of a value between 2 endpoints
 * 0 when value == a
 * 1 when value == b
 * Values outside the range are not clamped
 */
export function inverseLerp(a, b, value) {
    return a === b ? 0 : (value - a) / (b - a);
}
/**
 * Maps a value from one range into another
 */
export function remap(value, inMin, inMax, outMin, outMax) {
    return lerp(outMin, outMax, inverseLerp(inMin, inMax, value));
}
// No easing
export const linear = t => t;
// Sine
export const easeInSine = t => 1 - Math.cos((t * Math.PI) / 2);
export const easeOutSine = t => Math.sin((t * Math.PI) / 2);
export const easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;
// Quad
export const easeInQuad = t => t * t;
export const easeOutQuad = t => 1 - (1 - t) * (1 - t);
export const easeInOutQuad = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
// Cubic
export const easeInCubic = t => t * t * t;
export const easeOutCubic = t => 1 - (1 - t) ** 3;
export const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
// Quart
export const easeInQuart = t => t * t * t * t;
export const easeOutQuart = t => 1 - (1 - t) ** 4;
export const easeInOutQuart = t => (t < 0.5 ? 8 * t * t * t * t : 1 - (-2 * t + 2) ** 4 / 2);
// Quint
export const easeInQuint = t => t * t * t * t * t;
export const easeOutQuint = t => 1 - (1 - t) ** 5;
export const easeInOutQuint = t => (t < 0.5 ? 16 * t * t * t * t * t : 1 - (-2 * t + 2) ** 5 / 2);
// Expo
export const easeInExpo = t => (t === 0 ? 0 : 2 ** (10 * t - 10));
export const easeOutExpo = t => (t === 1 ? 1 : 1 - 2 ** (-10 * t));
export const easeInOutExpo = t => {
    if (t === 0)
        return 0;
    if (t === 1)
        return 1;
    return t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;
};
// Circ
export const easeInCirc = t => 1 - Math.sqrt(1 - t * t);
export const easeOutCirc = t => Math.sqrt(1 - (t - 1) ** 2);
export const easeInOutCirc = t => t < 0.5 ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2 : (Math.sqrt(1 - (-2 * t + 2) ** 2) + 1) / 2;
export const Easings = {
    linear,
    easeInSine,
    easeOutSine,
    easeInOutSine,
    easeInQuad,
    easeOutQuad,
    easeInOutQuad,
    easeInCubic,
    easeOutCubic,
    easeInOutCubic,
    easeInQuart,
    easeOutQuart,
    easeInOutQuart,
    easeInQuint,
    easeOutQuint,
    easeInOutQuint,
    easeInExpo,
    easeOutExpo,
    easeInOutExpo,
    easeInCirc,
    easeOutCirc,
    easeInOutCirc,
};
/**
 * Produces a symmetric arc using an easing function
 * 0 -> height -> 0
 */
export function easingArc(t, height = 1, easing = easeInOutSine) {
    t = clamp01(t);
    const value = t < 0.5 ? easing(t * 2) : easing((1 - t) * 2);
    return value * height;
}
/**
 * Linearly interpolates between 2 euler rotations
 */
export function lerpEuler(a, b, t, out = { x: 0, y: 0, z: 0 }) {
    out.x = lerp(a.x, b.x, t);
    out.y = lerp(a.y, b.y, t);
    out.z = lerp(a.z, b.z, t);
    return out;
}
/**
 * Spherically interpolates between 2 quaternions
 */
export function lerpQuaternion(a, b, t) {
    return new Quaternion().copy(a).slerp(b, t);
}
/**
 * Linearly interpolates between 2 3D vectors
 */
export function lerpVector3(a, b, t) {
    return new Vector3(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
}
/**
 * Samples Euler rotation keyframes at a specific time
 * Finds the correct keyframes surrounding the given time and interpolates
 * between them to create a smooth rotation value
 * @param keyframes - Euler rotation keyframes
 */
export function sampleEulerKeyframes(keyframes, time, out) {
    const segment = findKeyframeSegment(keyframes, time);
    const easing = segment.start.easing ?? linear;
    return lerpEuler(segment.start.value, segment.end.value, easing(segment.progress), out);
}
//# sourceMappingURL=math.js.map