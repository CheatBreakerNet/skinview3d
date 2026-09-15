import { bezier, clamp01 } from "../../math.js";

export type BOBJInterpolation = "CONSTANT" | "LINEAR" | "BEZIER";
export type BOBJPath = "location" | "rotation" | "scale";

export type XYZ = [number, number, number];

export interface BOBJKeyframe {
	readonly frame: number;
	readonly value: number;

	readonly interpolation: BOBJInterpolation;

	readonly leftX: number;
	readonly leftY: number;

	readonly rightX: number;
	readonly rightY: number;
}

export interface BOBJChannel {
	readonly path: BOBJPath;
	readonly axis: 0 | 1 | 2;
	readonly keyframes: readonly BOBJKeyframe[];
}

export interface BOBJTrack {
	readonly name: string;
	readonly channels: readonly BOBJChannel[];
}

export interface BOBJAction {
	readonly name: string;
	readonly bones: ReadonlyMap<string, BOBJTrack>;
	readonly duration: number; // Highest frame number found anywhere
}

export interface BOBJData {
	readonly actions: ReadonlyMap<string, BOBJAction>;
}

export interface BoneSample {
	readonly position: readonly [number, number, number];
	readonly rotation: readonly [number, number, number];
	readonly scale: readonly [number, number, number];
}

const BONE_SAMPLE: BoneSample = {
	position: [0, 0, 0],
	rotation: [0, 0, 0],
	scale: [1, 1, 1],
};

function parseInterpolation(value: string | undefined): BOBJInterpolation {
	// TODO
	// https://github.com/CheatBreakerNet/Client-Multi-MCP/blob/emotes/1.8.9/src/main/java/mchorse/mclib/utils/Interpolation.java
	if (value === "CONSTANT") return "CONSTANT";
	if (value === "BEZIER") return "BEZIER";
	return "LINEAR";
}

function parseKeyframe(values: readonly string[]): BOBJKeyframe | null {
	if (values.length === 8) {
		return {
			frame: Number.parseInt(values[1], 10),
			value: Number.parseFloat(values[2]),
			interpolation: parseInterpolation(values[3]),
			leftX: Number.parseFloat(values[4]),
			leftY: Number.parseFloat(values[5]),
			rightX: Number.parseFloat(values[6]),
			rightY: Number.parseFloat(values[7]),
		};
	}

	if (values.length === 4) {
		return {
			frame: Number.parseInt(values[1], 10),
			value: Number.parseFloat(values[2]),
			interpolation: parseInterpolation(values[3]),
			leftX: 0,
			leftY: 0,
			rightX: 0,
			rightY: 0,
		};
	}

	if (values.length === 3) {
		return {
			frame: Number.parseInt(values[1], 10),
			value: Number.parseFloat(values[2]),
			interpolation: "LINEAR",
			leftX: 0,
			leftY: 0,
			rightX: 0,
			rightY: 0,
		};
	}

	return null;
}

function parsePath(value: string): BOBJPath | null {
	if (value === "location" || value === "rotation" || value === "scale") return value;
	return null;
}

// TODO
// https://github.com/CheatBreakerNet/Client-Multi-MCP/blob/emotes/1.8.9/src/main/java/mchorse/emoticons/skin_n_bones/api/bobj/BOBJLoader.java
export function parseActions(data: string): BOBJData {
	const actions = new Map<string, Map<string, BOBJTrack>>();

	let tracks: Map<string, BOBJTrack> | null = null;
	let channels: BOBJChannel[] | null = null;
	let keyframes: BOBJKeyframe[] | null = null;

	const lines = data.split(/\r?\n/);

	for (const line of lines) {
		if (line.length === 0) {
			continue;
		}

		const values = line.split(/\s+/).filter(value => value.length > 0);
		if (values.length === 0) {
			continue;
		}

		const tag = values[0];

		// Animation
		if (tag === "an") {
			const name = values[1];

			tracks = new Map();

			actions.set(name, tracks);
			channels = null;
			keyframes = null;
		} else if (tag === "ao") {
			if (!tracks) {
				continue;
			}

			const name = values[1];

			channels = [];
			tracks.set(name, { name, channels });
			keyframes = null;
		} else if (tag === "ag") {
			if (!channels) {
				continue;
			}

			const path = parsePath(values[1]);
			const axis = Number.parseInt(values[2], 10);
			if (path === null || (axis !== 0 && axis !== 1 && axis !== 2)) {
				continue;
			}

			keyframes = [];
			channels.push({
				path,
				// axis: axis as 0 | 1 | 2,
				axis,
				keyframes,
			});
		} else if (tag === "kf") {
			if (!keyframes) {
				continue;
			}

			const keyframe = parseKeyframe(values);
			if (keyframe) {
				keyframes.push(keyframe);
			}
		}

		// Other tags are used for mesh data.
	}

	const resolvedActions = new Map<string, BOBJAction>();

	for (const [name, bones] of actions) {
		let duration: number = 0;

		for (const bone of bones.values()) {
			for (const channel of bone.channels) {
				for (const keyframe of channel.keyframes) {
					if (keyframe.frame > duration) {
						duration = keyframe.frame;
					}
				}
			}
		}

		resolvedActions.set(name, { name, bones, duration });
	}

	return { actions: resolvedActions };
}

