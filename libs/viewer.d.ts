import { type ModelType, type RemoteImage, type TextureSource } from "skinview-utils";
import { Color, type ColorRepresentation, PointLight, Group, PerspectiveCamera, Scene, Texture, WebGLRenderer, AmbientLight, type Mapping, Object3D } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { PlayerAnimation } from "./animation.js";
import { type Cosmetic, PlayerObject } from "./model.js";
import { NameTagObject } from "./nametag.js";
export interface LoadOptions {
    /**
     * Whether to make the object visible after the texture is loaded.
     *
     * @defaultValue `true`
     */
    makeVisible?: boolean;
}
export interface SkinLoadOptions extends LoadOptions {
    /**
     * The model of the player (`"default"` for normal arms, and `"slim"` for slim arms).
     *
     * When set to `"auto-detect"`, the model will be inferred from the skin texture.
     *
     * @defaultValue `"auto-detect"`
     */
    model?: ModelType | "auto-detect";
    /**
     * Whether to display the ears drawn on the skin texture.
     *
     * - `true` - Display the ears drawn on the skin texture.
     * - `"load-only"` - Loads the ear texture, but do not make them visible.
     *   You can make them visible later by setting `PlayerObject.ears.visible` to `true`.
     * - `false` - Do not load or show the ears.
     *
     * @defaultValue `false`
     */
    ears?: boolean | "load-only";
}
export interface CapeLoadOptions extends LoadOptions {
    /**
     * Render the Cape as Elytra instead of a cape.
     *
     * @defaultValue `false`
     */
    elytra?: boolean;
}
export interface DragonWingsRenderOptions extends LoadOptions {
}
export interface EarsLoadOptions extends LoadOptions {
    /**
     * The type of the provided ear texture.
     *
     * - `"standalone"` means the provided texture is a 14x7 image that only contains the ears.
     * - `"skin"` means the provided texture is a skin texture with ears, and we will use its ear part.
     *
     * @defaultValue `"standalone"`
     */
    textureType?: "standalone" | "skin";
}
export interface SkinViewerOptions {
    /**
     * The canvas where the renderer draws its output.
     *
     * @defaultValue If unspecified, a new canvas element will be created.
     */
    canvas?: HTMLCanvasElement;
    /**
     * The CSS width of the canvas.
     */
    width?: number;
    /**
     * The CSS height of the canvas.
     */
    height?: number;
    /**
     * The pixel ratio of the canvas.
     *
     * When set to `"match-device"`, the current device pixel ratio will be used,
     * and it will be automatically updated when the device pixel ratio changes.
     *
     * @defaultValue `"match-device"`
     */
    pixelRatio?: number | "match-device";
    /**
     * The skin texture of the player.
     *
     * @defaultValue If unspecified, the skin will be invisible.
     */
    skin?: RemoteImage | TextureSource;
    /**
     * The model of the player (`"default"` for normal arms, and `"slim"` for slim arms).
     *
     * When set to `"auto-detect"`, the model will be inferred from the skin texture.
     *
     * If the `skin` option is not specified, this option will have no effect.
     *
     * @defaultValue `"auto-detect"`
     */
    model?: ModelType | "auto-detect";
    /**
     * The cape texture of the player.
     *
     * @defaultValue If unspecified, the cape will be invisible.
     */
    cape?: RemoteImage | TextureSource;
    /**
     * The wings texture of the player.
     *
     * @defaultValue If unspecified, the wings will be invisible.
     */
    dragonWings?: RemoteImage | TextureSource;
    /** @deprecated Use {@link dragonWings}. */
    wings?: RemoteImage | TextureSource;
    /**
     * The ear texture of the player.
     *
     * When set to `"current-skin"`, the ears drawn on the current skin texture (as is specified in the `skin` option) will be shown.
     *
     * To use an individual ear texture, you have to specify the `textureType` and the `source` option.
     * `source` is the texture to use, and `textureType` can be either `"standalone"` or `"skin"`:
     *   - `"standalone"` means the provided texture is a 14x7 image that only contains the ears.
     *   - `"skin"` means the provided texture is a skin texture with ears, and we will show its ear part.
     *
     * @defaultValue If unspecified, the ears will be invisible.
     */
    ears?: "current-skin" | {
        textureType: "standalone" | "skin";
        source: RemoteImage | TextureSource;
    };
    /**
     * Whether to preserve the buffers until manually cleared or overwritten.
     *
     * @defaultValue `false`
     */
    preserveDrawingBuffer?: boolean;
    /**
     * Whether to pause the rendering and animation loop.
     *
     * @defaultValue `false`
     */
    renderPaused?: boolean;
    /**
     * The background of the scene.
     *
     * @defaultValue transparent
     */
    background?: ColorRepresentation | Texture;
    /**
     * The panorama background to use.
     *
     * This option overrides the `background` option.
     */
    panorama?: RemoteImage | TextureSource;
    /**
     * Camera vertical field of view, in degrees.
     *
     * The distance between the player and the camera will be automatically computed from `fov` and `zoom`.
     *
     * @defaultValue `50`
     *
     * @see {@link SkinViewer.adjustCameraDistance}
     */
    fov?: number;
    /**
     * Zoom ratio of the player.
     *
     * This value affects the distance between the object and the camera.
     * When set to `1.0`, the top edge of the player's head coincides with the edge of the canvas.
     *
     * The distance between the player and the camera will be automatically computed from `fov` and `zoom`.
     *
     * @defaultValue `0.9`
     *
     * @see {@link SkinViewer.adjustCameraDistance}
     */
    zoom?: number;
    /**
     * Whether to enable mouse control function.
     *
     * This function is implemented using {@link OrbitControls}.
     * By default, zooming and rotating are enabled, and panning is disabled.
     *
     * @defaultValue `true`
     */
    enableControls?: boolean;
    /**
     * The animation to play on the player.
     *
     * @defaultValue If unspecified, no animation will be played.
     */
    animation?: PlayerAnimation;
    /**
     * The name tag to display above the player.
     *
     * @defaultValue If unspecified, no name tag will be displayed.
     * @see {@link SkinViewer.nameTag}
     */
    nameTag?: NameTagObject | string;
}
export type SkinViewerFocus = "player" | "head" | "cape" | "elytra" | "dragonWings" | "wings" | "ears" | Object3D;
/**
 * The SkinViewer renders the player on a canvas.
 */
