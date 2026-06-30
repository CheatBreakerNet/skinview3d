import { PlayerObject } from "./model.js";
import { Quaternion, Vector3 } from "three";
import { easeInOutSine, easingArc } from "./utils.js";

interface AnimationState {
	/** Whether the player is crouching */
	isCrouching: boolean;

	/** Whether the player is swinging */
	isSwinging: boolean;

	/** Whether the player is jumping */
	isJumping: boolean;

	/** Delta time of the animation */
	progress: number;
}

/**
 * An animation which can be played on a {@link PlayerObject}.
 *
 * This is an abstract class. Subclasses of this class would implement
 * particular animations.
 */
export abstract class PlayerAnimation {
	/**
	 * The speed of the animation.
	 *
	 * @defaultValue `1.0`
	 */
	speed: number = 1.0;

	/**
	 * Whether the animation is paused.
	 *
	 * @defaultValue `false`
	 */
	paused: boolean = false;

	/**
	 * The current progress of the animation.
	 */
	progress: number = 0;

	/**
	 * The name of the currently active animation class.
	 */
	protected readonly _activeAnimation: string;

	/**
	 * Plays the animation one tick.
	 * @param player - the player object
	 * @param delta  - scaled time elapsed since last call
	 */
	protected abstract animate(player: PlayerObject, delta: number): void;

	// Disabled animations for certain states
	protected static readonly swingDisabledAnimations: readonly string[] = ["FlyingAnimation", "SwimAnimation", "RunningAnimation"];
	protected static readonly swingLeftArmDisabledAnimation: readonly string[] = ["WalkingAnimation"];
	protected static readonly jumpDisabledAnimations: readonly string[] = [
		"RunningAnimation",
		"WalkingAnimation",
		"FlyingAnimation",
		"SwimAnimation",
	];
	protected static readonly crouchDisabledAnimations: readonly string[] = [
		"FlyingAnimation",
		"SwimAnimation",
		"RunningAnimation",
	];

	// Swings
	private _swingActive: boolean = false;
	private _swingTime: number = 0;
	private readonly _swingDuration: number = (2 * Math.PI) / 24;
	private _swingCooldown: boolean = false;

	// Jump
	private _jumpActive: boolean = false;
	private _jumpTime: number = 0;
	private readonly _jumpDuration: number = 0.6;
	private readonly _jumpHeight: number = 10;
	private _jumpCooldown: boolean = false;

	// Crouch
	private _crouchActive: boolean = false;
	private _crouchWasActive: boolean = false;

	private _nextId: number = 0;
	private _addons: Map<number, (player: PlayerObject, progress: number, id: number) => void> = new Map();
	private _addonOrigins: Map<number, number> = new Map();

