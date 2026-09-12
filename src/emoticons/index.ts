import { Vector3 } from "three";
import { PlayerAnimation, type AnimationActions } from "../animation.js";
import type { PlayerObject } from "../model.js";

import { type BOBJAction, type BOBJData, sampleBone } from "./bobj/index.js";
import { EmoteBOBJRig } from "./bobj/rig.js";
import { ParticleSystem } from "./particle/index.js";

import { TICK_RATE } from "../consts.js";

export * from "./bobj/index.js";
export * from "./bobj/mesh.js";
export * from "./bobj/config.js";
export * from "./bobj/skinned.js";
export * from "./bobj/rig.js";
export * from "./particle/index.js";

const BONE_NAMES = ["head", "body", "rightArm", "leftArm", "rightLeg", "leftLeg"] as const;

export type EmoteBoneName = (typeof BONE_NAMES)[number];

const BOBJ_BONE_NAME: Record<EmoteBoneName, string> = {
	head: "head",
	body: "body",
	rightArm: "right_arm",
	leftArm: "left_arm",
	rightLeg: "right_leg",
	leftLeg: "left_leg",
};

// const BOBJ_LOW_BONE_NAME = {
// 	rightArm: "low_right_arm",
// 	leftArm: "low_left_arm",
// 	rightLeg: "low_leg_right",
// 	leftLeg: "low_left_leg",
// } as const;

// type LowBoneName = keyof typeof BOBJ_LOW_BONE_NAME;

const HAND_OFFSET: readonly [number, number, number] = [0, -10, 1];
const FACE_OFFSET: readonly [number, number, number] = [0, 6, 3];

export interface EmoteTrigger {
	readonly bone: EmoteBoneName;
	readonly offset: readonly [number, number, number];

	countAt(localTick: number): number;
	spawn(system: ParticleSystem, position: Vector3, count: number): void;
}

export interface EmoteDefinition {
	readonly key: string;
	readonly action: string;
	readonly label: string;
	readonly looping: boolean;
	readonly triggers?: readonly EmoteTrigger[];
	readonly bobjProps?: readonly string[];
}

function humanize(key: string): string {
	return key
		.split("_")
		.map(word => (word ? word[0].toUpperCase() + word.slice(1) : word))
		.join(" ");
}

const NON_LOOPING_EMOTES = new Set([
	"boy",
	"bow",
	"calculated",
	"confused",
	"dab",
	"facepalm",
	"fist",
	"no",
	"pointing",
	"pure_salt",
	"rock_paper_scissors",
	"salute",
	"shrug",
	"wave",
	"yes",
	"bitchslap",
	"bongo_cat",
	"breathtaking",
	"disgusted",
	"punch",
	"sneeze",
	"threatening",
	"woah",
]);

function popcornTrigger(): EmoteTrigger {
	const ticks = new Set([8, 32, 56, 86]);

	return {
		bone: "rightArm",
		offset: HAND_OFFSET,
		countAt: tick => (ticks.has(tick) ? 15 : 0),
		spawn: (system, position, count) => {
			system.spawnPopcorn(position, count);
		},
	};
}

function pureSaltTrigger(): EmoteTrigger {
	return {
		bone: "rightArm",
		offset: HAND_OFFSET,
		countAt: tick => {
			if (tick === 78) return 12;
			if (tick > 18 && tick <= 78 && tick % 2 === 0) return 1;
			return 0;
		},
		spawn: (system, position, count) => {
			system.spawnSalt(position, count);
		},
	};
}

function sneezeTrigger(): EmoteTrigger {
	const burstTick = 119;

	return {
		bone: "head",
		offset: FACE_OFFSET,
		countAt: tick => (tick === burstTick ? 10 : 0),
		spawn: (system, position, count) => {
			system.spawnPuff(position, "cloud", count);
		},
	};
}

