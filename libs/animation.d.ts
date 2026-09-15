import { PlayerObject } from "./model.js";
export type PlayerState = "Idle" | "Swinging" | "Jumping" | "Crouching";
/**
 * Controls which actions are currently allowed to be played.
 * All actions are enabled by default. Set a flag to prevent that action from
 * starting when {@link PlayerAnimation.playJump} or any of the other animations are called.
 *
 * @example
 * ```
 * // Prevent the player from jumping or swinging, but allow crouching
 * animation.actions.jump = false
 * animation.actions.swing = false
 * ```
 */
export interface AnimationActions {
    /**
     * Whether {@link PlayerAnimation.playJump} is allowed to start a jump.
     * @defaultValue `true`
     */
    jump: boolean;
    /**
     * Whether {@link PlayerAnimation.playSwing} is allowed to start a swing.
     * @defaultValue `true`
     */
    swing: boolean;
    /**
     * Whether {@link PlayerAnimation.playCrouch} is allowed to change the crouch state.
     * @defaultValue `true`
     */
    crouch: boolean;
}
interface AnimationState {
    /**
     * Which modifier states are currently active.
     */
    states: Set<PlayerState>;
    /**
     * Delta time of the animation.
     */
    progress: number;
}
/**
 * An animation which can be played on a {@link PlayerObject}.
 *
 * This is an abstract class. Subclasses of this class would implement
 * particular animations.
 */
export declare abstract class PlayerAnimation {
    /**
     * The speed of the animation.
     *
     * @defaultValue `1.0`
     */
    speed: number;
    /**
     * Whether the animation is paused.
     *
     * @defaultValue `false`
     */
    paused: boolean;
    /**
     * The current progress of the animation.
     */
    progress: number;
    /**
     * Which player actions are currently allowed to be started.
     *
     * @defaultValue `{ jump: true, swing: true, crouch: true }`
     * @see {@link AllowedActions}
     */
    allowedActions: AnimationActions;
    /**
     * The name of the currently active animation class.
     */
    protected readonly _activeAnimation: string;
    /**
     * What the animation supports.
     */
    protected get supportedActions(): Readonly<AnimationActions>;
    /**
     * Plays the animation one tick.
     * @param player - the player object
     * @param delta  - scaled time elapsed since last call
     */
    protected abstract animate(player: PlayerObject, delta: number): void;
    private _swingActive;
    private _swingTime;
    private readonly _swingDuration;
    private _jumpActive;
    private _jumpTime;
    private readonly _jumpDuration;
    private readonly _jumpHeight;
    private _crouchActive;
    private readonly _states;
    private _statesSnapshot;
    private _nextId;
    private readonly _addons;
    constructor();
    private setState;
    /**
     * Which modifier states are currently active.
     */
    get states(): Set<PlayerState>;
    /**
     * Whether a given modifier state is currently active.
     */
    hasState(state: PlayerState): boolean;
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
    addAnimation(fn: (player: PlayerObject, progress: number, id: number) => void): number;
    /**
     * Removes all custom animations added through {@link addAnimation}.
     */
    clearAnimations(): void;
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
    removeAnimation(id: number | undefined): void;
    /**
     * Plays the animation, and update the progress.
     *
     * The elapsed time `deltaTime` will be scaled by {@link speed}.
     * If {@link paused} is `true`, this method will do nothing.
     *
     * @param player - the player object
     * @param deltaTime - time elapsed since last call
     */
    update(player: PlayerObject, deltaTime: number): void;
    protected animateWings(player: PlayerObject): void;
    get isIdle(): boolean;
    playJump(): void;
    get isJumping(): boolean;
    animateJump(player: PlayerObject, delta: number): void;
    playSwing(): void;
    get isSwinging(): boolean;
    animateSwing(player: PlayerObject, delta: number): void;
    playCrouch(crouch?: boolean): void;
    get isCrouching(): boolean;
    animateCrouch(player: PlayerObject): void;
    getState(): AnimationState;
    interruptForAction(): PlayerAnimation | null;
    stop(): void;
    reset(): void;
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
export declare class FunctionAnimation extends PlayerAnimation {
    private readonly fn;
    constructor(fn: (player: PlayerObject, progress: number, delta: number) => void);
    protected animate(player: PlayerObject, delta: number): void;
}
export declare class IdleAnimation extends PlayerAnimation {
    protected animate(player: PlayerObject): void;
}
export declare class WalkAnimation extends PlayerAnimation {
    protected get supportedActions(): Readonly<AnimationActions>;
    protected animate(player: PlayerObject): void;
}
export declare class FlyAnimation extends PlayerAnimation {
    protected get supportedActions(): Readonly<AnimationActions>;
    protected animate(player: PlayerObject): void;
}
export declare class SitAnimation extends PlayerAnimation {
    protected get supportedActions(): Readonly<AnimationActions>;
    protected animate(player: PlayerObject, _delta: number): void;
}
export declare class SwimAnimation extends PlayerAnimation {
    protected get supportedActions(): Readonly<AnimationActions>;
    private readonly _leftArmEuler;
    private readonly _rightArmEuler;
    protected animate(player: PlayerObject): void;
}
export {};