	constructor() {
		this._activeAnimation = this.constructor.name;
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
	addAnimation(fn: (player: PlayerObject, progress: number, id: number) => void): number {
		const id = this._nextId++;

		this._addonOrigins.set(id, this.progress);
		this._addons.set(id, fn);

		return id;
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
	removeAnimation(id: number | undefined): void {
		if (id !== undefined) {
			this._addons.delete(id);
			this._addonOrigins.delete(id);
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
	update(player: PlayerObject, deltaTime: number): void {
		if (this.paused) return;

		const delta = deltaTime * this.speed;

		this.animate(player, delta);

		this.animateJump(player, delta);

		this.animateSwing(player, delta);

		this.animateCrouch(player, delta);

		this.progress += delta;
	}

	/**
	 * Animate the dragon wings using the client's math.
	 * @param player - The player object.
	 * @param wingPosition - The animation position/time.
	 */
	protected animateWings(player: PlayerObject, wingPosition: number): void {
		player.wings.leftWing.rotation.x = -0.125 - Math.cos(wingPosition) * 0.2;
		player.wings.leftWing.rotation.y = -0.75;
		player.wings.leftWing.rotation.z = -((Math.sin(wingPosition) + 0.125) * 0.8);

		const leftWingTip = player.wings.leftWing.getObjectByName("wingTip");
		if (leftWingTip) {
			leftWingTip.rotation.z = -((Math.sin(wingPosition + 2.0) + 0.5) * 0.75);
		}

		player.wings.updateRightWing();
	}

	/** Animate a player jump */
	playJump(): void {
		const constructor = this.constructor as typeof PlayerAnimation;

		if (constructor.jumpDisabledAnimations.includes(this._activeAnimation)) {
			return;
		}

		if (!this._jumpActive && !this._jumpCooldown) {
			this._jumpActive = true;
			this._jumpTime = 0;
			this._jumpCooldown = true;
		}
	}

	/** Whether a jump animation is currently playing. */
	get isJumping(): boolean {
		return this._jumpActive;
	}

	/**
	 * Animates a single jump.
	 * @param player - The player object.
	 * @param delta - Scaled time elapsed since last call.
	 */
	animateJump(player: PlayerObject, delta: number): void {
		if (!this._jumpActive) return;

		this._jumpTime += delta;
		const t = this._jumpTime / this._jumpDuration;

		if (t >= 1) {
			this._jumpActive = false;
			this._jumpCooldown = false;
			this._jumpTime = 0;
			player.position.y = 0;
		} else {
			player.position.y = easingArc(t, this._jumpHeight, easeInOutSine);
		}
	}

	/** Animate a player swing */
	playSwing(): void {
		const constructor = this.constructor as typeof PlayerAnimation;

		if (constructor.swingDisabledAnimations.includes(this._activeAnimation)) {
			return;
		}

		if (!this._swingActive && !this._swingCooldown) {
			this._swingActive = true;
			this._swingTime = 0;
			this._swingCooldown = true;
		}
	}

	/** Whether a swing animation is currently playing. */
	get isSwinging(): boolean {
		return this._swingActive;
	}

	animateSwing(player: PlayerObject, delta: number): void {
		if (!this._swingActive) return;

		this._swingTime += delta;
		const t = this._swingTime * 20;

		// Right Arm
		const basicArmRotationZ = 0.01 * Math.PI + 0.06;

		player.skin.rightArm.rotation.x = -0.4537860552 * 2 + 2 * Math.sin(t + Math.PI) * 0.3;
		player.skin.rightArm.rotation.z = -Math.cos(t) * 0.403 + basicArmRotationZ;

		// Body
		player.skin.body.rotation.y = -Math.cos(t) * 0.06;

		// Left Arm
		const constructor = this.constructor as typeof PlayerAnimation;

		if (!constructor.swingLeftArmDisabledAnimation.includes(this._activeAnimation)) {
			player.skin.leftArm.rotation.x = Math.sin(t + Math.PI) * 0.077;
			// TODO: this is a little fucked, needs fixing
			// player.skin.leftArm.rotation.z = -Math.cos(t) * 0.015 + 0.13 - 0.05;
			player.skin.leftArm.position.z = Math.cos(t) * 0.3;
			player.skin.leftArm.position.x = 5 - Math.cos(t) * 0.05;

			if (this._swingTime >= this._swingDuration) {
				player.skin.leftArm.rotation.x = 0;
				player.skin.leftArm.rotation.z = 0;
			}
		}

		if (this._swingTime >= this._swingDuration) {
			this._swingActive = false;
			this._swingCooldown = false;
			this._swingTime = 0;

			player.skin.rightArm.rotation.x = 0;
			player.skin.rightArm.rotation.z = 0;

			player.skin.body.rotation.y = 0;
		}
	}

	/** Animate a player crouch */
	playCrouch(crouch: boolean = !this._crouchActive): void {
		const constructor = this.constructor as typeof PlayerAnimation;

		if (constructor.crouchDisabledAnimations.includes(this._activeAnimation)) {
			return;
		}

		this._crouchActive = crouch;
	}

	/** Whether a crouch animation is currently playing. */
	get isCrouching(): boolean {
		return this._crouchActive;
	}

	animateCrouch(player: PlayerObject, _delta: number): void {
		// nothing to do, we're standing and we already reset the pose
		if (!this._crouchActive && !this._crouchWasActive) return;

		const s = this._crouchActive ? 1 : 0;

		player.skin.body.rotation.x = 0.4537860552 * s;
		player.skin.body.position.y = -6 - 2.103677462 * s;
		player.skin.body.position.z = -3.4500310377 * s + 1.3256181 * s;

		player.skin.head.position.y = -3.618325234674 * s;

		// Legs
		const legZ = -3.4500310377 * s;
		player.skin.leftLeg.position.z = legZ;
		player.skin.rightLeg.position.z = legZ;

		// Arms
		const armZ = 3.618325234674 * s - 3.4500310377 * s;
		player.skin.leftArm.position.z = armZ;
		player.skin.rightArm.position.z = armZ;

		player.skin.leftArm.position.y = -2 - 2.53943318 * s;
		player.skin.rightArm.position.y = player.skin.leftArm.position.y;

		// Cape
		player.cape.position.y = 8 - 1.851236166577372 * s;
		player.cape.rotation.x = (10.8 * Math.PI) / 180 + 0.294220265771 * s;
		player.cape.position.z = -2 + 3.786619432 * s - 3.4500310377 * s;

		// Elytra
		player.elytra.position.x = player.cape.position.x;
		player.elytra.position.y = player.cape.position.y;
		player.elytra.position.z = player.cape.position.z;
		player.elytra.rotation.x = player.cape.rotation.x - (10.8 * Math.PI) / 180;
		player.elytra.leftWing.rotation.z = 0.26179944 + 0.4582006 * s;
		player.elytra.leftWing.rotation.y = 0.3 * s;
		player.elytra.updateRightWing();

		// Wings
		player.wings.position.y = 8 - 1.851236166577372 * s;
		player.wings.rotation.x = (10.8 * Math.PI) / 180 + 0.294220265771 * s;
		player.wings.position.z = -2 + 3.786619432 * s - 3.4500310377 * s;

		this._crouchWasActive = this._crouchActive;
	}

	getState(): AnimationState {
		return {
			isCrouching: this._crouchActive,
			isSwinging: this._swingActive,
			isJumping: this._jumpActive,
			progress: this.progress,
		};
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
	constructor(private readonly fn: (player: PlayerObject, progress: number, delta: number) => void) {
		super();
	}

	protected animate(player: PlayerObject, delta: number): void {
		this.fn(player, this.progress, delta);
	}
}

export class IdleAnimation extends PlayerAnimation {
	protected animate(player: PlayerObject): void {
		const crouchOffset = this.isCrouching ? Math.PI - 2.8 : 0;

		const t = this.progress * 2;

		const sin = Math.sin(t);

		// Arms
		player.skin.leftArm.rotation.x = crouchOffset;
		player.skin.rightArm.rotation.x = crouchOffset;

		const baseArmZ = Math.PI * 0.02;
		player.skin.leftArm.rotation.z = sin * 0.03 + baseArmZ;
		player.skin.rightArm.rotation.z = -sin * 0.03 - baseArmZ;

		// Wings
		this.animateWings(player, this.progress * Math.PI);
	}
}

export class WalkingAnimation extends PlayerAnimation {
	protected animate(player: PlayerObject): void {
		const crouchMultiplier = this.isCrouching ? 0.6 : 1.2;
		const crouchOffset = this.isCrouching ? Math.PI - 2.8 : 0;

		const t = this.progress * (this.isCrouching ? 6 : 10);

		const sin = Math.sin(t);

		// Legs
		player.skin.leftLeg.rotation.x = sin * 0.5 * crouchMultiplier;
		player.skin.rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.5 * crouchMultiplier;

		// Arms
		player.skin.leftArm.rotation.x = crouchOffset + Math.sin(t + Math.PI) * 0.5;
		player.skin.rightArm.rotation.x = crouchOffset + sin * 0.5;

		const baseArmZ = Math.PI * 0.02;
		player.skin.leftArm.rotation.z = sin * 0.03 + baseArmZ;
		player.skin.rightArm.rotation.z = -sin * 0.03 - baseArmZ;

		// Wings
		this.animateWings(player, this.progress * Math.PI);
	}
}

export class RunningAnimation extends PlayerAnimation {
	protected animate(player: PlayerObject): void {
		const t = this.progress * 12;

		const sin = Math.sin(t);

		// Legs
		player.skin.leftLeg.rotation.x = sin * 1.3;
		player.skin.rightLeg.rotation.x = Math.sin(t + Math.PI) * 1.3;

		// Arms
		player.skin.leftArm.rotation.x = Math.sin(t + Math.PI) * 1.5;
		player.skin.rightArm.rotation.x = sin * 1.5;

		const baseArmZ = Math.PI * 0.02;
		player.skin.leftArm.rotation.z = sin * 0.03 + baseArmZ;
		player.skin.rightArm.rotation.z = -sin * 0.03 - baseArmZ;

		const basicCapeRotationX = Math.PI * 0.3;
		player.cape.rotation.x = Math.sin(t * 2) * 0.1 + basicCapeRotationX;

		// What about head shaking?
		// You shouldn't glance right and left when running dude :P

		this.animateWings(player, this.progress * Math.PI);
	}
}

function clamp(num: number, min: number, max: number): number {
	return num <= min ? min : num >= max ? max : num;
}

export class FlyingAnimation extends PlayerAnimation {
	protected animate(player: PlayerObject): void {
		// Body rotation finishes in 0.5s
		// Elytra expansion finishes in 3.3s

		const t = this.progress > 0 ? this.progress * 20 : 0;
		const startProgress = clamp((t * t) / 100, 0, 1);

		player.rotation.x = (startProgress * Math.PI) / 2;
		player.skin.head.rotation.x = startProgress > 0.5 ? Math.PI / 4 - player.rotation.x : 0;

		const basicArmRotationZ = Math.PI * 0.25 * startProgress;
		player.skin.leftArm.rotation.z = basicArmRotationZ;
		player.skin.rightArm.rotation.z = -basicArmRotationZ;

		const elytraRotationX = 0.34906584;
		const elytraRotationZ = Math.PI / 2;
		const interpolation = Math.pow(0.9, t);
		player.elytra.leftWing.rotation.x = elytraRotationX + interpolation * (0.2617994 - elytraRotationX);
		player.elytra.leftWing.rotation.z = elytraRotationZ + interpolation * (0.2617994 - elytraRotationZ);
		player.elytra.updateRightWing();

		this.animateWings(player, this.progress * Math.PI);
	}
}

export class SwimAnimation extends PlayerAnimation {
	private lock: boolean = false;

	protected animate(player: PlayerObject): void {
		if (this.progress === 0) {
			this.lock = false;
		}
		const period = 1.3;
		const t = this.progress % period;
		const phase = t / period;
		// keyframe timing points
		const times = [0, 0.7 / period, 1.1 / period, 1.0];
		const leftEulerDeg = [
			{ z: 180, y: 180, x: 0 },
			{ z: 287.2, y: 180, x: 0 },
			{ z: 180, y: 180, x: 90 },
			{ z: 180, y: 180, x: 0 },
		];
		const rightEulerDeg = [
			{ z: -180, y: 180, x: 0 },
			{ z: -287.2, y: 180, x: 0 },
			{ z: -180, y: 180, x: 90 },
			{ z: -180, y: 180, x: 0 },
		];

		const toRad = Math.PI / 180;

		function eulerZYXToQuat(z: number, y: number, x: number) {
			const qz = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), z);
			const qy = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), y);
			const qx = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), x);
			return qx.multiply(qy).multiply(qz);
		}

