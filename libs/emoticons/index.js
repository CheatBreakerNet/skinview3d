import { Vector3 } from "three";
import { IdleAnimation, PlayerAnimation } from "../animation.js";
import { sampleBone } from "./bobj/index.js";
import { EmoteBOBJRig } from "./bobj/rig.js";
import { ParticleSystem } from "./particle/index.js";
import { TICK_RATE } from "../consts.js";
export * from "./bobj/index.js";
export * from "./bobj/mesh.js";
export * from "./bobj/config.js";
export * from "./bobj/skinned.js";
export * from "./bobj/rig.js";
export * from "./particle/index.js";
const BONE_NAMES = ["head", "body", "rightArm", "leftArm", "rightLeg", "leftLeg"];
const BOBJ_BONE_NAME = {
    head: "head",
    body: "body",
    rightArm: "right_arm",
    leftArm: "left_arm",
    rightLeg: "right_leg",
    leftLeg: "left_leg",
};
const HAND_OFFSET = [0, -10, 1];
const FACE_OFFSET = [0, 6, 3];
function humanize(key) {
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
function makeTrigger(bone, offset, countAt, spawn) {
    return { bone, offset, countAt, spawn };
}
const POPCORN_TICKS = new Set([8, 32, 56, 86]);
const SPECIAL_TRIGGERS = {
    popcorn: () => [
        makeTrigger("rightArm", HAND_OFFSET, tick => (POPCORN_TICKS.has(tick) ? 15 : 0), (system, position, count) => system.spawnPopcorn(position, count)),
    ],
    pure_salt: () => [
        makeTrigger("rightArm", HAND_OFFSET, tick => (tick === 78 ? 12 : tick > 18 && tick <= 78 && tick % 2 === 0 ? 1 : 0), (system, position, count) => system.spawnSalt(position, count)),
    ],
    sneeze: () => [
        makeTrigger("head", FACE_OFFSET, tick => (tick === 119 ? 10 : 0), (system, position, count) => system.spawnPuff(position, "cloud", count)),
    ],
    crying: () => [
        makeTrigger("head", FACE_OFFSET, tick => (tick % 2 === 0 ? 1 : 0), (system, position, count) => system.spawnPuff(position, "tear", count)),
    ],
    disgusted: () => [
        makeTrigger("head", FACE_OFFSET, tick => (tick >= 78 && tick < 93 ? 3 : 0), (system, position, count) => system.spawnPuff(position, "crumb", count)),
    ],
    star_power: () => [
        makeTrigger("rightArm", HAND_OFFSET, tick => (tick === 30 ? 25 : tick >= 33 && tick < 43 ? 6 : 0), (system, position, count) => system.spawnPuff(position, "sparkle", count)),
    ],
};
const BOBJ_PROPS = {
    popcorn: ["popcorn"],
};
export function buildEmoteRegistry(data) {
    const emotes = [];
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
const DISABLED_ACTIONS = {
    jump: false,
    swing: false,
    crouch: false,
};
export class EmoteAnimation extends PlayerAnimation {
    constructor(data, particles, bobjRig) {
        super();
        Object.defineProperty(this, "_data", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_particles", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_BOBJRig", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_emote", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_action", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_prevTotalTicks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: -1
        });
        Object.defineProperty(this, "_activeProps", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "_lastPlayer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        this._data = data;
        this._particles = particles ?? null;
        this._BOBJRig = bobjRig ?? null;
    }
    setBobjRig(rig) {
        this._BOBJRig = rig;
    }
    get supportedActions() {
        return DISABLED_ACTIONS;
    }
    interruptForAction() {
        this.playEmote(null);
        return new IdleAnimation();
    }
    get emote() {
        return this._emote;
    }
    get duration() {
        return this._action ? this._action.duration / TICK_RATE : 0;
    }
    playEmote(emote, registry) {
        const definition = typeof emote === "string"
            ? ((registry ?? buildEmoteRegistry(this._data)).find(item => item.key === emote) ?? null)
            : emote;
        this._emote = definition;
        this._action = definition ? (this._data.actions.get(definition.action) ?? null) : null;
        this.progress = 0;
        this._prevTotalTicks = -1;
        this._updateBOBJState(definition);
    }
    _updateBOBJState(definition) {
        const player = this._lastPlayer;
        if (!player)
            return;
        const rig = this._BOBJRig;
        const useBOBJ = definition !== null && rig !== null;
        player.useBOBJModel = useBOBJ;
        if (!rig)
            return;
        for (const prop of this._activeProps) {
            rig.setMeshVisible(prop, false);
        }
        this._activeProps = useBOBJ ? (definition?.bobjProps ?? []) : [];
        for (const prop of this._activeProps) {
            rig.setMeshVisible(prop, true);
        }
    }
    _frameAt(totalTicks) {
        const duration = this._action?.duration ?? 0;
        if (duration <= 0)
            return 0;
        if (!this._emote?.looping) {
            return Math.min(totalTicks, duration);
        }
        const wrapped = totalTicks % duration;
        return wrapped < 0 ? wrapped + duration : wrapped;
    }
    animate(player) {
        if (this._lastPlayer !== player) {
            this._lastPlayer = player;
            this._updateBOBJState(this._emote);
        }
        if (!this._action)
            return;
        const totalTicks = this.progress * TICK_RATE;
        const frame = this._frameAt(totalTicks);
        this.animateWings(player);
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
        this._fireTriggers(player, totalTicks);
        this._prevTotalTicks = totalTicks;
    }
    _fireTriggers(player, totalTicks) {
        const triggers = this._emote?.triggers;
        if (!triggers?.length || !this._particles)
            return;
        const duration = Math.max(this._action?.duration ?? 0, 1);
        const looping = this._emote?.looping ?? true;
        const fromTick = Math.floor(this._prevTotalTicks) + 1;
        const toTick = Math.floor(totalTicks);
        for (let tick = fromTick; tick <= toTick; tick++) {
            if (!looping && tick > duration)
                break;
            const localTick = looping ? ((tick % duration) + duration) % duration : tick;
            for (const trigger of triggers) {
                const count = trigger.countAt(localTick);
                if (count <= 0)
                    continue;
                const boneName = BOBJ_BONE_NAME[trigger.bone];
                const bobjBone = this._BOBJRig && player.useBOBJModel ? this._BOBJRig.getBone(boneName) : null;
                const bone = bobjBone ?? player.skin[trigger.bone];
                const position = bone.localToWorld(new Vector3(...trigger.offset));
                trigger.spawn(this._particles, position, count);
            }
        }
    }
}
//# sourceMappingURL=index.js.map