function bezierX(p1x: number, p2x: number, x: number, epsilon: number): number {
	let lower = 0;
	let upper = 1;
	let t = x;

	for (let i = 0; i < 100; i++) {
		const estimate = bezier(0, p1x, p2x, 1, t);
		if (Math.abs(x - estimate) < epsilon) return t;

		if (estimate < x) {
			lower = t;
		} else {
			upper = t;
		}

		t = (lower + upper) / 2;
	}

	return t;
}

function interpolateKeyframes(from: BOBJKeyframe, t: number, to: BOBJKeyframe): number {
	if (from.interpolation === "CONSTANT") {
		return from.value;
	}

	if (from.interpolation === "LINEAR") {
		return from.value + (to.value - from.value) * t;
	}

	// Bezier
	if (t <= 0) {
		return from.value;
	}

	if (t >= 1) {
		return to.value;
	}

	const frameSpan = to.frame - from.frame;
	let valueSpan = to.value - from.value;
	if (valueSpan === 0) {
		valueSpan = 1e-5;
	}

	let rightX = (from.rightX - from.frame) / frameSpan;
	const rightY = (from.rightY - from.value) / valueSpan;

	let leftX = (from.leftX - from.frame) / frameSpan;
	const leftY = (from.leftY - from.value) / valueSpan;

	let espilon = 5e-4;
	espilon = valueSpan === 0 ? espilon : Math.max(Math.min(espilon, (1 / valueSpan) * espilon), 1e-5);

	rightX = clamp01(rightX);
	leftX = clamp01(leftX);

	return bezier(0, rightY, leftY, 1, bezierX(rightX, leftX, t, espilon)) * valueSpan + from.value;
}

// TODO
export function sampleChannel(channel: BOBJChannel, frame: number): number {
	const keyframes = channel.keyframes;
	const n = keyframes.length;

	if (n === 0) {
		return 0;
	}

	if (n === 1) {
		return keyframes[0].value;
	}

	const first = keyframes[0];
	if (first.frame > frame) {
		return first.value;
	}

	for (let i = 0; i < n; i++) {
		const keyframe = keyframes[i];

		if (keyframe.frame > frame) {
			const previous = keyframes[i - 1];
			const t = (frame - previous.frame) / (keyframe.frame - previous.frame);

			return interpolateKeyframes(previous, t, keyframe);
		}
	}

	return keyframes[n - 1].value;
}

export function sampleBone(action: BOBJAction, bone: string, frame: number): BoneSample {
	const track = action.bones.get(bone);
	if (!track) {
		return BONE_SAMPLE;
	}

	const position: XYZ = [0, 0, 0];
	const rotation: XYZ = [0, 0, 0];
	const scale: XYZ = [1, 1, 1];

	for (const channel of track.channels) {
		const value = sampleChannel(channel, frame);

		if (channel.path === "location") {
			position[channel.axis] = -value;
		} else if (channel.path === "rotation") {
			rotation[channel.axis] = -value;
		} else {
			scale[channel.axis] = -value;
		}
	}

	return { position, rotation, scale };
}