		const leftQuats = leftEulerDeg.map(e => eulerZYXToQuat(e.z * toRad, e.y * toRad, e.x * toRad));
		const rightQuats = rightEulerDeg.map(e => eulerZYXToQuat(e.z * toRad, e.y * toRad, e.x * toRad));

		function findSegment(t: number) {
			for (let i = 0; i < times.length - 1; i++) {
				if (t >= times[i] && t <= times[i + 1]) {
					return { i, t0: times[i], t1: times[i + 1] };
				}
			}
			return { i: times.length - 2, t0: times[times.length - 2], t1: times[times.length - 1] };
		}

		const seg = findSegment(phase);
		const p = (phase - seg.t0) / (seg.t1 - seg.t0);
		const i = seg.i;
		if (!this.lock) {
			let k = 1.3;
			if (i == 0 && p * k < 1) {
				player.position.y = -5 * p * k;
				player.rotation.x = (1.3 * p * Math.PI) / 2;
				player.skin.head.rotation.x = (-Math.PI / 4) * p * k;
				player.cape.rotation.x = (Math.PI / 4) * p * k;
			} else {
				this.lock = true;
			}
		}
		const qLeft = new Quaternion().copy(leftQuats[i]).slerp(leftQuats[i + 1], p);
		const qRight = new Quaternion().copy(rightQuats[i]).slerp(rightQuats[i + 1], p);

		player.skin.leftArm.quaternion.copy(qLeft);
		player.skin.rightArm.quaternion.copy(qRight);
		const legFreq = 390 * toRad;
		const legAmp = 17.2 * toRad;
		const leftLegX = legAmp * Math.cos(this.progress * legFreq + Math.PI);
		const rightLegX = legAmp * Math.cos(this.progress * legFreq);
		player.skin.leftLeg.rotation.x = leftLegX;
		player.skin.leftLeg.rotation.y = -0.1 * toRad;
		player.skin.leftLeg.rotation.z = -0.1 * toRad;
		player.skin.rightLeg.rotation.x = rightLegX;
		player.skin.rightLeg.rotation.y = 0.1 * toRad;
		player.skin.rightLeg.rotation.z = 0.1 * toRad;
		this.animateWings(player, this.progress * Math.PI);
	}
}
