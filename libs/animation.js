import { PlayerObject } from "./model.js";
import { easeInOutSine, easingArc, clamp01, sampleEulerKeyframes } from "./math.js";
import { swimLeftArm, swimRightArm } from "./keyframes.js";
import { SIXTEEN } from "./consts.js";
const DefaultActions = {
    jump: true,
    swing: true,
    crouch: true,
};
const CapeAngle = (10.8 * Math.PI) / 180;
const ArmZIdle = Math.PI * 0.02;
const ArmXIdle = Math.PI * 0.01;
const ArmZSwing = 0.01 * Math.PI + 0.06;
/**
 * An animation which can be played on a {@link PlayerObject}.
 *
 * This is an abstract class. Subclasses of this class would implement
 * particular animations.
 */
export class PlayerAnimation {
    /**
     * What the animation supports.
     */
    get supportedActions() {
        return DefaultActions;
    }
    constructor() {
        /**
         * The speed of the animation.
         *
         * @defaultValue `1.0`
         */
        Object.defineProperty(this, "speed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1.0
        });
        /**
         * Whether the animation is paused.
         *
         * @defaultValue `false`
         */
        Object.defineProperty(this, "paused", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /**
         * The current progress of the animation.
         */
        Object.defineProperty(this, "progress", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /**
         * Which player actions are currently allowed to be started.
         *
         * @defaultValue `{ jump: true, swing: true, crouch: true }`
         * @see {@link AllowedActions}
         */
        Object.defineProperty(this, "allowedActions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: { ...DefaultActions }
        });
        /**
         * The name of the currently active animation class.
         */
        Object.defineProperty(this, "_activeAnimation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // Swings
        Object.defineProperty(this, "_swingActive", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_swingTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_swingDuration", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0.28
        });
        // Jump
        Object.defineProperty(this, "_jumpActive", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_jumpTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_jumpDuration", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0.7
        });
        Object.defineProperty(this, "_jumpHeight", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: SIXTEEN
        });
        // Crouch
        Object.defineProperty(this, "_crouchActive", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_states", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set(["Idle"])
        });
        Object.defineProperty(this, "_statesSnapshot", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_nextId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_addons", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        this._activeAnimation = this.constructor.name;
    }
    setState(state, active) {
        if (active) {
            this._states.delete("Idle");
            this._states.add(state);
        }
        else {
            this._states.delete(state);
            // if _states is empty, add an idle state
            if (this._states.size === 0) {
                this._states.add("Idle");
            }
        }
        this._statesSnapshot = null;
    }
    /**
     * Which modifier states are currently active.
     */
    get states() {
        if (this._statesSnapshot === null) {
            this._statesSnapshot = new Set(this._states);
        }
        return this._statesSnapshot;
    }
    /**
     * Whether a given modifier state is currently active.
     */
    hasState(state) {
        return this._states.has(state);
    }
    /**
     * Adds a new animation based on the original animation and returns its id.
     *
     * @param fn - The animation function to be added, which takes a player object and progress value.When calling addAnimation. progress is 0.
     * @returns The id of the newly added animation.
     *
     * @example
     * Rotate the player while playing the idle animation.
     * ```
     * skinViewer.animation = new skinview3d.IdleAnimation();
     * skinViewer.animation.addAnimation((player, progress)=>player.rotation.y = progress);
     * ```
     */
    addAnimation(fn) {
        const id = this._nextId++;
        this._addons.set(id, { fn, origin: this.progress });
        return id;
    }
    /**
     * Removes all custom animations added through {@link addAnimation}.
     */
    clearAnimations() {
        this._addons.clear();
    }
    /**
     * Removes an animation created by the addAnimation method by its id.
     *
     * If the id is undefined, this method will do nothing.
     *
     * @param id - The id of the animation to remove.
     *
     * @example
     * Rotate the player then stop and reset the rotation after 1s.
     * ```
     * var r;
     * r=skinViewer.animation.addAnimation((pl, pr) => {
     * 	pl.rotation.x = pr;
     * });
     * setTimeout(()=>{
     * 	skinViewer.animation.addAnimation((pl, pr,id) => {
     * 		pl.rotation.x=0;
     * 		skinViewer.animation.removeAnimation(id);
     * 	})
     * 	skinViewer.animation.removeAnimation(r);
     * },1000)
     * ```
     */
    removeAnimation(id) {
        if (id !== undefined) {
            this._addons.delete(id);
        }
    }
    /**
     * Plays the animation, and update the progress.
     *
     * The elapsed time `deltaTime` will be scaled by {@link speed}.
     * If {@link paused} is `true`, this method will do nothing.
     *
     * @param player - the player object
     * @param deltaTime - time elapsed since last call
     */
    update(player, deltaTime) {
        if (this.paused)
            return;
        const delta = deltaTime * this.speed;
        const bones = player.skin.bones;
        player.cosmeticTimer += delta;
        for (const bone of bones) {
            bone.resetOrigin();
            bone.resetOffset();
        }
        this.animate(player, delta);
        this.animateJump(player, delta);
        this.animateSwing(player, delta);
        this.animateCrouch(player);
        player.skin.commitPose();
        // addon callbacks run last and act directly on the player object (not bones), for example rotating
        for (const [id, addon] of this._addons) {
            addon.fn(player, this.progress - addon.origin, id);
        }
        this.progress += delta;
    }
    animateWings(player) {
        const wingPosition = player.cosmeticTimer * Math.PI;
        player.dragonWings.leftWing.rotation.x = -0.125 - Math.cos(wingPosition) * 0.2;
        player.dragonWings.leftWing.rotation.y = -0.75;
        player.dragonWings.leftWing.rotation.z = -((Math.sin(wingPosition) + 0.125) * 0.8);
        player.dragonWings.leftWingTip.rotation.z = -((Math.sin(wingPosition + 2.0) + 0.5) * 0.75);
        player.dragonWings.updateRightWing();
    }
    get isIdle() {
        return this._states.has("Idle");
    }
    playJump() {
        if (!this.allowedActions.jump)
            return;
        if (!this.supportedActions.jump)
            return;
        if (this._jumpActive)
            return;
        this._jumpActive = true;
        this._jumpTime = 0;
        this.setState("Jumping", true);
    }
    get isJumping() {
        return this._jumpActive;
    }
    animateJump(player, delta) {
        if (!this._jumpActive)
            return;
        this._jumpTime += delta;
        const progress = clamp01(this._jumpTime / this._jumpDuration);
        player.position.y = easingArc(progress, this._jumpHeight, easeInOutSine);
        if (progress >= 1) {
            this._jumpActive = false;
            this._jumpTime = 0;
            player.position.y = 0;
            this.setState("Jumping", false);
        }
    }
    playSwing() {
        if (!this.allowedActions.swing)
            return;
        if (!this.supportedActions.swing)
            return;
        if (this._swingActive)
            return;
        this._swingActive = true;
        this._swingTime = 0;
        this.setState("Swinging", true);
    }
    get isSwinging() {
        return this._swingActive;
    }
    animateSwing(player, delta) {
        if (!this._swingActive)
            return;
        this._swingTime += delta;
        const progress = clamp01(this._swingTime / this._swingDuration);
        const t = this._swingTime * 16;
        const envelope = Math.sin(progress * Math.PI);
        player.skin.body.offsetRotation.y += -Math.cos(t) * 0.2 * envelope;
        player.skin.rightArm.offsetRotation.x = (-0.9 + 0.6 * Math.sin(t + Math.PI)) * envelope;
        player.skin.rightArm.offsetRotation.z = (-Math.cos(t) * 0.4 + ArmZSwing) * envelope;
        player.skin.leftArm.offsetRotation.x += Math.sin(t + Math.PI) * 0.077 * envelope;
        player.skin.leftArm.offsetPosition.z += Math.cos(t) * 0.6 * envelope;
        player.skin.leftArm.offsetPosition.x += -Math.cos(t) * 0.1 * envelope;
        if (progress >= 1) {
            this._swingActive = false;
            this._swingTime = 0;
            this.setState("Swinging", false);
        }
    }
    playCrouch(crouch = !this._crouchActive) {
        if (!this.allowedActions.crouch)
            return;
        if (!this.supportedActions.crouch)
            return;
        if (this._crouchActive === crouch)
            return;
        this._crouchActive = crouch;
        this.setState("Crouching", crouch);
    }
    get isCrouching() {
        return this._crouchActive;
    }
    animateCrouch(player) {
        if (!this._crouchActive)
            return;
        player.skin.body.offsetRotation.x += 0.45;
        player.skin.body.offsetPosition.y -= 2.1;
        player.skin.body.offsetPosition.z += -2.12;
        player.skin.head.offsetPosition.y -= 3.62;
        player.skin.leftLeg.offsetPosition.z -= 3.45;
        player.skin.rightLeg.offsetPosition.z -= 3.45;
        player.skin.leftArm.offsetRotation.x += Math.PI - 3.2;
        player.skin.rightArm.offsetRotation.x += Math.PI - 3.2;
        player.cape.rotation.x = CapeAngle;
        player.cape.position.z = -2;
        player.elytra.position.copy(player.cape.position);
        player.elytra.rotation.x = player.cape.rotation.x - CapeAngle;
        player.elytra.leftWing.rotation.z = 0.72;
        player.elytra.leftWing.rotation.y = 0.3;
        player.elytra.updateRightWing();
        player.dragonWings.position.y = 5;
        player.dragonWings.position.z = -2;
        player.dragonWings.rotation.x = 0.2617994 - player.skin.body.offsetRotation.x;
    }
    getState() {
        return {
            states: this.states,
            progress: this.progress,
        };
    }
    interruptForAction() {
        return null;
    }
    stop() {
        this._swingActive = false;
        this._swingTime = 0;
        this._jumpActive = false;
        this._jumpTime = 0;
        this._crouchActive = false;
        this.setState("Swinging", false);
        this.setState("Jumping", false);
        this.setState("Crouching", false);
    }
    reset() {
        this.stop();
        this.progress = 0;
        this._nextId = 0;
        this._addons.clear();
    }
}
/**
 * Wraps a plain function as a {@link PlayerAnimation}.
 *
 * @example
 * ```ts
 * new FunctionAnimation((player, progress) => {
 *   player.rotation.y = progress;
 * })
 * ```
 */
