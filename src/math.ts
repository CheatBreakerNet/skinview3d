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
export function findKeyframeSegment<T>(
	keyframes: readonly Keyframe<T>[],
	time: number
): {
	start: Keyframe<T>;
	end: Keyframe<T>;
	progress: number;
} {
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
export function sampleKeyframes<T>(
	keyframes: readonly Keyframe<T>[],
	time: number,
	interpolate: (a: T, b: T, t: number) => T
): T {
	const segment = findKeyframeSegment(keyframes, time);

	const easing = segment.start.easing ?? linear;

	return interpolate(segment.start.value, segment.end.value, easing(segment.progress));
}

/**
 * Function that maps a normalized time to an eased value (0..1)
 */
export type EasingFn = (t: number) => number;

/**
 * Restricts a value to a given range.
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Restricts a value to the normalized range [0, 1]
 */
export function clamp01(value: number): number {
	return clamp(value, 0, 1);
}

/**
 * Linearly interpolates between 2 values
 * t = 0 -> a
 * t = 1 -> b
 */
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/**
 * Computes the normalized position of a value between 2 endpoints
 * 0 when value == a
 * 1 when value == b
 * Values outside the range are not clamped
 */
export function inverseLerp(a: number, b: number, value: number): number {
	return a === b ? 0 : (value - a) / (b - a);
}

/**
 * Maps a value from one range into another
 */
export function remap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
	return lerp(outMin, outMax, inverseLerp(inMin, inMax, value));
}

// No easing
export const linear: EasingFn = t => t;

// Sine
export const easeInSine: EasingFn = t => 1 - Math.cos((t * Math.PI) / 2);
export const easeOutSine: EasingFn = t => Math.sin((t * Math.PI) / 2);
export const easeInOutSine: EasingFn = t => -(Math.cos(Math.PI * t) - 1) / 2;

// Quad
export const easeInQuad: EasingFn = t => t * t;
export const easeOutQuad: EasingFn = t => 1 - (1 - t) * (1 - t);
export const easeInOutQuad: EasingFn = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Cubic
export const easeInCubic: EasingFn = t => t * t * t;
export const easeOutCubic: EasingFn = t => 1 - (1 - t) ** 3;
export const easeInOutCubic: EasingFn = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Quart
export const easeInQuart: EasingFn = t => t * t * t * t;
export const easeOutQuart: EasingFn = t => 1 - (1 - t) ** 4;
export const easeInOutQuart: EasingFn = t => (t < 0.5 ? 8 * t * t * t * t : 1 - (-2 * t + 2) ** 4 / 2);

// Quint
export const easeInQuint: EasingFn = t => t * t * t * t * t;
export const easeOutQuint: EasingFn = t => 1 - (1 - t) ** 5;
export const easeInOutQuint: EasingFn = t => (t < 0.5 ? 16 * t * t * t * t * t : 1 - (-2 * t + 2) ** 5 / 2);

// Expo
export const easeInExpo: EasingFn = t => (t === 0 ? 0 : 2 ** (10 * t - 10));
export const easeOutExpo: EasingFn = t => (t === 1 ? 1 : 1 - 2 ** (-10 * t));
export const easeInOutExpo: EasingFn = t => {
	if (t === 0) return 0;
	if (t === 1) return 1;
	return t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;
};

// Circ
export const easeInCirc: EasingFn = t => 1 - Math.sqrt(1 - t * t);
export const easeOutCirc: EasingFn = t => Math.sqrt(1 - (t - 1) ** 2);
export const easeInOutCirc: EasingFn = t =>
	t < 0.5 ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2 : (Math.sqrt(1 - (-2 * t + 2) ** 2) + 1) / 2;

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
} as const satisfies Record<string, EasingFn>;

export type EasingName = keyof typeof Easings;

/**
 * Produces a symmetric arc using an easing function
 * 0 -> height -> 0
 */
export function easingArc(t: number, height = 1, easing: EasingFn = easeInOutSine): number {
	t = clamp01(t);

	const value = t < 0.5 ? easing(t * 2) : easing((1 - t) * 2);

	return value * height;
}

/**
 * Linearly interpolates between 2 euler rotations
 */
export function lerpEuler(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, t: number) {
	return {
		x: lerp(a.x, b.x, t),
		y: lerp(a.y, b.y, t),
		z: lerp(a.z, b.z, t),
	};
}

/**
 * Spherically interpolates between 2 quaternions
 */
export function lerpQuaternion(a: Quaternion, b: Quaternion, t: number): Quaternion {
	return new Quaternion().copy(a).slerp(b, t);
}

/**
 * Linearly interpolates between 2 3D vectors
 */
export function lerpVector3(a: Vector3, b: Vector3, t: number): Vector3 {
	return new Vector3(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
}

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
export function sampleEulerKeyframes(keyframes: readonly EulerKeyframe[], time: number) {
	return sampleKeyframes(keyframes, time, lerpEuler);
}
