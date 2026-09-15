import {
	Bone,
	BufferAttribute,
	BufferGeometry,
	Material,
	Matrix4,
	Quaternion,
	Skeleton,
	SkinnedMesh,
	Vector3,
} from "three";

import type { BOBJAction } from "../index.js";
import { sampleChannel } from "../index.js";
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

function matrixFromRowMajor16(values: readonly number[]): Matrix4 {
	const matrix = new Matrix4();

	matrix.set(
		...(values as [
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
		])
	);

	return matrix;
}

export function buildArmatureSkeleton(armature: BOBJArmatureDef): BuiltArmature {
	const bones: Bone[] = [];
	const bonesByName = new Map<string, PoseBone>();
	const roots: Bone[] = [];

	for (const bobjBone of armature.bones) {
		const bindMatrix = matrixFromRowMajor16(bobjBone.matrix);

		let restLocal: Matrix4;

		const parentEntry = bobjBone.parent ? bonesByName.get(bobjBone.parent) : undefined;

		if (parentEntry) {
			// relBoneMat = inverse(parentBoneMat) * boneMat
			restLocal = new Matrix4().copy(parentEntry.restWorld).invert().multiply(bindMatrix);
		} else {
			restLocal = bindMatrix.clone();
		}

		const bone = new Bone();
		bone.name = bobjBone.name;

		const position = new Vector3();
		const quaternion = new Quaternion();
		const scale = new Vector3();

		restLocal.decompose(position, quaternion, scale);

		bone.position.copy(position);
		bone.quaternion.copy(quaternion);
		bone.scale.copy(scale);

		if (parentEntry) {
			parentEntry.bone.add(bone);
		} else {
			roots.push(bone);
		}

		bones.push(bone);

		bonesByName.set(bobjBone.name, { bobj: bobjBone, bone, restLocal, restWorld: bindMatrix });
	}

	const skeleton = new Skeleton(bones);

	return { bones, bonesByName, skeleton, roots };
}

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

export function poseBone(entry: PoseBone, delta: BonePoseDelta): void {
	const local = new Matrix4()
		.copy(entry.restLocal)
		.multiply(new Matrix4().makeTranslation(delta.x, delta.y, delta.z))
		.multiply(new Matrix4().makeScale(delta.scaleX, delta.scaleY, delta.scaleZ))
		.multiply(new Matrix4().makeRotationZ(delta.rotateZ))
		.multiply(new Matrix4().makeRotationY(delta.rotateY))
		.multiply(new Matrix4().makeRotationX(delta.rotateX));

	const position = new Vector3();
	const quaternion = new Quaternion();
	const scale = new Vector3();

	local.decompose(position, quaternion, scale);

	entry.bone.position.copy(position);
	entry.bone.quaternion.copy(quaternion);
	entry.bone.scale.copy(scale);
}

export function resetBonePose(poseBoneEntry: PoseBone): void {
	const position = new Vector3();
	const quaternion = new Quaternion();
	const scale = new Vector3();

	poseBoneEntry.restLocal.decompose(position, quaternion, scale);

	poseBoneEntry.bone.position.copy(position);
	poseBoneEntry.bone.quaternion.copy(quaternion);
	poseBoneEntry.bone.scale.copy(scale);
}

export function sampleBoneExact(action: BOBJAction | null, boneName: string, frame: number): BonePoseDelta {
	const result = { x: 0, y: 0, z: 0, scaleX: 1, scaleY: 1, scaleZ: 1, rotateX: 0, rotateY: 0, rotateZ: 0 };

	const track = action?.bones.get(boneName);
	if (!track) return result;

	for (const channel of track.channels) {
		const value = sampleChannel(channel, frame);

		if (channel.path === "location") {
			if (channel.axis === 0) {
				result.x = value;
			} else if (channel.axis === 1) {
				result.y = value;
			} else {
				result.z = value;
			}
		} else if (channel.path === "rotation") {
			if (channel.axis === 0) {
				result.rotateX = value;
			} else if (channel.axis === 1) {
				result.rotateY = value;
			} else {
				result.rotateZ = value;
			}
		} else {
			if (channel.axis === 0) {
				result.scaleX = value;
			} else if (channel.axis === 1) {
				result.scaleY = value;
			} else {
				result.scaleZ = value;
			}
		}
	}

	return result;
}

export function applyActionToArmature(armature: BuiltArmature, action: BOBJAction | null, frame: number): void {
	for (const [name, entry] of armature.bonesByName) {
		poseBone(entry, sampleBoneExact(action, name, frame));
	}
}

export function buildGeometry(
	file: BOBJMeshFile,
	meshDef: BOBJMeshDef,
	boneNameToIndex: ReadonlyMap<string, number>
): BufferGeometry | null {
	if (meshDef.faces.length === 0) return null;

	const vertexCount = meshDef.faces.length * 3;

	const position = new Float32Array(vertexCount * 3);
	const normal = new Float32Array(vertexCount * 3);
	const uv = new Float32Array(vertexCount * 2);
	const skinIndex = new Uint16Array(vertexCount * 4);
	const skinWeight = new Float32Array(vertexCount * 4);

	let cursor = 0;

	for (const face of meshDef.faces) {
		for (const corner of face.corners) {
			if (corner.position >= 0) {
				const vertex = file.vertices[corner.position];

				position[cursor * 3] = vertex.x;
				position[cursor * 3 + 1] = vertex.y;
				position[cursor * 3 + 2] = vertex.z;

				const weights = vertex.weights.slice(0, 4);

				for (let i = 0; i < weights.length; i++) {
					const boneIndex = boneNameToIndex.get(weights[i].bone);
					skinIndex[cursor * 4 + i] = boneIndex ?? 0;
					skinWeight[cursor * 4 + i] = boneIndex === undefined ? 0 : weights[i].weight;
				}
			}

			if (corner.texCoord >= 0) {
				const [u, v] = file.uvs[corner.texCoord];

				uv[cursor * 2] = u;
				uv[cursor * 2 + 1] = v;
			}

			if (corner.normal >= 0) {
				const [nx, ny, nz] = file.normals[corner.normal];

				normal[cursor * 3] = nx;
				normal[cursor * 3 + 1] = ny;
				normal[cursor * 3 + 2] = nz;
			}

			cursor++;
		}
	}

	const geometry = new BufferGeometry();

	geometry.setAttribute("position", new BufferAttribute(position, 3));
	geometry.setAttribute("normal", new BufferAttribute(normal, 3));
	geometry.setAttribute("uv", new BufferAttribute(uv, 2));
	geometry.setAttribute("skinIndex", new BufferAttribute(skinIndex, 4));
	geometry.setAttribute("skinWeight", new BufferAttribute(skinWeight, 4));

	return geometry;
}

export function buildSkinnedMesh(
	file: BOBJMeshFile,
	meshDef: BOBJMeshDef,
	armature: BuiltArmature,
	boneNameToIndex: ReadonlyMap<string, number>,
	material: Material,
	ownsSkeleton: boolean
): SkinnedMesh | null {
	const geometry = buildGeometry(file, meshDef, boneNameToIndex);
	if (!geometry) return null;

	const mesh = new SkinnedMesh(geometry, material);
	mesh.name = meshDef.name;

	if (ownsSkeleton) {
		for (const root of armature.roots) {
			mesh.add(root);
		}
	}

	mesh.updateMatrixWorld(true);
	mesh.bind(armature.skeleton);

	return mesh;
}
