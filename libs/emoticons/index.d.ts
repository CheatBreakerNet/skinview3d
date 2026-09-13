import { Vector3 } from "three";
import { PlayerAnimation, type AnimationActions } from "../animation.js";
import type { PlayerObject } from "../model.js";
import { type BOBJData } from "./bobj/index.js";
import { EmoteBOBJRig } from "./bobj/rig.js";
import { ParticleSystem } from "./particle/index.js";
export * from "./bobj/index.js";
export * from "./bobj/mesh.js";
export * from "./bobj/config.js";
export * from "./bobj/skinned.js";
export * from "./bobj/rig.js";
export * from "./particle/index.js";
declare const BONE_NAMES: readonly ["head", "body", "rightArm", "leftArm", "rightLeg", "leftLeg"];
export type EmoteBoneName = (typeof BONE_NAMES)[number];
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
export declare function buildEmoteRegistry(data: BOBJData): EmoteDefinition[];
export declare class EmoteAnimation extends PlayerAnimation {
    private readonly _data;
    private readonly _particles;
    private _BOBJRig;
    private _emote;
    private _action;
    private _prevTotalTicks;
    private _activeProps;
    private _lastPlayer;
    constructor(data: BOBJData, particles?: ParticleSystem, bobjRig?: EmoteBOBJRig);
    setBobjRig(rig: EmoteBOBJRig | null): void;
    protected get supportedActions(): Readonly<AnimationActions>;
    interruptForAction(): PlayerAnimation | null;
    get emote(): EmoteDefinition | null;
    get duration(): number;
    playEmote(emote: EmoteDefinition | string | null, registry?: readonly EmoteDefinition[]): void;
    private _updateBOBJState;
    private _frameAt;
    protected animate(player: PlayerObject): void;
    private _fireTriggers;
}
