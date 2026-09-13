import { DoubleSide, Euler, Group, MeshBasicMaterial, Object3D, SkinnedMesh, Texture } from "three";
import { applyHandAttachment, getHandAttachment } from "./config.js";
import { applyActionToArmature, buildArmatureSkeleton, buildSkinnedMesh } from "./skinned.js";
import { degToRad } from "../../math.js";
export const BOBJ_TO_SKINVIEW_SCALE = 16;
export const BOBJ_FEET_Y_OFFSET = -16;
const COSMETIC_ATTACHMENT = {
    ry: 180,
    rx: -12,
    z: 0.06,
};
export class EmoteBOBJRig {
    constructor(file, config) {
        Object.defineProperty(this, "object", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "armature", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "meshes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "bodyMaterial", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "propMaterials", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "cosmetics", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "_currentAction", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
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
    _buildAdditionalMeshes(file, config, boneNameToIndex) {
        for (const [name, meshConfig] of Object.entries(config.meshes)) {
            if (name === config.primaryMesh)
                continue;
            const meshDef = file.meshes.get(name);
            if (!meshDef)
                continue;
            const material = new MeshBasicMaterial();
            const mesh = buildSkinnedMesh(file, meshDef, this.armature, boneNameToIndex, material, false);
            if (!mesh)
                continue;
            material.needsUpdate = true;
            this.propMaterials.set(name, material);
            mesh.visible = meshConfig.visible ?? true;
            this.object.add(mesh);
            this.meshes.set(name, mesh);
        }
    }
    setBodyTexture(map) {
        this.bodyMaterial.map = map;
        this.bodyMaterial.needsUpdate = true;
        if (map) {
            map.needsUpdate = true;
        }
    }
    setMeshTexture(meshName, map) {
        const material = this.propMaterials.get(meshName);
        if (!material)
            return;
        material.map = map;
        material.needsUpdate = true;
    }
    getMesh(meshName) {
        return this.meshes.get(meshName);
    }
    setMeshVisible(meshName, visible) {
        const mesh = this.meshes.get(meshName);
        if (mesh)
            mesh.visible = visible;
    }
    getBone(boneName) {
        return this.armature.bonesByName.get(boneName)?.bone;
    }
    attachToHand(object, hand) {
        const attachment = getHandAttachment(this.config, hand);
        if (!attachment)
            return false;
        const bone = this.getBone(attachment.boneName);
        if (!bone)
            return false;
        applyHandAttachment(object, attachment.config);
        bone.add(object);
        return true;
    }
    getCosmeticAnchor(boneName) {
        let anchor = this.cosmetics.get(boneName);
        if (anchor)
            return anchor;
        const bone = this.getBone(boneName);
        if (!bone)
            return null;
        anchor = new Group();
        anchor.name = `${boneName}CosmeticAnchor`;
        const attachment = this.config.cosmetic ?? COSMETIC_ATTACHMENT;
        anchor.position.set(attachment.x ?? 0, attachment.y ?? 0, attachment.z ?? 0);
        anchor.rotation.copy(new Euler(degToRad(attachment.rx ?? 0), degToRad(attachment.ry ?? 0), degToRad(attachment.rz ?? 0)));
        const inverseScale = 1 / (BOBJ_TO_SKINVIEW_SCALE * this.config.scale);
        anchor.scale.setScalar(inverseScale * (attachment.sx ?? 1));
        bone.add(anchor);
        this.cosmetics.set(boneName, anchor);
        return anchor;
    }
    attachCosmetic(object, boneName = this.config.body ?? "low_body") {
        const anchor = this.getCosmeticAnchor(boneName);
        if (!anchor)
            return false;
        anchor.add(object);
        return true;
    }
    applyAction(action, frame) {
        this._currentAction = action;
        applyActionToArmature(this.armature, action, frame);
    }
    get currentAction() {
        return this._currentAction;
    }
}
//# sourceMappingURL=rig.js.map