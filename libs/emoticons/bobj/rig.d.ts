import { Group, Object3D, SkinnedMesh, Texture } from "three";
import type { BOBJAction } from "./index.js";
import type { PlayerRigConfig } from "./config.js";
import { type Hand } from "./config.js";
import type { BOBJMeshFile } from "./mesh.js";
export declare const BOBJ_TO_SKINVIEW_SCALE = 16;
export declare const BOBJ_FEET_Y_OFFSET = -16;
export declare class EmoteBOBJRig {
    readonly object: Group;
    readonly config: PlayerRigConfig;
    private readonly armature;
    private readonly meshes;
    private readonly bodyMaterial;
    private readonly propMaterials;
    private readonly cosmetics;
    private _currentAction;
    constructor(file: BOBJMeshFile, config: PlayerRigConfig);
    private _buildAdditionalMeshes;
    setBodyTexture(map: Texture | null): void;
    setMeshTexture(meshName: string, map: Texture | null): void;
    getMesh(meshName: string): SkinnedMesh | undefined;
    setMeshVisible(meshName: string, visible: boolean): void;
    getBone(boneName: string): Object3D | undefined;
    attachToHand(object: Object3D, hand: Hand): boolean;
    private getCosmeticAnchor;
    attachCosmetic(object: Object3D, boneName?: string): boolean;
    applyAction(action: BOBJAction | null, frame: number): void;
    get currentAction(): BOBJAction | null;
}
