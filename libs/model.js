import { BoxGeometry, BufferAttribute, DoubleSide, Euler, FrontSide, Group, Mesh, MeshStandardMaterial, Object3D, Quaternion, Texture, Vector2, Vector3, } from "three";
function setUVs(box, u, v, width, height, depth, textureWidth, textureHeight) {
    const toFaceVertices = (x1, y1, x2, y2) => [
        new Vector2(x1 / textureWidth, 1.0 - y2 / textureHeight),
        new Vector2(x2 / textureWidth, 1.0 - y2 / textureHeight),
        new Vector2(x2 / textureWidth, 1.0 - y1 / textureHeight),
        new Vector2(x1 / textureWidth, 1.0 - y1 / textureHeight),
    ];
    const top = toFaceVertices(u + depth, v, u + width + depth, v + depth);
    const bottom = toFaceVertices(u + width + depth, v, u + width * 2 + depth, v + depth);
    const left = toFaceVertices(u, v + depth, u + depth, v + depth + height);
    const front = toFaceVertices(u + depth, v + depth, u + width + depth, v + depth + height);
    const right = toFaceVertices(u + width + depth, v + depth, u + width + depth * 2, v + height + depth);
    const back = toFaceVertices(u + width + depth * 2, v + depth, u + width * 2 + depth * 2, v + height + depth);
    const uvAttr = box.attributes.uv;
    const uvRight = [right[3], right[2], right[0], right[1]];
    const uvLeft = [left[3], left[2], left[0], left[1]];
    const uvTop = [top[3], top[2], top[0], top[1]];
    const uvBottom = [bottom[0], bottom[1], bottom[3], bottom[2]];
    const uvFront = [front[3], front[2], front[0], front[1]];
    const uvBack = [back[3], back[2], back[0], back[1]];
    // Create a new array to hold the modified UV data
    const newUVData = [];
    // Iterate over the arrays and copy the data to uvData
    for (const uvArray of [uvRight, uvLeft, uvTop, uvBottom, uvFront, uvBack]) {
        for (const uv of uvArray) {
            newUVData.push(uv.x, uv.y);
        }
    }
    uvAttr.set(new Float32Array(newUVData));
    uvAttr.needsUpdate = true;
}
function setSkinUVs(box, u, v, width, height, depth) {
    setUVs(box, u, v, width, height, depth, 64, 64);
}
function setCapeUVs(box, u, v, width, height, depth) {
    setUVs(box, u, v, width, height, depth, 64, 32);
}
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
export class Bone extends Group {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "basePosition", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Vector3()
        });
        Object.defineProperty(this, "baseRotation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Euler()
        });
        Object.defineProperty(this, "originPosition", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Vector3()
        });
        Object.defineProperty(this, "originRotation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Euler()
        });
        Object.defineProperty(this, "offsetPosition", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Vector3()
        });
        Object.defineProperty(this, "offsetRotation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Euler()
        });
        Object.defineProperty(this, "originQuaternionValue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
    }
    setBasePosition(x, y, z) {
        this.basePosition.set(x, y, z);
    }
    setBaseRotation(x, y, z) {
        this.baseRotation.set(x, y, z);
    }
    setOriginPosition(x, y, z) {
        this.originPosition.set(x, y, z);
    }
    setOffsetPosition(x, y, z) {
        this.offsetPosition.set(x, y, z);
    }
    // used by poses that are expressed as quaternions (like swimming)
    setOriginQuaternion(q) {
        if (this.originQuaternionValue === null) {
            this.originQuaternionValue = new Quaternion();
        }
        this.originQuaternionValue.copy(q);
    }
    /**
     * Resets the rest-pose (base) position and rotation of this bone.
     */
    resetBase() {
        this.basePosition.set(0, 0, 0);
        this.baseRotation.set(0, 0, 0);
    }
    /**
     * Resets the origin position and rotation of this bone.
     */
    resetOrigin() {
        this.originPosition.set(0, 0, 0);
        this.originRotation.set(0, 0, 0);
        this.originQuaternionValue = null;
    }
    /**
     * Resets the offset position and rotation of this bone.
     */
    resetOffset() {
        this.offsetPosition.set(0, 0, 0);
        this.offsetRotation.set(0, 0, 0);
    }
    /**
     * Resets base + origin + offset all at once, and commits the result.
     */
    resetAll() {
        this.resetBase();
        this.resetOrigin();
        this.resetOffset();
        this.commit();
    }
    /**
     * Composes a base + origin + offset into the actual position and rotation of this bone.
     * This is the only place that writes to the underlying position/rotation/quaternion properties.
     */
    commit() {
        this.position.set(this.basePosition.x + this.originPosition.x + this.offsetPosition.x, this.basePosition.y + this.originPosition.y + this.offsetPosition.y, this.basePosition.z + this.originPosition.z + this.offsetPosition.z);
        const hasBaseRotation = this.baseRotation.x !== 0 || this.baseRotation.y !== 0 || this.baseRotation.z !== 0;
        if (this.originQuaternionValue !== null) {
            // origin is expressed as a quaternion (like swimming) offset is
            // still an Euler delta layered on top of it.
            Bone.tempQuatA.setFromEuler(this.offsetRotation);
            Bone.tempQuatB.copy(this.originQuaternionValue).multiply(Bone.tempQuatA);
            if (hasBaseRotation) {
                Bone.tempQuatA.setFromEuler(this.baseRotation);
                this.quaternion.copy(Bone.tempQuatA).multiply(Bone.tempQuatB);
            }
            else {
                this.quaternion.copy(Bone.tempQuatB);
            }
        }
        else {
            this.rotation.set(this.baseRotation.x + this.originRotation.x + this.offsetRotation.x, this.baseRotation.y + this.originRotation.y + this.offsetRotation.y, this.baseRotation.z + this.originRotation.z + this.offsetRotation.z);
        }
    }
}
// Reused across every Bone's commit() call to avoid a per-frame, per-bone
// allocation. This is safe as long as commit() finishes using them before
// returning (it does, and commit() never re-enters itself)
Object.defineProperty(Bone, "tempQuatA", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: new Quaternion()
});
Object.defineProperty(Bone, "tempQuatB", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: new Quaternion()
});
/**
 * Recursively commits every {@link Bone} in the given subtree (including the
 * root itself, if it is a Bone). Call order doesn't matter: each bone's
 * commit() only depends on its own base/origin/offset values, never on its
 * parent's committed transform.
 */
