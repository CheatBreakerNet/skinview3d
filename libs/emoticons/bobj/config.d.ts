import { Object3D } from "three";
export interface AttachmentConfig {
    readonly x?: number;
    readonly y?: number;
    readonly z?: number;
    readonly sx?: number;
    readonly sy?: number;
    readonly sz?: number;
    readonly rx?: number;
    readonly ry?: number;
    readonly rz?: number;
}
export interface MeshConfig {
    readonly visible?: boolean;
    readonly normals?: boolean;
    readonly smooth?: boolean;
    readonly texture?: string;
}
export interface PlayerRigConfig {
    readonly name: string;
    readonly primaryMesh: string;
    readonly scale: number;
    readonly scaleItems?: number;
    readonly scaleGui?: number;
    readonly renderHeldItems?: boolean;
    readonly leftHands: Readonly<Record<string, AttachmentConfig>>;
    readonly rightHands: Readonly<Record<string, AttachmentConfig>>;
    readonly head: string;
    readonly body?: string;
    readonly cosmetic?: AttachmentConfig;
    readonly meshes: Readonly<Record<string, MeshConfig>>;
}
export declare function applyHandAttachment(object: Object3D, config: AttachmentConfig): void;
export type Hand = "left" | "right";
export declare function getHandAttachment(config: PlayerRigConfig, hand: Hand): {
    boneName: string;
    config: AttachmentConfig;
} | null;
