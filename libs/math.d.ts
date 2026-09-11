import { Quaternion, Vector3 } from "three";
/**
 * A value sampled at a normalized time
 */
export interface Keyframe<T> {
    time: number;
    value: T;
    easing?: EasingFn;
}
/**
 * Finds the two keyframes surrounding a time value
 */
export declare function findKeyframeSegment<T>(keyframes: readonly Keyframe<T>[], time: number): {
    start: Keyframe<T>;
    end: Keyframe<T>;
    progress: number;
};
/**
 * Samples a keyframe track using a custom interpolation function
 */
export declare function sampleKeyframes<T>(keyframes: readonly Keyframe<T>[], time: number, interpolate: (a: T, b: T, t: number) => T): T;
/**
 * Function that maps a normalized time to an eased value (0..1)
 */
export type EasingFn = (t: number) => number;
/**
 * Restricts a value to a given range.
 */
export declare function clamp(value: number, min: number, max: number): number;
/**
 * Restricts a value to the normalized range [0, 1]
 */
export declare function clamp01(value: number): number;
/**
 * Linearly interpolates between 2 values
 * t = 0 -> a
 * t = 1 -> b
 */
export declare function lerp(a: number, b: number, t: number): number;
/**
 * Computes the normalized position of a value between 2 endpoints
 * 0 when value == a
 * 1 when value == b
 * Values outside the range are not clamped
 */
export declare function inverseLerp(a: number, b: number, value: number): number;
/**
 * Maps a value from one range into another
 */
export declare function remap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number;
export declare const linear: EasingFn;
export declare const easeInSine: EasingFn;
export declare const easeOutSine: EasingFn;
export declare const easeInOutSine: EasingFn;
export declare const easeInQuad: EasingFn;
export declare const easeOutQuad: EasingFn;
export declare const easeInOutQuad: EasingFn;
export declare const easeInCubic: EasingFn;
export declare const easeOutCubic: EasingFn;
export declare const easeInOutCubic: EasingFn;
export declare const easeInQuart: EasingFn;
export declare const easeOutQuart: EasingFn;
export declare const easeInOutQuart: EasingFn;
export declare const easeInQuint: EasingFn;
export declare const easeOutQuint: EasingFn;
export declare const easeInOutQuint: EasingFn;
export declare const easeInExpo: EasingFn;
export declare const easeOutExpo: EasingFn;
export declare const easeInOutExpo: EasingFn;
export declare const easeInCirc: EasingFn;
export declare const easeOutCirc: EasingFn;
export declare const easeInOutCirc: EasingFn;
export declare const Easings: {
    readonly linear: EasingFn;
    readonly easeInSine: EasingFn;
    readonly easeOutSine: EasingFn;
    readonly easeInOutSine: EasingFn;
    readonly easeInQuad: EasingFn;
    readonly easeOutQuad: EasingFn;
    readonly easeInOutQuad: EasingFn;
    readonly easeInCubic: EasingFn;
    readonly easeOutCubic: EasingFn;
    readonly easeInOutCubic: EasingFn;
    readonly easeInQuart: EasingFn;
    readonly easeOutQuart: EasingFn;
    readonly easeInOutQuart: EasingFn;
    readonly easeInQuint: EasingFn;
    readonly easeOutQuint: EasingFn;
    readonly easeInOutQuint: EasingFn;
    readonly easeInExpo: EasingFn;
    readonly easeOutExpo: EasingFn;
    readonly easeInOutExpo: EasingFn;
    readonly easeInCirc: EasingFn;
    readonly easeOutCirc: EasingFn;
    readonly easeInOutCirc: EasingFn;
};
export type EasingName = keyof typeof Easings;
/**
 * Produces a symmetric arc using an easing function
 * 0 -> height -> 0
 */
export declare function easingArc(t: number, height?: number, easing?: EasingFn): number;
/**
 * Linearly interpolates between 2 euler rotations
 */
export declare function lerpEuler(a: {
    x: number;
    y: number;
    z: number;
}, b: {
    x: number;
    y: number;
    z: number;
}, t: number, out?: {
    x: number;
    y: number;
    z: number;
}): {
    x: number;
    y: number;
    z: number;
};
/**
 * Spherically interpolates between 2 quaternions
 */
export declare function lerpQuaternion(a: Quaternion, b: Quaternion, t: number): Quaternion;
/**
 * Linearly interpolates between 2 3D vectors
 */
export declare function lerpVector3(a: Vector3, b: Vector3, t: number): Vector3;
/**
 * A keyframe containing Euler rotation values
 */
export type EulerKeyframe = Keyframe<{
    x: number;
    y: number;
    z: number;
}>;
/**
 * Samples Euler rotation keyframes at a specific time
 * Finds the correct keyframes surrounding the given time and interpolates
 * between them to create a smooth rotation value
 * @param keyframes - Euler rotation keyframes
 */
export declare function sampleEulerKeyframes(keyframes: readonly EulerKeyframe[], time: number, out?: {
    x: number;
    y: number;
    z: number;
}): {
    x: number;
    y: number;
    z: number;
};