export declare class SkinViewer {
    /**
     * The canvas where the renderer draws its output.
     */
    readonly canvas: HTMLCanvasElement;
    readonly scene: Scene;
    readonly camera: PerspectiveCamera;
    readonly renderer: WebGLRenderer;
    /**
     * The OrbitControls component which is used to implement the mouse control function.
     *
     * @see {@link https://threejs.org/docs/#examples/en/controls/OrbitControls | OrbitControls - three.js docs}
     */
    readonly controls: OrbitControls;
    /**
     * The player object.
     */
    readonly playerObject: PlayerObject;
    /**
     * A group that wraps the player object.
     * It is used to center the player in the world.
     */
    readonly playerWrapper: Group;
    readonly globalLight: AmbientLight;
    readonly cameraLight: PointLight;
    private lastCameraAzimuth;
    readonly composer: EffectComposer;
    readonly renderPass: RenderPass;
    readonly fxaaPass: ShaderPass;
    readonly skinCanvas: HTMLCanvasElement;
    readonly capeCanvas: HTMLCanvasElement;
    readonly earsCanvas: HTMLCanvasElement;
    readonly wingsCanvas: HTMLCanvasElement;
    readonly shadowCanvas: HTMLCanvasElement;
    private skinTexture;
    private capeTexture;
    private earsTexture;
    private wingsTexture;
    private shadowTexture;
    private backgroundTexture;
    private _disposed;
    private _renderPaused;
    private _zoom;
    private isUserRotating;
    private onKeyDown;
    private onKeyUp;
    private onBlur;
    private onMouseDown;
    private onMouseUp;
    private onTouchMove;
    private onTouchEnd;
    /**
     * Whether cape swaying (a subtle rotation to the cape as the
     * camera orbits around the player) is currently enabled.
     * @defaultValue `false`
     * @see {@link enableCapeSway}
     * @see {@link disableCapeSway}
     */
    private _capeSwayEnabled;
    private capeSway;
    private _capeMaxSway;
    private _capeStiffness;
    private _capeDrive;
    /**
     * Whether a shadow mesh (below the player) is currently enabled.
     * @defaultValue `false`
     * @see {@link enableShadow}
     * @see {@link disableShadow}
     */
    private _shadowEnabled;
    private shadowMesh;
    /**
     * Whether to rotate the player along the y axis.
     *
     * @defaultValue `false`
     */
    autoRotate: boolean;
    /**
     * The angular velocity of the player, in rad/s.
     *
     * @defaultValue `1.0`
     * @see {@link autoRotate}
     */
    autoRotateSpeed: number;
    private _animation;
    private clock;
    private animationID;
    private onContextLost;
    private onContextRestored;
    private _pixelRatio;
    private devicePixelRatioQuery;
    private onDevicePixelRatioChange;
    private _nameTag;
    private nameTagYOffset;
    private readonly scratchVector3;
    private readonly boundDraw;
    constructor(options?: SkinViewerOptions);
    private doAction;
    private interruptEmote;
    private updateComposerSize;
    private recreateSkinTexture;
    private recreateCapeTexture;
    private recreateEarsTexture;
    /**
     * Shows only the selected cosmetic, hiding all others.
     *
     * When showing the cape, it can optionally be shown as an Elytra instead of a cape.
     */
    setCosmetic(cosmetic: Cosmetic | null, options?: {
        elytra?: boolean;
    }): void;
    loadSkin(empty: null): void;
    loadSkin<S extends TextureSource | RemoteImage>(source: S, options?: SkinLoadOptions): S extends TextureSource ? void : Promise<void>;
    resetSkin(): void;
    loadCape(empty: null): void;
    loadCape<S extends TextureSource | RemoteImage>(source: S, options?: CapeLoadOptions): S extends TextureSource ? void : Promise<void>;
    resetCape(): void;
    private updateCapeSway;
    /**
     * Whether cape swaying is currently enabled.
     *
     * @see {@link enableCapeSway}
     * @see {@link disableCapeSway}
     */
    get capeSwayEnabled(): boolean;
    /**
     * Enables cape swaying.
     *
     * When enabled, the cape rotates slightly from side to side as the camera
     * orbits around the player. This is inspired by Laby's website.
     * @see https://laby.net/skins/497c555947a31e312fe1cfad857be2b4
     *
     * @example
     * ```
     * skinViewer.enableCapeSway();
     * ```
     */
    enableCapeSway(): void;
    /**
     * Disables cape swaying and resets the cape's sway rotation back to 0.
     *
     * @example
     * ```
     * skinViewer.disableCapeSway();
     * ```
     */
    disableCapeSway(): void;
    private recreateWingsTexture;
    loadDragonWings(empty: null): void;
    loadDragonWings<S extends TextureSource | RemoteImage>(source: S, options?: DragonWingsRenderOptions): S extends TextureSource ? void : Promise<void>;
    resetDragonWings(): void;
    /** @deprecated Use {@link loadDragonWings}. */
    loadWings<S extends TextureSource | RemoteImage>(source: S, options?: DragonWingsRenderOptions): S extends TextureSource ? void : Promise<void>;
    /** @deprecated Use {@link resetDragonWings}. */
    resetWings(): void;
    loadEars(empty: null): void;
    loadEars<S extends TextureSource | RemoteImage>(source: S, options?: EarsLoadOptions): S extends TextureSource ? void : Promise<void>;
    resetEars(): void;
    loadPanorama<S extends TextureSource | RemoteImage>(source: S): S extends TextureSource ? void : Promise<void>;
    loadMinecraftPanorama<S extends TextureSource | RemoteImage>(images: [S, S, S, S, S, S]): S extends TextureSource ? void : Promise<void>;
    loadBackground<S extends TextureSource | RemoteImage>(source: S, mapping?: Mapping): S extends TextureSource ? void : Promise<void>;
    private loadShadowMesh;
    private recreateShadowTexture;
    /**
     * Whether the player shadow is currently enabled.
     *
     * @see {@link enableShadow}
     * @see {@link disableShadow}
     */
    get shadowEnabled(): boolean;
    /**
     * Enables the player shadow.
     *
     * @example
     * ```
     * skinViewer.enableShadow();
     * ```
     */
    enableShadow(): void;
    /**
     * Disables the player shadow, removing it from the scene.
     *
     * @example
     * ```
     * skinViewer.disableShadow();
     * ```
     */
    disableShadow(): void;
    loadShadow(empty: null): void;
    loadShadow<S extends TextureSource | RemoteImage>(source: S): S extends TextureSource ? void : Promise<void>;
    resetShadow(): void;
    private draw;
    /**
     * Focuses the camera on a part of the player.
     */
    focus(target: SkinViewerFocus, zoom?: number): void;
    /**
     * Renders the scene to the canvas.
     * This method does not change the animation progress.
     */
    render(): void;
    setSize(width: number, height: number): void;
    dispose(): void;
    get disposed(): boolean;
    /**
     * Whether rendering and animations are paused.
     * Setting this property to true will stop both rendering and animation loops.
     * Setting it back to false will resume them.
     */
    get renderPaused(): boolean;
    set renderPaused(value: boolean);
    get width(): number;
    set width(newWidth: number);
    get height(): number;
    set height(newHeight: number);
    get background(): null | Color | Texture;
    set background(value: null | ColorRepresentation | Texture);
    adjustCameraDistance(): void;
    resetCameraPose(): void;
    get fov(): number;
    set fov(value: number);
    get zoom(): number;
    set zoom(value: number);
    get pixelRatio(): number | "match-device";
    set pixelRatio(newValue: number | "match-device");
    /**
     * The animation that is current playing, or `null` if no animation is playing.
     *
     * Setting this property to a different value will change the current animation.
     * The player's pose and the progress of the new animation will be reset before playing.
     *
     * Setting this property to `null` will stop the current animation and reset the player's pose.
     */
    get animation(): PlayerAnimation | null;
    set animation(animation: PlayerAnimation | null);
    /**
     * The name tag to display above the player, or `null` if there is none.
     *
     * When setting this property to a `string` value, a {@link NameTagObject}
     * will be automatically created with default options.
     *
     * @example
     * ```
     * skinViewer.nameTag = "hello";
     * skinViewer.nameTag = new NameTagObject("hello", { textStyle: "yellow" });
     * skinViewer.nameTag = null;
     * ```
     */
    get nameTag(): NameTagObject | null;
    set nameTag(newVal: NameTagObject | string | null);
}
