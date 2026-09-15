import { DoubleSide, Euler, Group, MeshBasicMaterial, Object3D, SkinnedMesh, Texture } from "three";

import type { BOBJAction } from "./index.js";
import type { AttachmentConfig, PlayerRigConfig } from "./config.js";
import { applyHandAttachment, getHandAttachment, type Hand } from "./config.js";
import type { BOBJMeshFile } from "./mesh.js";
import { applyActionToArmature, buildArmatureSkeleton, buildSkinnedMesh, type BuiltArmature } from "./skinned.js";
import { degToRad } from "../../math.js";

export const BOBJ_TO_SKINVIEW_SCALE = 16;
export const BOBJ_FEET_Y_OFFSET = -16;

const COSMETIC_ATTACHMENT: AttachmentConfig = {
	ry: 180,
	rx: -12,
	z: 0.06,
};

export class EmoteBOBJRig {
	readonly object: Group;
	readonly config: PlayerRigConfig;

	private readonly armature: BuiltArmature;
	private readonly meshes = new Map<string, SkinnedMesh>();
	private readonly bodyMaterial: MeshBasicMaterial;
	private readonly propMaterials = new Map<string, MeshBasicMaterial>();

	private readonly cosmetics = new Map<string, Group>();

	private _currentAction: BOBJAction | null = null;

	constructor(file: BOBJMeshFile, config: PlayerRigConfig) {
		this.config = config;

		const bodyMeshDef = file.meshes.get(config.primaryMesh);
		if (!bodyMeshDef) {
			throw new Error(`BOBJ rig config references unknown primary mesh "${config.primaryMesh}"`);
		}

		const armatureName = bodyMeshDef.armatureName;
		const armatureDef = armatureName ? file.armatures.get(armatureName) : undefined;

		if (!armatureDef) {
			throw new Error(`BOBJ rig's primary mesh has no associated armature ("${bodyMeshDef.armatureName}")`);
		}

		this.armature = buildArmatureSkeleton(armatureDef);

		const boneNameToIndex = new Map(this.armature.bones.map((bone, index) => [bone.name, index]));

		this.bodyMaterial = new MeshBasicMaterial({
			side: DoubleSide,
			transparent: true,
			alphaTest: 1e-5,
		});

		const bodyMesh = buildSkinnedMesh(file, bodyMeshDef, this.armature, boneNameToIndex, this.bodyMaterial, true);

		if (!bodyMesh) {
			throw new Error(`BOBJ rig's primary mesh "${config.primaryMesh}" has no geometry`);
		}

		this.meshes.set(config.primaryMesh, bodyMesh);

		this.object = new Group();
		this.object.name = "emoteBobjRig";
		this.object.add(bodyMesh);
		this.object.scale.setScalar(BOBJ_TO_SKINVIEW_SCALE * config.scale);
		this.object.position.set(0, BOBJ_FEET_Y_OFFSET, 0);

		this._buildAdditionalMeshes(file, config, boneNameToIndex);
	}

	private _buildAdditionalMeshes(
		file: BOBJMeshFile,
		config: PlayerRigConfig,
		boneNameToIndex: Map<string, number>
	): void {
		for (const [name, meshConfig] of Object.entries(config.meshes)) {
			if (name === config.primaryMesh) continue;

			const meshDef = file.meshes.get(name);
			if (!meshDef) continue;

			const material = new MeshBasicMaterial();
			const mesh = buildSkinnedMesh(file, meshDef, this.armature, boneNameToIndex, material, false);

			if (!mesh) continue;

			material.needsUpdate = true;
			this.propMaterials.set(name, material);

			mesh.visible = meshConfig.visible ?? true;
			this.object.add(mesh);
			this.meshes.set(name, mesh);
		}
	}

	setBodyTexture(map: Texture | null): void {
		this.bodyMaterial.map = map;
		this.bodyMaterial.needsUpdate = true;

		if (map) {
			map.needsUpdate = true;
		}
	}

	setMeshTexture(meshName: string, map: Texture | null): void {
		const material = this.propMaterials.get(meshName);
		if (!material) return;

		material.map = map;
		material.needsUpdate = true;
	}

	getMesh(meshName: string): SkinnedMesh | undefined {
		return this.meshes.get(meshName);
	}

	setMeshVisible(meshName: string, visible: boolean): void {
		const mesh = this.meshes.get(meshName);
		if (mesh) mesh.visible = visible;
	}

	getBone(boneName: string): Object3D | undefined {
		return this.armature.bonesByName.get(boneName)?.bone;
	}

	attachToHand(object: Object3D, hand: Hand): boolean {
		const attachment = getHandAttachment(this.config, hand);
		if (!attachment) return false;

		const bone = this.getBone(attachment.boneName);
		if (!bone) return false;

		applyHandAttachment(object, attachment.config);
		bone.add(object);

		return true;
	}

	private getCosmeticAnchor(boneName: string): Group | null {
		let anchor = this.cosmetics.get(boneName);
		if (anchor) return anchor;

		const bone = this.getBone(boneName);
		if (!bone) return null;

		anchor = new Group();
		anchor.name = `${boneName}CosmeticAnchor`;

		const attachment = this.config.cosmetic ?? COSMETIC_ATTACHMENT;

		anchor.position.set(attachment.x ?? 0, attachment.y ?? 0, attachment.z ?? 0);
		anchor.rotation.copy(
			new Euler(degToRad(attachment.rx ?? 0), degToRad(attachment.ry ?? 0), degToRad(attachment.rz ?? 0))
		);

		const inverseScale = 1 / (BOBJ_TO_SKINVIEW_SCALE * this.config.scale);
		anchor.scale.setScalar(inverseScale * (attachment.sx ?? 1));

		bone.add(anchor);

		this.cosmetics.set(boneName, anchor);

		return anchor;
	}

	attachCosmetic(object: Object3D, boneName: string = this.config.body ?? "low_body"): boolean {
		const anchor = this.getCosmeticAnchor(boneName);
		if (!anchor) return false;

		anchor.add(object);

		return true;
	}

	applyAction(action: BOBJAction | null, frame: number): void {
		this._currentAction = action;
		applyActionToArmature(this.armature, action, frame);
	}

	get currentAction(): BOBJAction | null {
		return this._currentAction;
	}
}
