import type { ModelType } from "skinview-utils";
import { Euler, Group, Mesh, Object3D, Quaternion, Texture, Vector3 } from "three";
/**
 * A Bone is any node that should support layered, animatable position/rotation. Without
 * being limited to the player's actual skeletal joints.
 *
 * Every bone has three layers of transform that are composed together each frame via {@link commit}:
 * - `base*`    - the rest-pose offset from the parent. Set once, never touched by animations.
 * - `origin*`  - written by the currently active "pose" animation
 * - `offset*`  - written by transient modifier states (basically swinging and jumping)
 *
 * Notice: because `commit()` recomputes the underlying position/rotation/quaternion from the
 * layers above, those properties are effectively read-only outputs on a bone - anything written above it
 * will be overwritten next time `commit()` runs.
 */
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
    /**
     * Resets the rest-pose (base) position and rotation of this bone.
     */
    resetBase(): void;
    /**
     * Resets the origin position and rotation of this bone.
     */
    resetOrigin(): void;
    /**
     * Resets the offset position and rotation of this bone.
     */
    resetOffset(): void;
    /**
     * Resets base + origin + offset all at once, and commits the result.
     */
    resetAll(): void;
    /**
     * Composes a base + origin + offset into the actual position and rotation of this bone.
     * This is the only place that writes to the underlying position/rotation/quaternion properties.
     */
    commit(): void;
}
/**
 * Recursively commits every {@link Bone} in the given subtree (including the
 * root itself, if it is a Bone). Call order doesn't matter: each bone's
 * commit() only depends on its own base/origin/offset values, never on its
 * parent's committed transform.
 */
export declare function commitBones(root: Object3D): void;
/**
 * Notice that innerLayer and outerLayer may NOT be the direct children of the Group.
 */
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
    /**
     * Mirrors the position & rotation of left wing,
     * and apply them to the right wing.
     */
    updateRightWing(): void;
    get map(): Texture | null;
    set map(newMap: Texture | null);
}
export declare class WingsObject extends Bone {
    readonly leftWing: Group;
    readonly rightWing: Group;
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
export type BackEquipment = "cape" | "elytra" | "wings";
export declare class PlayerObject extends Group {
    readonly skin: SkinObject;
    readonly cape: CapeObject;
    readonly elytra: ElytraObject;
    readonly wings: WingsObject;
    readonly ears: EarsObject;
    constructor();
    get backEquipment(): BackEquipment | null;
    set backEquipment(value: BackEquipment | null);
    resetJoints(): void;
}
