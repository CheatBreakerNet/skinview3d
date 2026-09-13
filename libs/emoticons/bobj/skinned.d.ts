import { Bone, BufferGeometry, Material, Matrix4, Skeleton, SkinnedMesh } from "three";
import type { BOBJAction } from "../index.js";
import type { BOBJArmatureDef, BOBJBoneDef, BOBJMeshDef, BOBJMeshFile } from "./mesh.js";
export interface PoseBone {
    readonly bobj: BOBJBoneDef;
    readonly bone: Bone;
    readonly restLocal: Matrix4;
    readonly restWorld: Matrix4;
}
export interface BuiltArmature {
    readonly bones: readonly Bone[];
    readonly bonesByName: ReadonlyMap<string, PoseBone>;
    readonly skeleton: Skeleton;
    readonly roots: readonly Bone[];
}
export declare function buildArmatureSkeleton(armature: BOBJArmatureDef): BuiltArmature;
export interface BonePoseDelta {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly scaleX: number;
    readonly scaleY: number;
    readonly scaleZ: number;
    readonly rotateX: number;
    readonly rotateY: number;
    readonly rotateZ: number;
}
export declare function poseBone(entry: PoseBone, delta: BonePoseDelta): void;
export declare function resetBonePose(poseBoneEntry: PoseBone): void;
export declare function sampleBoneExact(action: BOBJAction | null, boneName: string, frame: number): BonePoseDelta;
export declare function applyActionToArmature(armature: BuiltArmature, action: BOBJAction | null, frame: number): void;
export declare function buildGeometry(file: BOBJMeshFile, meshDef: BOBJMeshDef, boneNameToIndex: ReadonlyMap<string, number>): BufferGeometry | null;
export declare function buildSkinnedMesh(file: BOBJMeshFile, meshDef: BOBJMeshDef, armature: BuiltArmature, boneNameToIndex: ReadonlyMap<string, number>, material: Material, ownsSkeleton: boolean): SkinnedMesh | null;
