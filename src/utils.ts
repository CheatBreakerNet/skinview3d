// function that maps a normalized time to an eased value
export type EasingFn = (t: number) => number;

export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

export function clamp01(t: number): number {
	return clamp(t, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

export function inverseLerp(a: number, b: number, value: number): number {
	return a === b ? 0 : (value - a) / (b - a);
}

export function remap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
	return lerp(outMin, outMax, inverseLerp(inMin, inMax, value));
}

export const linear: EasingFn = t => t;

// sine
export const easeInSine: EasingFn = t => 1 - Math.cos((t * Math.PI) / 2);
export const easeOutSine: EasingFn = t => Math.sin((t * Math.PI) / 2);
export const easeInOutSine: EasingFn = t => -(Math.cos(Math.PI * t) - 1) / 2;

// quad
export const easeInQuad: EasingFn = t => t * t;
export const easeOutQuad: EasingFn = t => 1 - (1 - t) * (1 - t);
export const easeInOutQuad: EasingFn = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// cubic
export const easeInCubic: EasingFn = t => t * t * t;
export const easeOutCubic: EasingFn = t => 1 - (1 - t) ** 3;
export const easeInOutCubic: EasingFn = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// quart
export const easeInQuart: EasingFn = t => t * t * t * t;
export const easeOutQuart: EasingFn = t => 1 - (1 - t) ** 4;
export const easeInOutQuart: EasingFn = t => (t < 0.5 ? 8 * t * t * t * t : 1 - (-2 * t + 2) ** 4 / 2);

// quint
export const easeInQuint: EasingFn = t => t * t * t * t * t;
export const easeOutQuint: EasingFn = t => 1 - (1 - t) ** 5;
export const easeInOutQuint: EasingFn = t => (t < 0.5 ? 16 * t * t * t * t * t : 1 - (-2 * t + 2) ** 5 / 2);

// expo
export const easeInExpo: EasingFn = t => (t === 0 ? 0 : 2 ** (10 * t - 10));
export const easeOutExpo: EasingFn = t => (t === 1 ? 1 : 1 - 2 ** (-10 * t));
export const easeInOutExpo: EasingFn = t => {
	if (t === 0) return 0;
	if (t === 1) return 1;
	return t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;
};

// circ
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

// produce a 0 -> peak -> 0 arc
export function easingArc(t: number, height: number = 1, easing: EasingFn = easeInOutSine): number {
	t = clamp01(t);
    
	const half = t < 0.5 ? easing(t * 2) : easing((1 - t) * 2);

	return half * height;
}