export function commitBones(root) {
    root.traverse(obj => {
        if (obj instanceof Bone) {
            obj.commit();
        }
    });
}
/**
 * Notice that innerLayer and outerLayer may NOT be the direct children of the Group.
 */
export class BodyPart extends Bone {
    constructor(innerLayer, outerLayer) {
        super();
        Object.defineProperty(this, "innerLayer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: innerLayer
        });
        Object.defineProperty(this, "outerLayer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: outerLayer
        });
        innerLayer.name = "inner";
        outerLayer.name = "outer";
    }
}
export class SkinObject extends Bone {
    constructor() {
        super();
        // body parts
        Object.defineProperty(this, "head", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "body", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "rightArm", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "leftArm", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "rightLeg", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "leftLeg", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "modelListeners", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        }); // called when model(slim property) is changed
        Object.defineProperty(this, "slim", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_map", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "layer1Material", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "layer1MaterialBiased", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "layer2Material", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "layer2MaterialBiased", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.layer1Material = new MeshStandardMaterial({
            side: FrontSide,
        });
        this.layer2Material = new MeshStandardMaterial({
            side: DoubleSide,
            transparent: true,
            alphaTest: 1e-5,
        });
        this.layer1MaterialBiased = this.layer1Material.clone();
        this.layer1MaterialBiased.polygonOffset = true;
        this.layer1MaterialBiased.polygonOffsetFactor = 1.0;
        this.layer1MaterialBiased.polygonOffsetUnits = 1.0;
        this.layer2MaterialBiased = this.layer2Material.clone();
        this.layer2MaterialBiased.polygonOffset = true;
        this.layer2MaterialBiased.polygonOffsetFactor = 1.0;
        this.layer2MaterialBiased.polygonOffsetUnits = 1.0;
        // Head
        const headBox = new BoxGeometry(8, 8, 8);
        setSkinUVs(headBox, 0, 0, 8, 8, 8);
        const headMesh = new Mesh(headBox, this.layer1Material);
        const head2Box = new BoxGeometry(9, 9, 9);
        setSkinUVs(head2Box, 32, 0, 8, 8, 8);
        const head2Mesh = new Mesh(head2Box, this.layer2Material);
        this.head = new BodyPart(headMesh, head2Mesh);
        this.head.name = "head";
        this.head.add(headMesh, head2Mesh);
        headMesh.position.y = 4;
        head2Mesh.position.y = 4;
        this.head.setBasePosition(0, 0, 0);
        this.add(this.head);
        // Body
        const bodyBox = new BoxGeometry(8, 12, 4);
        setSkinUVs(bodyBox, 16, 16, 8, 12, 4);
        const bodyMesh = new Mesh(bodyBox, this.layer1Material);
        const body2Box = new BoxGeometry(8.5, 12.5, 4.5);
        setSkinUVs(body2Box, 16, 32, 8, 12, 4);
        const body2Mesh = new Mesh(body2Box, this.layer2Material);
        this.body = new BodyPart(bodyMesh, body2Mesh);
        this.body.name = "body";
        this.body.add(bodyMesh, body2Mesh);
        this.body.setBasePosition(0, -6, 0);
        this.add(this.body);
        // Right Arm
        const rightArmBox = new BoxGeometry();
        const rightArmMesh = new Mesh(rightArmBox, this.layer1MaterialBiased);
        this.modelListeners.push(() => {
            rightArmMesh.scale.x = this.slim ? 3 : 4;
            rightArmMesh.scale.y = 12;
            rightArmMesh.scale.z = 4;
            setSkinUVs(rightArmBox, 40, 16, this.slim ? 3 : 4, 12, 4);
        });
        const rightArm2Box = new BoxGeometry();
        const rightArm2Mesh = new Mesh(rightArm2Box, this.layer2MaterialBiased);
        this.modelListeners.push(() => {
            rightArm2Mesh.scale.x = this.slim ? 3.5 : 4.5;
            rightArm2Mesh.scale.y = 12.5;
            rightArm2Mesh.scale.z = 4.5;
            setSkinUVs(rightArm2Box, 40, 32, this.slim ? 3 : 4, 12, 4);
        });
        const rightArmPivot = new Group();
        rightArmPivot.add(rightArmMesh, rightArm2Mesh);
        this.modelListeners.push(() => {
            rightArmPivot.position.x = this.slim ? -0.5 : -1;
        });
        rightArmPivot.position.y = -4;
        this.rightArm = new BodyPart(rightArmMesh, rightArm2Mesh);
        this.rightArm.name = "rightArm";
        this.rightArm.add(rightArmPivot);
        this.rightArm.setBasePosition(-5, 4, 0);
        this.body.add(this.rightArm);
        // Left Arm
        const leftArmBox = new BoxGeometry();
        const leftArmMesh = new Mesh(leftArmBox, this.layer1MaterialBiased);
        this.modelListeners.push(() => {
            leftArmMesh.scale.x = this.slim ? 3 : 4;
            leftArmMesh.scale.y = 12;
            leftArmMesh.scale.z = 4;
            setSkinUVs(leftArmBox, 32, 48, this.slim ? 3 : 4, 12, 4);
        });
        const leftArm2Box = new BoxGeometry();
        const leftArm2Mesh = new Mesh(leftArm2Box, this.layer2MaterialBiased);
        this.modelListeners.push(() => {
            leftArm2Mesh.scale.x = this.slim ? 3.5 : 4.5;
            leftArm2Mesh.scale.y = 12.5;
            leftArm2Mesh.scale.z = 4.5;
            setSkinUVs(leftArm2Box, 48, 48, this.slim ? 3 : 4, 12, 4);
        });
        const leftArmPivot = new Group();
        leftArmPivot.add(leftArmMesh, leftArm2Mesh);
        this.modelListeners.push(() => {
            leftArmPivot.position.x = this.slim ? 0.5 : 1;
        });
        leftArmPivot.position.y = -4;
        this.leftArm = new BodyPart(leftArmMesh, leftArm2Mesh);
        this.leftArm.name = "leftArm";
        this.leftArm.add(leftArmPivot);
        this.leftArm.setBasePosition(5, 4, 0);
        this.body.add(this.leftArm);
        // Right Leg
        const rightLegBox = new BoxGeometry(4, 12, 4);
        setSkinUVs(rightLegBox, 0, 16, 4, 12, 4);
        const rightLegMesh = new Mesh(rightLegBox, this.layer1MaterialBiased);
        const rightLeg2Box = new BoxGeometry(4.5, 12.5, 4.5);
        setSkinUVs(rightLeg2Box, 0, 32, 4, 12, 4);
        const rightLeg2Mesh = new Mesh(rightLeg2Box, this.layer2MaterialBiased);
        const rightLegPivot = new Group();
        rightLegPivot.add(rightLegMesh, rightLeg2Mesh);
        rightLegPivot.position.y = -6;
        this.rightLeg = new BodyPart(rightLegMesh, rightLeg2Mesh);
        this.rightLeg.name = "rightLeg";
        this.rightLeg.add(rightLegPivot);
        this.rightLeg.setBasePosition(-1.9, -12, -0.1);
        this.add(this.rightLeg);
        // Left Leg
        const leftLegBox = new BoxGeometry(4, 12, 4);
        setSkinUVs(leftLegBox, 16, 48, 4, 12, 4);
        const leftLegMesh = new Mesh(leftLegBox, this.layer1MaterialBiased);
        const leftLeg2Box = new BoxGeometry(4.5, 12.5, 4.5);
        setSkinUVs(leftLeg2Box, 0, 48, 4, 12, 4);
        const leftLeg2Mesh = new Mesh(leftLeg2Box, this.layer2MaterialBiased);
        const leftLegPivot = new Group();
        leftLegPivot.add(leftLegMesh, leftLeg2Mesh);
        leftLegPivot.position.y = -6;
        this.leftLeg = new BodyPart(leftLegMesh, leftLeg2Mesh);
        this.leftLeg.name = "leftLeg";
        this.leftLeg.add(leftLegPivot);
        this.leftLeg.setBasePosition(1.9, -12, -0.1);
        this.add(this.leftLeg);
        this.modelType = "default";
        this.commitPose();
    }
    get map() {
        return this._map;
    }
    set map(newMap) {
        this._map = newMap;
        this.layer1Material.map = newMap;
        this.layer1Material.needsUpdate = true;
        this.layer1MaterialBiased.map = newMap;
        this.layer1MaterialBiased.needsUpdate = true;
        this.layer2Material.map = newMap;
        this.layer2Material.needsUpdate = true;
        this.layer2MaterialBiased.map = newMap;
        this.layer2MaterialBiased.needsUpdate = true;
    }
    get modelType() {
        return this.slim ? "slim" : "default";
    }
    set modelType(value) {
        this.slim = value === "slim";
        this.modelListeners.forEach(listener => listener());
    }
    getBodyParts() {
        return this.children.filter(it => it instanceof BodyPart);
    }
    // all bones in order
    get bones() {
        return [this.head, this.body, this.rightArm, this.leftArm, this.rightLeg, this.leftLeg];
    }
    setInnerLayerVisible(value) {
        this.getBodyParts().forEach(part => (part.innerLayer.visible = value));
    }
    setOuterLayerVisible(value) {
        this.getBodyParts().forEach(part => (part.outerLayer.visible = value));
    }
    commitPose() {
        for (const bone of this.bones) {
            bone.commit();
        }
    }
    resetJoints() {
        this.traverse(obj => {
            if (obj instanceof Bone) {
                obj.resetOrigin();
                obj.resetOffset();
            }
        });
        this.commitPose();
    }
}
export class CapeObject extends Bone {
    constructor() {
        super();
        Object.defineProperty(this, "cape", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "material", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.material = new MeshStandardMaterial({
            side: DoubleSide,
            transparent: true,
            alphaTest: 1e-5,
        });
        // +z (front) - inside of cape
        // -z (back) - outside of cape
        const capeBox = new BoxGeometry(10, 16, 1);
        setCapeUVs(capeBox, 0, 0, 10, 16, 1);
        this.cape = new Mesh(capeBox, this.material);
        this.cape.position.y = -8;
        this.cape.position.z = 0.5;
        this.add(this.cape);
    }
    get map() {
        return this.material.map;
    }
    set map(newMap) {
        this.material.map = newMap;
        this.material.needsUpdate = true;
    }
}
export class ElytraObject extends Bone {
    constructor() {
        super();
        Object.defineProperty(this, "leftWing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "rightWing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "material", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.material = new MeshStandardMaterial({
            side: DoubleSide,
            transparent: true,
            alphaTest: 1e-5,
        });
        const leftWingBox = new BoxGeometry(12, 22, 4);
        setCapeUVs(leftWingBox, 22, 0, 10, 20, 2);
        const leftWingMesh = new Mesh(leftWingBox, this.material);
        leftWingMesh.position.x = -5;
        leftWingMesh.position.y = -10;
        leftWingMesh.position.z = -1;
        this.leftWing = new Group();
        this.leftWing.add(leftWingMesh);
        this.add(this.leftWing);
        const rightWingBox = new BoxGeometry(12, 22, 4);
        setCapeUVs(rightWingBox, 22, 0, 10, 20, 2);
        const rightWingMesh = new Mesh(rightWingBox, this.material);
        rightWingMesh.scale.x = -1;
        rightWingMesh.position.x = 5;
        rightWingMesh.position.y = -10;
        rightWingMesh.position.z = -1;
        this.rightWing = new Group();
        this.rightWing.add(rightWingMesh);
        this.add(this.rightWing);
        this.leftWing.position.x = 5;
        this.leftWing.rotation.x = 0.2617994;
        this.resetJoints();
    }
    resetJoints() {
        this.leftWing.rotation.y = 0.01; // to avoid z-fighting
        this.leftWing.rotation.z = 0.2617994;
        this.updateRightWing();
    }
    /**
     * Mirrors the position & rotation of left wing,
     * and apply them to the right wing.
     */
    updateRightWing() {
        this.rightWing.position.x = -this.leftWing.position.x;
        this.rightWing.position.y = this.leftWing.position.y;
        this.rightWing.rotation.x = this.leftWing.rotation.x;
        this.rightWing.rotation.y = -this.leftWing.rotation.y;
        this.rightWing.rotation.z = -this.leftWing.rotation.z;
    }
    get map() {
        return this.material.map;
    }
    set map(newMap) {
        this.material.map = newMap;
        this.material.needsUpdate = true;
    }
}
export class WingsObject extends Bone {
    constructor() {
        super();
        Object.defineProperty(this, "leftWing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "rightWing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "material", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.material = new MeshStandardMaterial({
            side: DoubleSide,
            transparent: true,
            alphaTest: 1e-5,
        });
        this.leftWing = this.createWing();
        this.rightWing = this.createWing();
        this.rightWing.scale.x = -1;
        this.add(this.leftWing);
        this.add(this.rightWing);
        this.leftWing.position.x = -12;
        this.leftWing.position.y = -13;
        this.leftWing.position.z = -4;
        this.resetJoints();
    }
    createWing() {
        const wingGroup = new Group();
        wingGroup.rotation.order = "ZYX";
        const wingBoneBox = new BoxGeometry(56, 8, 8);
        setUVs(wingBoneBox, 112, 88, 56, 8, 8, 256, 256);
        const wingBone = new Mesh(wingBoneBox, this.material);
        wingBone.position.set(-28, 0, 0);
        const wingSkinBox = new BoxGeometry(56, 0, 56);
        setUVs(wingSkinBox, -56, 88, 56, 0, 56, 256, 256);
        const wingSkin = new Mesh(wingSkinBox, this.material);
        wingSkin.position.set(-28, 0, -30);
        wingGroup.add(wingBone, wingSkin);
        const wingTipGroup = new Group();
        wingTipGroup.name = "wingTip";
        wingTipGroup.rotation.order = "ZYX";
        wingTipGroup.position.set(-56, 0, 0);
        const wingtipBoneBox = new BoxGeometry(56, 4, 4);
        setUVs(wingtipBoneBox, 112, 136, 56, 4, 4, 256, 256);
        const wingtipBone = new Mesh(wingtipBoneBox, this.material);
        wingtipBone.position.set(-28, 0, 0);
        const wingtipSkinBox = new BoxGeometry(56, 0, 56);
        setUVs(wingtipSkinBox, -56, 144, 56, 0, 56, 256, 256);
        const wingtipSkin = new Mesh(wingtipSkinBox, this.material);
        wingtipSkin.position.set(-28, 0, -30);
        wingTipGroup.add(wingtipBone, wingtipSkin);
        wingGroup.add(wingTipGroup);
        wingGroup.position.set(-12, -5, -2);
        return wingGroup;
    }
    resetJoints() {
        this.leftWing.rotation.x = -0.325;
        this.leftWing.rotation.y = 0.01;
        this.leftWing.rotation.z = 0.1;
        this.updateRightWing();
    }
    updateRightWing() {
        this.rightWing.position.x = -this.leftWing.position.x;
        this.rightWing.position.y = this.leftWing.position.y;
        this.rightWing.rotation.x = this.leftWing.rotation.x;
        this.rightWing.rotation.y = -this.leftWing.rotation.y;
        this.rightWing.rotation.z = -this.leftWing.rotation.z;
        const leftWingTip = this.leftWing.getObjectByName("wingTip");
        const rightWingTip = this.rightWing.getObjectByName("wingTip");
        if (leftWingTip && rightWingTip) {
            rightWingTip.rotation.z = leftWingTip.rotation.z;
        }
    }
    get map() {
        return this.material.map;
    }
    set map(newMap) {
        this.material.map = newMap;
        this.material.needsUpdate = true;
    }
}
export class EarsObject extends Bone {
    constructor() {
        super();
        Object.defineProperty(this, "rightEar", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "leftEar", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "material", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.material = new MeshStandardMaterial({
            side: FrontSide,
        });
        const earBox = new BoxGeometry(8, 8, 4 / 3);
        setUVs(earBox, 0, 0, 6, 6, 1, 14, 7);
        this.rightEar = new Mesh(earBox, this.material);
        this.rightEar.name = "rightEar";
        this.rightEar.position.x = -6;
        this.add(this.rightEar);
        this.leftEar = new Mesh(earBox, this.material);
        this.leftEar.name = "leftEar";
        this.leftEar.position.x = 6;
        this.add(this.leftEar);
    }
    get map() {
        return this.material.map;
    }
    set map(newMap) {
        this.material.map = newMap;
        this.material.needsUpdate = true;
    }
}
export class PlayerObject extends Group {
    constructor() {
        super();
        Object.defineProperty(this, "skin", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "cape", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "elytra", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "wings", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "ears", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.skin = new SkinObject();
        this.skin.name = "skin";
        this.skin.position.y = 8;
        this.add(this.skin);
        this.cape = new CapeObject();
        this.cape.name = "cape";
        this.cape.position.y = 6;
        this.cape.position.z = -2;
        this.cape.rotation.y = Math.PI;
        this.skin.body.add(this.cape);
        this.elytra = new ElytraObject();
        this.elytra.name = "elytra";
        this.elytra.position.y = 6;
        this.elytra.position.z = -2;
        this.elytra.visible = false;
        this.skin.body.add(this.elytra);
        this.wings = new WingsObject();
        this.wings.name = "wings";
        this.wings.position.y = 6.5;
        this.wings.position.z = -2;
        this.wings.scale.set(0.12, 0.12, 0.12);
        this.wings.rotation.x = 0.2617994;
        this.wings.visible = false;
        this.skin.body.add(this.wings);
        this.ears = new EarsObject();
        this.ears.name = "ears";
        this.ears.position.y = 10;
        this.ears.position.z = 2 / 3;
        this.ears.visible = false;
        this.skin.head.add(this.ears);
    }
    get backEquipment() {
        if (this.cape.visible) {
            return "cape";
        }
        else if (this.elytra.visible) {
            return "elytra";
        }
        else if (this.wings.visible) {
            return "wings";
        }
        else {
            return null;
        }
    }
    set backEquipment(value) {
        this.cape.visible = value === "cape";
        this.elytra.visible = value === "elytra";
        this.wings.visible = value === "wings";
    }
    resetJoints() {
        this.skin.resetJoints();
        this.cape.rotation.x = 0;
        this.cape.rotation.y = Math.PI;
        this.cape.rotation.z = 0;
        this.cape.position.y = 6;
        this.cape.position.z = -2;
        this.elytra.position.y = 6;
        this.elytra.position.z = -2;
        this.elytra.rotation.x = 0;
        this.elytra.resetJoints();
        this.wings.position.y = 6;
        this.wings.position.z = -2;
        this.wings.rotation.x = 0.2617994;
        this.wings.resetJoints();
    }
}
//# sourceMappingURL=model.js.map