function cryingTrigger(): EmoteTrigger {
	return {
		bone: "head",
		offset: FACE_OFFSET,
		countAt: tick => (tick % 2 === 0 ? 1 : 0),
		spawn: (system, position, count) => {
			system.spawnPuff(position, "tear", count);
		},
	};
}

function disgustedTrigger(): EmoteTrigger {
	return {
		bone: "head",
		offset: FACE_OFFSET,
		countAt: tick => (tick >= 78 && tick < 93 ? 3 : 0),
		spawn: (system, position, count) => {
			system.spawnPuff(position, "crumb", count);
		},
	};
}

function starPowerTrigger(): EmoteTrigger {
	return {
		bone: "rightArm",
		offset: HAND_OFFSET,
		countAt: tick => {
			if (tick === 30) return 15;
			if (tick >= 33 && tick < 43) return 4;
			return 0;
		},
		spawn: (system, position, count) => {
			system.spawnPuff(position, "sparkle", count);
		},
	};
}

const SPECIAL_TRIGGERS: Record<string, () => readonly EmoteTrigger[]> = {
	popcorn: () => [popcornTrigger()],
	pure_salt: () => [pureSaltTrigger()],
	sneeze: () => [sneezeTrigger()],
	crying: () => [cryingTrigger()],
	disgusted: () => [disgustedTrigger()],
	star_power: () => [starPowerTrigger()],
};

const BOBJ_PROPS: Record<string, readonly string[]> = {
	popcorn: ["popcorn"],
};

export function buildEmoteRegistry(data: BOBJData): EmoteDefinition[] {
	const emotes: EmoteDefinition[] = [];

	for (const actionName of data.actions.keys()) {
		if (!actionName.startsWith("emote_") || actionName.endsWith("_IK")) {
			continue;
		}

		const key = actionName.slice("emote_".length);

		emotes.push({
			key,
			action: actionName,
			label: humanize(key),
			looping: !NON_LOOPING_EMOTES.has(key),
			triggers: SPECIAL_TRIGGERS[key]?.(),
			bobjProps: BOBJ_PROPS[key],
		});
	}

	emotes.sort((a, b) => a.label.localeCompare(b.label));
	return emotes;
}

const DISABLED_ACTIONS: Readonly<AnimationActions> = {
	jump: false,
	swing: false,
	crouch: false,
};

export class EmoteAnimation extends PlayerAnimation {
	private readonly _data: BOBJData;
	private readonly _particles: ParticleSystem | null;

	private _BOBJRig: EmoteBOBJRig | null;
	private _emote: EmoteDefinition | null = null;
	private _action: BOBJAction | null = null;
	private _prevTotalTicks = 0;
	private _activeProps: readonly string[] = [];
	private _lastPlayer: PlayerObject | null = null;

	constructor(data: BOBJData, particles?: ParticleSystem, bobjRig?: EmoteBOBJRig) {
		super();

		this._data = data;
		this._particles = particles ?? null;
		this._BOBJRig = bobjRig ?? null;
	}

	setBobjRig(rig: EmoteBOBJRig | null): void {
		this._BOBJRig = rig;
	}

	protected override get supportedActions(): Readonly<AnimationActions> {
		return DISABLED_ACTIONS;
	}

	get emote(): EmoteDefinition | null {
		return this._emote;
	}

	get duration(): number {
		return this._action ? this._action.duration / TICK_RATE : 0;
	}

	playEmote(emote: EmoteDefinition | string | null, registry?: readonly EmoteDefinition[]): void {
		const definition =
			typeof emote === "string"
				? ((registry ?? buildEmoteRegistry(this._data)).find(item => item.key === emote) ?? null)
				: emote;

		this._emote = definition;
		this._action = definition ? (this._data.actions.get(definition.action) ?? null) : null;

		this.progress = 0;
		this._prevTotalTicks = 0;

		this._updateBOBJState(definition);
	}