export class FunctionAnimation extends PlayerAnimation {
    constructor(fn) {
        super();
        Object.defineProperty(this, "fn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: fn
        });
    }
    animate(player, delta) {
        this.fn(player, this.progress, delta);
    }
}
export class IdleAnimation extends PlayerAnimation {
    animate(player) {
        const crouchOffset = this.hasState("Crouching") ? Math.PI - 2.8 : 0;
        const t = this.progress * 2;
        const sin = Math.sin(t);
        player.skin.leftArm.originRotation.x = crouchOffset;
        player.skin.rightArm.originRotation.x = crouchOffset;
        player.skin.leftArm.originRotation.z = sin * 0.03 + ArmZIdle;
        player.skin.rightArm.originRotation.z = -sin * 0.03 - ArmZIdle;
        player.skin.leftArm.originRotation.x = sin * 0.03 + ArmXIdle;
        player.skin.rightArm.originRotation.x = -sin * 0.03 - ArmXIdle;
        player.cape.rotation.x = CapeAngle;
        this.animateWings(player);
    }
}
export class WalkAnimation extends PlayerAnimation {
    get supportedActions() {
        return {
            jump: false,
            swing: true,
            crouch: true,
        };
    }
    animate(player) {
        const crouching = this.hasState("Crouching");
        const crouchMultiplier = crouching ? 0.6 : 1.2;
        const t = this.progress * (crouching ? 6 : 10);
        const sin = Math.sin(t);
        player.skin.leftLeg.originRotation.x = sin * 0.5 * crouchMultiplier;
        player.skin.rightLeg.originRotation.x = Math.sin(t + Math.PI) * 0.5 * crouchMultiplier;
        player.skin.leftArm.originRotation.x = Math.sin(t + Math.PI) * 0.5;
        player.skin.rightArm.originRotation.x = sin * 0.5;
        const baseArmZ = Math.PI * 0.02;
        player.skin.leftArm.originRotation.z = sin * 0.03 + baseArmZ;
        player.skin.rightArm.originRotation.z = -sin * 0.03 - baseArmZ;
        player.cape.rotation.x = Math.PI / 4 + sin / 16;
        this.animateWings(player);
    }
}
export class FlyAnimation extends PlayerAnimation {
    get supportedActions() {
        return {
            jump: false,
            swing: true,
            crouch: false,
        };
    }
    animate(player) {
        const t = this.progress * 6;
        const sin = Math.sin(t);
        player.rotation.x = Math.PI / 2;
        player.skin.head.originRotation.x = -Math.PI / 4;
        player.skin.leftArm.originRotation.x = -sin / 4;
        player.skin.rightArm.originRotation.x = sin / 4;
        player.skin.leftLeg.originRotation.x = sin / 4;
        player.skin.rightLeg.originRotation.x = -sin / 4;
        const elytraX = 0.35;
        const elytraZ = Math.PI / 2;
        player.elytra.leftWing.rotation.x = elytraX;
        player.elytra.leftWing.rotation.z = elytraZ;
        player.elytra.updateRightWing();
        this.animateWings(player);
    }
}
export class SitAnimation extends PlayerAnimation {
    get supportedActions() {
        return {
            jump: false,
            swing: true,
            crouch: false,
        };
    }
    animate(player, _delta) {
        const t = this.progress * 2;
        const sin = Math.sin(t);
        player.skin.head.originPosition.y = -10;
        player.skin.body.originPosition.y = -10;
        player.skin.leftLeg.originPosition.y = -10;
        player.skin.leftLeg.offsetRotation.x = -Math.PI / 2 + 0.2;
        player.skin.leftLeg.offsetRotation.z = 0.2;
        player.skin.rightLeg.offsetPosition.y = -10;
        player.skin.rightLeg.offsetRotation.x = -Math.PI / 2 + 0.2;
        player.skin.rightLeg.offsetRotation.z = -0.2;
        player.skin.leftArm.originRotation.z = sin * 0.03 + ArmZIdle;
        player.skin.rightArm.originRotation.z = -sin * 0.03 - ArmZIdle;
        const armX = Math.PI * 0.01;
        player.skin.leftArm.originRotation.x = sin * 0.03 + armX - 0.6;
        player.skin.rightArm.originRotation.x = -sin * 0.03 - armX - 0.6;
        this.animateWings(player);
    }
}
export class SwimAnimation extends PlayerAnimation {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "_leftArmEuler", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: { x: 0, y: 0, z: 0 }
        });
        Object.defineProperty(this, "_rightArmEuler", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: { x: 0, y: 0, z: 0 }
        });
    }
    get supportedActions() {
        return {
            jump: false,
            swing: false,
            crouch: false,
        };
    }
    animate(player) {
        const t = this.progress * 6;
        const sin = Math.sin(t);
        const period = 1.3;
        const phase = (this.progress % period) / period;
        player.rotation.x = Math.PI / 2;
        player.skin.head.originRotation.x = -Math.PI / 4;
        player.cape.rotation.x = Math.PI / 4;
        const leftArm = sampleEulerKeyframes(swimLeftArm, phase, this._leftArmEuler);
        const rightArm = sampleEulerKeyframes(swimRightArm, phase, this._rightArmEuler);
        player.skin.leftArm.originRotation.x = leftArm.x;
        player.skin.leftArm.originRotation.y = leftArm.y;
        player.skin.leftArm.originRotation.z = leftArm.z;
        player.skin.rightArm.originRotation.x = rightArm.x;
        player.skin.rightArm.originRotation.y = rightArm.y;
        player.skin.rightArm.originRotation.z = rightArm.z;
        player.skin.leftLeg.originRotation.x = sin / 4;
        player.skin.rightLeg.originRotation.x = -sin / 4;
        this.animateWings(player);
    }
}
//# sourceMappingURL=animation.js.map