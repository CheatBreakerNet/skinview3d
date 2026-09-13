import type { ModelType } from "skinview-utils";
import { Euler, Group, Mesh, Object3D, Quaternion, Texture, Vector3 } from "three";
import type { EmoteBOBJRig } from "./skinview3d.js";
export declare class Bone extends Group {
    readonly basePosition: Vector3;
    readonly baseRotation: Euler;
    readonly originPosition: Vector3;
    readonly originRotation: Euler;
    readonly offsetPosition: Vector3;
    readonly offsetRotation: Euler;
    private originQuaternionValue;
    private static readonly tempQuatA;
    private static readonly tempQuatB;
    setBasePosition(x: number, y: number, z: number): void;
    setBaseRotation(x: number, y: number, z: number): void;
    setOriginPosition(x: number, y: number, z: number): void;
    setOffsetPosition(x: number, y: number, z: number): void;
    setOriginQuaternion(q: Quaternion): void;
    resetBase(): void;
    resetOrigin(): void;
    resetOffset(): void;
    resetAll(): void;
    commit(): void;
}
export declare function commitBones(root: Object3D): void;
export declare class BodyPart extends Bone {
    readonly innerLayer: Object3D;
    readonly outerLayer: Object3D;
    constructor(innerLayer: Object3D, outerLayer: Object3D);
}
export declare class SkinObject extends Bone {
    readonly head: BodyPart;
    readonly body: BodyPart;
    readonly rightArm: BodyPart;
    readonly leftArm: BodyPart;
    readonly rightLeg: BodyPart;
    readonly leftLeg: BodyPart;
    private modelListeners;
    private slim;
    private _map;
    private layer1Material;
    private layer1MaterialBiased;
    private layer2Material;
    private layer2MaterialBiased;
    constructor();
    get map(): Texture | null;
    set map(newMap: Texture | null);
    get modelType(): ModelType;
    set modelType(value: ModelType);
    private getBodyParts;
    get bones(): Bone[];
    setInnerLayerVisible(value: boolean): void;
    setOuterLayerVisible(value: boolean): void;
    commitPose(): void;
    resetJoints(): void;
}
export declare class CapeObject extends Bone {
    readonly cape: Mesh;
    private material;
    constructor();
    get map(): Texture | null;
    set map(newMap: Texture | null);
}
export declare class ElytraObject extends Bone {
    readonly leftWing: Group;
    readonly rightWing: Group;
    private material;
    constructor();
    resetJoints(): void;
    updateRightWing(): void;
    get map(): Texture | null;
    set map(newMap: Texture | null);
}
export declare class DragonWingsObject extends Bone {
    readonly leftWing: Group;
    readonly rightWing: Group;
    readonly leftWingTip: Object3D;
    readonly rightWingTip: Object3D;
    private material;
    constructor();
    private createWing;
    resetJoints(): void;
    updateRightWing(): void;
    get map(): Texture | null;
    set map(newMap: Texture | null);
}
export declare class EarsObject extends Bone {
    readonly rightEar: Mesh;
    readonly leftEar: Mesh;
    private material;
    constructor();
    get map(): Texture | null;
    set map(newMap: Texture | null);
}
export type Cosmetic = "cape" | "dragonWings";
export type BackEquipment = "cape" | "elytra" | "wings";
export declare class PlayerObject extends Group {
    cosmeticTimer: number;
    readonly skin: SkinObject;
    readonly cape: CapeObject;
    readonly elytra: ElytraObject;
    readonly dragonWings: DragonWingsObject;
    /** @deprecated Use {@link dragonWings} */
    readonly wings: DragonWingsObject;
    readonly ears: EarsObject;
    private _BOBJRig;
    private _BOBJDefaultRig;
    private _BOBJSlimRig;
    private _useBOBJModel;
    constructor();
    setBOBJRig(rig: EmoteBOBJRig | null): void;
    private _setBOBJCosmetics;
    setBOBJRigs(defaultRig: EmoteBOBJRig | null, slimRig: EmoteBOBJRig | null): void;
    syncBOBJModelType(): void;
    get bobjRig(): EmoteBOBJRig | null;
    get useBOBJModel(): boolean;
    set useBOBJModel(value: boolean);
    get cosmetics(): Cosmetic[];
    set cosmetics(values: readonly Cosmetic[]);
    get capeElytra(): boolean;
    set capeElytra(value: boolean);
    setDragonWingsVisible(value: boolean): void;
    /** @deprecated Use {@link cosmetics} */
    get backEquipment(): BackEquipment | null;
    /** @deprecated Use {@link cosmetics} */
    set backEquipment(value: BackEquipment | null);
    resetJoints(): void;
}