	private _updateBOBJState(definition: EmoteDefinition | null): void {
		const player = this._lastPlayer;
		if (!player) return;

		const rig = this._BOBJRig;
		const useBOBJ = definition !== null && rig !== null;

		player.useBOBJModel = useBOBJ;

		if (!rig) return;

		for (const prop of this._activeProps) {
			rig.setMeshVisible(prop, false);
		}

		this._activeProps = useBOBJ ? (definition?.bobjProps ?? []) : [];

		for (const prop of this._activeProps) {
			rig.setMeshVisible(prop, true);
		}
	}

	private _frameAt(totalTicks: number): number {
		const duration = this._action?.duration ?? 0;
		if (duration <= 0) return 0;

		if (!this._emote?.looping) {
			return Math.min(totalTicks, duration);
		}

		const wrapped = totalTicks % duration;
		return wrapped < 0 ? wrapped + duration : wrapped;
	}

	protected animate(player: PlayerObject): void {
		if (this._lastPlayer !== player) {
			this._lastPlayer = player;
			this._updateBOBJState(this._emote);
		}

		if (!this._action) return;

		const totalTicks = this.progress * TICK_RATE;
		const frame = this._frameAt(totalTicks);

		if (this._BOBJRig && player.useBOBJModel) {
			this._BOBJRig.applyAction(this._action, frame);
			this._fireTriggers(player, totalTicks);
			this._prevTotalTicks = totalTicks;

			return;
		}

		for (const boneName of BONE_NAMES) {
			const sample = sampleBone(this._action, BOBJ_BONE_NAME[boneName], frame);

			const bone = player.skin[boneName];

			bone.originPosition.set(sample.position[0], sample.position[1], sample.position[2]);

			bone.originRotation.set(-sample.rotation[0], -sample.rotation[1], sample.rotation[2]);

			bone.scale.set(sample.scale[0], sample.scale[1], sample.scale[2]);
		}

		// const lowBones: Record<LowBoneName, typeof player.skin.lowRightArm> = {
		// 	rightArm: player.skin.lowRightArm,
		// 	leftArm: player.skin.lowLeftArm,
		// 	rightLeg: player.skin.lowRightLeg,
		// 	leftLeg: player.skin.lowLeftLeg,
		// };

		// for (const boneName of Object.keys(BOBJ_LOW_BONE_NAME) as LowBoneName[]) {
		// 	const bone = lowBones[boneName];
		// 	const sample = sampleBone(this._action, BOBJ_LOW_BONE_NAME[boneName], frame);

		// 	bone.setOriginPosition(sample.position[0], sample.position[1], -sample.position[2]);

		// 	bone.originRotation.set(sample.rotation[0], sample.rotation[1], -sample.rotation[2]);

		// 	bone.scale.set(sample.scale[0], sample.scale[1], sample.scale[2]);
		// }

		this._fireTriggers(player, totalTicks);
		this._prevTotalTicks = totalTicks;
	}

	private _fireTriggers(player: PlayerObject, totalTicks: number): void {
		const triggers = this._emote?.triggers;

		if (!triggers?.length || !this._particles) return;

		const duration = Math.max(this._action?.duration ?? 0, 1);
		const looping = this._emote?.looping ?? true;

		const fromTick = Math.floor(this._prevTotalTicks) + 1;
		const toTick = Math.floor(totalTicks);

		for (let tick = fromTick; tick <= toTick; tick++) {
			if (!looping && tick > duration) break;

			const localTick = looping ? ((tick % duration) + duration) % duration : tick;

			for (const trigger of triggers) {
				const count = trigger.countAt(localTick);
				if (count <= 0) continue;

				const boneName = BOBJ_BONE_NAME[trigger.bone];
				const bobjBone = this._BOBJRig && player.useBOBJModel ? this._BOBJRig.getBone(boneName) : null;

				const bone = bobjBone ?? player.skin[trigger.bone];
				const position = bone.localToWorld(new Vector3(...trigger.offset));

				trigger.spawn(this._particles, position, count);
			}
		}
	}
}
