export interface BOBJWeight {
    readonly bone: string;
    readonly weight: number;
}
export interface BOBJVertex {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly weights: readonly BOBJWeight[];
}
export interface BOBJFaceCorner {
    readonly position: number;
    readonly texCoord: number;
    readonly normal: number;
}
export interface BOBJFace {
    readonly corners: readonly [BOBJFaceCorner, BOBJFaceCorner, BOBJFaceCorner];
}
export interface BOBJMeshDef {
    readonly name: string;
    readonly armatureName: string | null;
    readonly faces: BOBJFace[];
}
export interface BOBJBoneDef {
    readonly index: number;
    readonly name: string;
    readonly parent: string | null;
    readonly tail: readonly [number, number, number];
    readonly matrix: readonly number[];
}
export interface BOBJArmatureDef {
    readonly name: string;
    readonly bones: readonly BOBJBoneDef[];
    readonly bonesByName: ReadonlyMap<string, BOBJBoneDef>;
}
export interface BOBJMeshFile {
    readonly vertices: readonly BOBJVertex[];
    readonly uvs: readonly (readonly [number, number])[];
    readonly normals: readonly (readonly [number, number, number])[];
    readonly meshes: ReadonlyMap<string, BOBJMeshDef>;
    readonly armatures: ReadonlyMap<string, BOBJArmatureDef>;
}
export declare function parseMesh(data: string): BOBJMeshFile;
export declare function mergeBobjMesh(base: BOBJMeshFile, other: BOBJMeshFile): BOBJMeshFile;
