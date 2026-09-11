import {
	inferModelType,
	isTextureSource,
	loadCapeToCanvas,
	loadEarsToCanvas,
	loadEarsToCanvasFromSkin,
	loadImage,
	loadSkinToCanvas,
	type ModelType,
	type RemoteImage,
	type TextureSource,
} from "skinview-utils";
import {
	Color,
	type ColorRepresentation,
	PointLight,
	EquirectangularReflectionMapping,
	Group,
	NearestFilter,
	PerspectiveCamera,
	Scene,
	Texture,
	Vector2,
	Vector3,
	WebGLRenderer,
	AmbientLight,
	type Mapping,
	CanvasTexture,
	WebGLRenderTarget,
	FloatType,
	DepthTexture,
	Timer,
	Object3D,
	ColorManagement,
	CubeTexture,
	CubeReflectionMapping,
	Mesh,
	CircleGeometry,
	MeshBasicMaterial,
	BackSide,
	FrontSide,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { PlayerAnimation } from "./animation.js";
import { type Cosmetic, PlayerObject } from "./model.js";
import { NameTagObject } from "./nametag.js";
import { clamp, clamp01, lerp } from "./math.js";

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

export interface DragonWingsRenderOptions extends LoadOptions {}

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
	ears?:
		| "current-skin"
		| {
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

export type SkinViewerFocus = "player" | "cape" | "elytra" | "dragonWings" | "wings" | "ears" | Object3D;

/**
 * The SkinViewer renders the player on a canvas.
 */
export class SkinViewer {
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

	readonly globalLight: AmbientLight = new AmbientLight(0xffffff, 3);
	readonly cameraLight: PointLight = new PointLight(0xffffff, 0.6);
	private lastCameraAzimuth: number = 0;

	readonly composer: EffectComposer;
	readonly renderPass: RenderPass;
	readonly fxaaPass: ShaderPass;

	readonly skinCanvas: HTMLCanvasElement;
	readonly capeCanvas: HTMLCanvasElement;
	readonly earsCanvas: HTMLCanvasElement;
	readonly wingsCanvas: HTMLCanvasElement;
	readonly shadowCanvas: HTMLCanvasElement;
	private skinTexture: Texture | null = null;
	private capeTexture: Texture | null = null;
	private earsTexture: Texture | null = null;
	private wingsTexture: Texture | null = null;
	private shadowTexture: Texture | null = null;
	private backgroundTexture: Texture | null = null;

	private _disposed: boolean = false;
	private _renderPaused: boolean = false;
	private _zoom: number;
	private isUserRotating: boolean = false;

	private onKeyDown: (event: KeyboardEvent) => void;
	private onKeyUp: (event: KeyboardEvent) => void;
	private onBlur: () => void;

	private onMouseDown: (event: MouseEvent) => void;
	private onMouseUp: (event: MouseEvent) => void;
	private onTouchMove: (event: TouchEvent) => void;
	private onTouchEnd: (event: TouchEvent) => void;

	/**
	 * Whether cape swaying (a subtle rotation to the cape as the
	 * camera orbits around the player) is currently enabled.
	 * @defaultValue `false`
	 * @see {@link enableCapeSway}
	 * @see {@link disableCapeSway}
	 */
	private _capeSwayEnabled: boolean = false;
	private capeSway: number = 0;
	private _capeMaxSway: number = 0.15;
	private _capeStiffness: number = 8.0;
	private _capeDrive: number = 12.0;

	/**
	 * Whether a shadow mesh (below the player) is currently enabled.
	 * @defaultValue `false`
	 * @see {@link enableShadow}
	 * @see {@link disableShadow}
	 */
	private _shadowEnabled = false;
	private shadowMesh: Mesh | null = null;

	/**
	 * Whether to rotate the player along the y axis.
	 *
	 * @defaultValue `false`
	 */
	autoRotate: boolean = false;

	/**
	 * The angular velocity of the player, in rad/s.
	 *
	 * @defaultValue `1.0`
	 * @see {@link autoRotate}
	 */
	autoRotateSpeed: number = 1.0;

	private _animation: PlayerAnimation | null;
	private clock: Timer;

	private animationID: number | null;
	private onContextLost: (event: Event) => void;
	private onContextRestored: () => void;

	private _pixelRatio: number | "match-device";
	private devicePixelRatioQuery: MediaQueryList | null;
	private onDevicePixelRatioChange: () => void;

	private _nameTag: NameTagObject | null = null;
	private nameTagYOffset: number = 20;

	private readonly scratchVector3: Vector3 = new Vector3();
	private readonly boundDraw: () => void = () => this.draw();

	constructor(options: SkinViewerOptions = {}) {
		this.canvas = options.canvas === undefined ? document.createElement("canvas") : options.canvas;

		this.skinCanvas = document.createElement("canvas");
		this.capeCanvas = document.createElement("canvas");
		this.earsCanvas = document.createElement("canvas");
		this.wingsCanvas = document.createElement("canvas");
		this.shadowCanvas = document.createElement("canvas");

		this.scene = new Scene();

		this.camera = new PerspectiveCamera();
		this.camera.add(this.cameraLight);

		this.scene.add(this.camera);
		this.scene.add(this.globalLight);

		ColorManagement.enabled = false;

		this.renderer = new WebGLRenderer({
			canvas: this.canvas,
			preserveDrawingBuffer: options.preserveDrawingBuffer === true, // default: false
			// antialias: false,
		});

		this.onDevicePixelRatioChange = () => {
			this.renderer.setPixelRatio(window.devicePixelRatio);
			this.updateComposerSize();

			if (this._pixelRatio === "match-device") {
				this.devicePixelRatioQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
				this.devicePixelRatioQuery.addEventListener("change", this.onDevicePixelRatioChange, { once: true });
			}
		};
		if (options.pixelRatio === undefined || options.pixelRatio === "match-device") {
			this._pixelRatio = "match-device";
			this.devicePixelRatioQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
			this.devicePixelRatioQuery.addEventListener("change", this.onDevicePixelRatioChange, { once: true });
			this.renderer.setPixelRatio(window.devicePixelRatio);
		} else {
			this._pixelRatio = options.pixelRatio;
			this.devicePixelRatioQuery = null;
			this.renderer.setPixelRatio(options.pixelRatio);
		}

		this.renderer.setClearColor(0, 0);

		let renderTarget;
		if (this.renderer.capabilities.isWebGL2) {
			// Use float precision depth if possible
			// see https://github.com/bs-community/skinview3d/issues/111
			renderTarget = new WebGLRenderTarget(0, 0, {
				depthTexture: new DepthTexture(0, 0, FloatType),
			});
		}

		this.composer = new EffectComposer(this.renderer, renderTarget);
		this.renderPass = new RenderPass(this.scene, this.camera);
		this.fxaaPass = new ShaderPass(FXAAShader);
		this.composer.addPass(this.renderPass);
		this.composer.addPass(this.fxaaPass);

		this.playerObject = new PlayerObject();
		this.playerObject.name = "player";
		this.playerObject.skin.visible = false;
		this.playerObject.cape.visible = false;
		this.playerObject.elytra.visible = false;
		this.playerObject.dragonWings.visible = false;
		this.playerObject.ears.visible = false;
		this.playerWrapper = new Group();
		this.playerWrapper.add(this.playerObject);
		this.scene.add(this.playerWrapper);

		this.controls = new OrbitControls(this.camera, this.canvas);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.2;
		this.controls.enablePan = false; // disable pan by default
		this.controls.minDistance = 10;
		this.controls.maxDistance = 256;

		if (options.enableControls === false) {
			this.controls.enabled = false;
		}

		if (options.skin !== undefined) {
			this.loadSkin(options.skin, {
				model: options.model,
				ears: options.ears === "current-skin",
			});
		}

		if (options.cape !== undefined) {
			this.loadCape(options.cape);
		}

		const dragonWingsSource = options.dragonWings ?? options.wings;
		if (dragonWingsSource !== undefined) {
			this.loadDragonWings(dragonWingsSource);
		}

		if (options.ears !== undefined && options.ears !== "current-skin") {
			this.loadEars(options.ears.source, {
				textureType: options.ears.textureType,
			});
		}

		if (options.width !== undefined) {
			this.width = options.width;
		}

		if (options.height !== undefined) {
			this.height = options.height;
		}

		if (options.background !== undefined) {
			this.background = options.background;
		}

		if (options.panorama !== undefined) {
			this.loadPanorama(options.panorama);
		}

		if (options.nameTag !== undefined) {
			this.nameTag = options.nameTag;
		}

		this.camera.position.z = 1;
		this._zoom = options.zoom === undefined ? 0.9 : options.zoom;
		this.fov = options.fov === undefined ? 50 : options.fov;

		this._animation = options.animation === undefined ? null : options.animation;
		this.clock = new Timer();

		if (options.renderPaused === true) {
			this._renderPaused = true;
			this.animationID = null;
		} else {
			this.animationID = window.requestAnimationFrame(this.boundDraw);
		}

		this.onContextLost = (event: Event) => {
			event.preventDefault();
			if (this.animationID !== null) {
				window.cancelAnimationFrame(this.animationID);
				this.animationID = null;
			}
		};

		this.onContextRestored = () => {
			this.renderer.setClearColor(0, 0); // Clear color might be lost
			if (!this._renderPaused && !this._disposed && this.animationID === null) {
				this.animationID = window.requestAnimationFrame(this.boundDraw);
			}
		};

		this.canvas.addEventListener("webglcontextlost", this.onContextLost, false);
		this.canvas.addEventListener("webglcontextrestored", this.onContextRestored, false);

		if (!this.canvas.hasAttribute("tabindex")) {
			this.canvas.tabIndex = 0;
		}

		this.onKeyDown = (event: KeyboardEvent) => {
			if (event.code === "Space") {
				event.preventDefault();
				this.animation?.playJump();
			}

			if (event.code === "ShiftLeft" && this.animation) {
				this.animation.playCrouch(true);
			}
		};

		this.onKeyUp = (event: KeyboardEvent) => {
			if (event.code === "ShiftLeft" && this.animation) {
				this.animation.playCrouch(false);
			}
		};

		this.onBlur = () => {
			this.animation?.playCrouch(false);
		};

		this.onMouseDown = (event: MouseEvent) => {
			this.isUserRotating = true;

			if (event.button === 0 && this.animation) {
				this.animation.playSwing();
			}
		};

		this.onMouseUp = () => {
			this.isUserRotating = false;
		};

		this.onTouchMove = event => {
			this.isUserRotating = event.touches.length === 1;
		};

		this.onTouchEnd = () => {
			this.isUserRotating = false;
		};

		this.canvas.addEventListener("keydown", this.onKeyDown);
		this.canvas.addEventListener("keyup", this.onKeyUp);
		this.canvas.addEventListener("blur", this.onBlur);

		this.canvas.addEventListener("mousedown", this.onMouseDown);
		this.canvas.addEventListener("mouseup", this.onMouseUp);
		this.canvas.addEventListener("touchmove", this.onTouchMove);
		this.canvas.addEventListener("touchend", this.onTouchEnd);
	}

	private updateComposerSize(): void {
		this.composer.setSize(this.width, this.height);
		const pixelRatio = this.renderer.getPixelRatio();
		this.composer.setPixelRatio(pixelRatio);
		this.fxaaPass.material.uniforms["resolution"].value.x = 1 / (this.width * pixelRatio);
		this.fxaaPass.material.uniforms["resolution"].value.y = 1 / (this.height * pixelRatio);
	}

	private recreateSkinTexture(): void {
		if (this.skinTexture !== null) {
			this.skinTexture.dispose();
		}
		this.skinTexture = new CanvasTexture(this.skinCanvas);
		this.skinTexture.magFilter = NearestFilter;
		this.skinTexture.minFilter = NearestFilter;
		this.playerObject.skin.map = this.skinTexture;
	}

	private recreateCapeTexture(): void {
		if (this.capeTexture !== null) {
			this.capeTexture.dispose();
		}
		this.capeTexture = new CanvasTexture(this.capeCanvas);
		this.capeTexture.magFilter = NearestFilter;
		this.capeTexture.minFilter = NearestFilter;
		this.playerObject.cape.map = this.capeTexture;
		this.playerObject.elytra.map = this.capeTexture;
	}

	private recreateEarsTexture(): void {
		if (this.earsTexture !== null) {
			this.earsTexture.dispose();
		}
		this.earsTexture = new CanvasTexture(this.earsCanvas);
		this.earsTexture.magFilter = NearestFilter;
		this.earsTexture.minFilter = NearestFilter;
		this.playerObject.ears.map = this.earsTexture;
	}

	/**
	 * Shows only the selected cosmetic, hiding all others.
	 *
	 * When showing the cape, it can optionally be shown as an Elytra instead of a cape.
	 */
	setCosmetic(cosmetic: Cosmetic | null, options: { elytra?: boolean } = {}): void {
		const showCape = cosmetic === "cape";
		this.playerObject.cape.visible = showCape && options.elytra !== true;
		this.playerObject.elytra.visible = showCape && options.elytra === true;
		this.playerObject.dragonWings.visible = cosmetic === "dragonWings";
	}

	loadSkin(empty: null): void;
	loadSkin<S extends TextureSource | RemoteImage>(
		source: S,
		options?: SkinLoadOptions
	): S extends TextureSource ? void : Promise<void>;

	loadSkin(source: TextureSource | RemoteImage | null, options: SkinLoadOptions = {}): void | Promise<void> {
		if (source === null) {
			this.resetSkin();
		} else if (isTextureSource(source)) {
			loadSkinToCanvas(this.skinCanvas, source);
			this.recreateSkinTexture();

			if (options.model === undefined || options.model === "auto-detect") {
				this.playerObject.skin.modelType = inferModelType(this.skinCanvas);
			} else {
				this.playerObject.skin.modelType = options.model;
			}

			if (options.makeVisible !== false) {
				this.playerObject.skin.visible = true;
			}

			if (options.ears === true || options.ears == "load-only") {
				loadEarsToCanvasFromSkin(this.earsCanvas, source);
				this.recreateEarsTexture();
				if (options.ears === true) {
					this.playerObject.ears.visible = true;
					if (this._nameTag) {
						this.nameTagYOffset = 25;
						this._nameTag.position.y = this.nameTagYOffset;
					}
				}
			}
		} else {
			return loadImage(source).then(image => this.loadSkin(image, options));
		}
	}

	resetSkin(): void {
		this.playerObject.skin.visible = false;
		this.playerObject.skin.map = null;
		if (this.skinTexture !== null) {
			this.skinTexture.dispose();
			this.skinTexture = null;
		}
	}

	loadCape(empty: null): void;
	loadCape<S extends TextureSource | RemoteImage>(
		source: S,
		options?: CapeLoadOptions
	): S extends TextureSource ? void : Promise<void>;

	loadCape(source: TextureSource | RemoteImage | null, options: CapeLoadOptions = {}): void | Promise<void> {
		if (source === null) {
			this.resetCape();
		} else if (isTextureSource(source)) {
			loadCapeToCanvas(this.capeCanvas, source);
			this.recreateCapeTexture();

			if (options.makeVisible !== false) {
				this.playerObject.cape.visible = options.elytra !== true;
				this.playerObject.elytra.visible = options.elytra === true;
			}
		} else {
			return loadImage(source).then(image => this.loadCape(image, options));
		}
	}

	resetCape(): void {
		this.playerObject.cape.visible = false;
		this.playerObject.elytra.visible = false;
		this.playerObject.cape.map = null;
		this.playerObject.elytra.map = null;
		if (this.capeTexture !== null) {
			this.capeTexture.dispose();
			this.capeTexture = null;
		}
	}

	private updateCapeSway(dt: number): void {
		if (!this._capeSwayEnabled || !this.playerObject.cape.visible) return;

		const currentAzimuth = Math.atan2(this.camera.position.x, this.camera.position.z);

		let azimuthDelta = currentAzimuth - this.lastCameraAzimuth;
		if (azimuthDelta > Math.PI) azimuthDelta -= 2 * Math.PI;
		if (azimuthDelta < -Math.PI) azimuthDelta += 2 * Math.PI;

		this.lastCameraAzimuth = currentAzimuth;

		const targetSway = clamp(azimuthDelta * this._capeDrive, -this._capeMaxSway, this._capeMaxSway);

		const interpolationFactor = clamp01(this._capeStiffness * dt);
		this.capeSway = clamp(lerp(this.capeSway, targetSway, interpolationFactor), -this._capeMaxSway, this._capeMaxSway);

		this.playerObject.cape.rotation.z = this.capeSway;
	}

	/**
	 * Whether cape swaying is currently enabled.
	 *
	 * @see {@link enableCapeSway}
	 * @see {@link disableCapeSway}
	 */
	get capeSwayEnabled(): boolean {
		return this._capeSwayEnabled;
	}

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
	enableCapeSway(): void {
		this._capeSwayEnabled = true;
	}

	/**
	 * Disables cape swaying and resets the cape's sway rotation back to 0.
	 *
	 * @example
	 * ```
	 * skinViewer.disableCapeSway();
	 * ```
	 */
	disableCapeSway(): void {
		this._capeSwayEnabled = false;
		this.capeSway = 0;
		this.playerObject.cape.rotation.z = 0;
	}

	private recreateWingsTexture(): void {
		if (this.wingsTexture !== null) {
			this.wingsTexture.dispose();
		}

		this.wingsTexture = new CanvasTexture(this.wingsCanvas);
		this.wingsTexture.magFilter = NearestFilter;
		this.wingsTexture.minFilter = NearestFilter;
		this.playerObject.wings.map = this.wingsTexture;
	}

	loadDragonWings(empty: null): void;
	loadDragonWings<S extends TextureSource | RemoteImage>(
		source: S,
		options?: DragonWingsRenderOptions
	): S extends TextureSource ? void : Promise<void>;

	loadDragonWings(
		source: TextureSource | RemoteImage | null,
		options: DragonWingsRenderOptions = {}
	): void | Promise<void> {
		if (source === null) {
			this.resetDragonWings();
		} else if (isTextureSource(source)) {
			const ctx = this.wingsCanvas.getContext("2d");
			if (ctx) {
				this.wingsCanvas.width = source.width;
				this.wingsCanvas.height = source.height;
				ctx.clearRect(0, 0, source.width, source.height);
				ctx.drawImage(source, 0, 0);
			}

			this.recreateWingsTexture();

			if (options.makeVisible !== false) {
				this.playerObject.dragonWings.visible = true;
			}
		} else {
			return loadImage(source).then(image => this.loadDragonWings(image, options));
		}
	}

	resetDragonWings(): void {
		this.playerObject.dragonWings.visible = false;
		this.playerObject.dragonWings.map = null;

		if (this.wingsTexture !== null) {
			this.wingsTexture.dispose();
			this.wingsTexture = null;
		}
	}

	/** @deprecated Use {@link loadDragonWings}. */
	loadWings<S extends TextureSource | RemoteImage>(
		source: S,
		options?: DragonWingsRenderOptions
	): S extends TextureSource ? void : Promise<void>;
	loadWings(source: TextureSource | RemoteImage | null, options: DragonWingsRenderOptions = {}): void | Promise<void> {
		// @ts-expect-error
		return this.loadDragonWings(source, options);
	}

	/** @deprecated Use {@link resetDragonWings}. */
	resetWings(): void {
		this.resetDragonWings();
	}

	loadEars(empty: null): void;
	loadEars<S extends TextureSource | RemoteImage>(
		source: S,
		options?: EarsLoadOptions
	): S extends TextureSource ? void : Promise<void>;

	loadEars(source: TextureSource | RemoteImage | null, options: EarsLoadOptions = {}): void | Promise<void> {
		if (source === null) {
			this.resetEars();
		} else if (isTextureSource(source)) {
			if (options.textureType === "skin") {
				loadEarsToCanvasFromSkin(this.earsCanvas, source);
			} else {
				loadEarsToCanvas(this.earsCanvas, source);
			}

			this.recreateEarsTexture();

			if (options.makeVisible !== false) {
				this.playerObject.ears.visible = true;

				if (this._nameTag) {
					this.nameTagYOffset = 25;
					this._nameTag.position.y = this.nameTagYOffset;
				}
			}
		} else {
			return loadImage(source).then(image => this.loadEars(image, options));
		}
	}

	resetEars(): void {
		this.playerObject.ears.visible = false;

		if (this._nameTag) {
			this.nameTagYOffset = 20;
			this._nameTag.position.y = this.nameTagYOffset;
		}

		this.playerObject.ears.map = null;

		if (this.earsTexture !== null) {
			this.earsTexture.dispose();
			this.earsTexture = null;
		}
	}

	loadPanorama<S extends TextureSource | RemoteImage>(source: S): S extends TextureSource ? void : Promise<void> {
		return this.loadBackground(source, EquirectangularReflectionMapping);
	}

	loadMinecraftPanorama<S extends TextureSource | RemoteImage>(
		images: [S, S, S, S, S, S]
	): S extends TextureSource ? void : Promise<void>;

	loadMinecraftPanorama(
		images: [
			TextureSource | RemoteImage,
			TextureSource | RemoteImage,
			TextureSource | RemoteImage,
			TextureSource | RemoteImage,
			TextureSource | RemoteImage,
			TextureSource | RemoteImage,
		]
	): void | Promise<void> {
		if (images.every(isTextureSource)) {
			const sources = images as TextureSource[];
			const [front, right, back, left, top, bottom] = sources;

			const faces: [TextureSource, number][] = [
				[right, 180], // px
				[left, 180], // nx
				[top, 0], // py
				[bottom, 0], // ny
				[front, 180], // pz
				[back, 180], // nz
			];

			const faceCanvases = faces.map(([source, rotation]) => {
				const size = source.width;
				const canvas = document.createElement("canvas");

				canvas.width = size;
				canvas.height = size;

				const ctx = canvas.getContext("2d")!;

				ctx.translate(size / 2, size / 2);
				ctx.rotate((rotation * Math.PI) / 180);
				ctx.scale(1, -1);
				ctx.drawImage(source, -size / 2, -size / 2, size, size);

				return canvas;
			});

			if (this.backgroundTexture !== null) {
				this.backgroundTexture.dispose();
			}

			const cubeTexture = new CubeTexture(faceCanvases);

			cubeTexture.mapping = CubeReflectionMapping;
			cubeTexture.needsUpdate = true;

			this.backgroundTexture = cubeTexture;
			this.scene.background = cubeTexture;

			return;
		} else {
			return Promise.all(images.map(img => (isTextureSource(img) ? img : loadImage(img)))).then(loaded => {
				this.loadMinecraftPanorama(
					loaded as [TextureSource, TextureSource, TextureSource, TextureSource, TextureSource, TextureSource]
				);
			});
		}
	}

	loadBackground<S extends TextureSource | RemoteImage>(
		source: S,
		mapping?: Mapping
	): S extends TextureSource ? void : Promise<void>;

	loadBackground<S extends TextureSource | RemoteImage>(source: S, mapping?: Mapping): void | Promise<void> {
		if (isTextureSource(source)) {
			if (this.backgroundTexture !== null) {
				this.backgroundTexture.dispose();
			}
			this.backgroundTexture = new Texture();
			this.backgroundTexture.image = source;
			if (mapping !== undefined) {
				this.backgroundTexture.mapping = mapping;
			}
			this.backgroundTexture.needsUpdate = true;
			this.scene.background = this.backgroundTexture;
		} else {
			return loadImage(source).then(image => this.loadBackground(image, mapping));
		}
	}

	private loadShadowMesh(): Mesh {
		if (!this.shadowMesh) {
			const geometry = new CircleGeometry(6, 16);

			const material = new MeshBasicMaterial({
				color: 0x000000,
				transparent: true,
				opacity: 0.35,
				depthWrite: false,
				side: FrontSide,
			});

			this.shadowMesh = new Mesh(geometry, material);
			this.shadowMesh.rotation.x = -Math.PI / 2;
			this.shadowMesh.position.y = -16;
		}

		return this.shadowMesh;
	}

	private recreateShadowTexture(): void {
		if (this.shadowTexture !== null) {
			this.shadowTexture.dispose();
		}

		this.shadowTexture = new CanvasTexture(this.shadowCanvas);
		this.shadowTexture.magFilter = NearestFilter;
		this.shadowTexture.minFilter = NearestFilter;

		const material = this.loadShadowMesh().material as MeshBasicMaterial;

		material.map = this.shadowTexture;
		material.color.set(0xffffff);
		material.needsUpdate = true;
	}

	/**
	 * Whether the player shadow is currently enabled.
	 *
	 * @see {@link enableShadow}
	 * @see {@link disableShadow}
	 */
	get shadowEnabled(): boolean {
		return this._shadowEnabled;
	}

	/**
	 * Enables the player shadow.
	 *
	 * @example
	 * ```
	 * skinViewer.enableShadow();
	 * ```
	 */
	enableShadow(): void {
		if (this._shadowEnabled) return;

		this._shadowEnabled = true;
		this.scene.add(this.loadShadowMesh());
	}

	/**
	 * Disables the player shadow, removing it from the scene.
	 *
	 * @example
	 * ```
	 * skinViewer.disableShadow();
	 * ```
	 */
	disableShadow(): void {
		if (!this._shadowEnabled) return;

		this._shadowEnabled = false;

		if (this.shadowMesh) {
			this.scene.remove(this.shadowMesh);
		}
	}

	loadShadow(empty: null): void;
	loadShadow<S extends TextureSource | RemoteImage>(source: S): S extends TextureSource ? void : Promise<void>;

	loadShadow(source: TextureSource | RemoteImage | null): void | Promise<void> {
		if (source === null) {
			this.resetShadow();
		} else if (isTextureSource(source)) {
			const ctx = this.shadowCanvas.getContext("2d");
			if (ctx) {
				this.shadowCanvas.width = source.width;
				this.shadowCanvas.height = source.height;
				ctx.clearRect(0, 0, source.width, source.height);
				ctx.drawImage(source, 0, 0);
			}

			this.recreateShadowTexture();

			if (!this._shadowEnabled) {
				this._shadowEnabled = true;
				this.scene.add(this.loadShadowMesh());
			}
		} else {
			return loadImage(source).then(image => this.loadShadow(image));
		}
	}

	resetShadow(): void {
		if (this.shadowMesh) {
			this.scene.remove(this.shadowMesh);
		}

		this._shadowEnabled = false;

		if (this.shadowTexture !== null) {
			this.shadowTexture.dispose();
			this.shadowTexture = null;
		}

		if (this.shadowMesh) {
			const material = this.shadowMesh.material as MeshBasicMaterial;
			material.map = null;
			material.color.set(0x000000);
			material.needsUpdate = true;
		}
	}

	private draw(): void {
		this.clock.update();
		const dt = this.clock.getDelta();

		if (this._animation !== null) {
			this._animation.update(this.playerObject, dt);
			if (this._nameTag) {
				this._nameTag.position.y =
					this.playerObject.skin.head.getWorldPosition(this.scratchVector3).y + this.nameTagYOffset - 8;
			}
		}

		if (this.autoRotate) {
			if (!(this.controls.enableRotate && this.isUserRotating)) {
				this.playerWrapper.rotation.y += dt * this.autoRotateSpeed;
			}
		}

		this.updateCapeSway(dt);
		this.controls.update();

		this.render();

		this.animationID = window.requestAnimationFrame(this.boundDraw);
	}

	/**
	 * Focuses the camera on a part of the player.
	 */
	focus(target: SkinViewerFocus, zoom?: number): void {
		let object: Object3D;

		if (target === "player") {
			object = this.playerObject;
		} else if (target === "cape") {
			object = this.playerObject.cape;
		} else if (target === "elytra") {
			object = this.playerObject.elytra;
		} else if (target === "dragonWings" || target === "wings") {
			object = this.playerObject.dragonWings;
		} else if (target === "ears") {
			object = this.playerObject.ears;
		} else {
			object = target;
		}

		const position = object.getWorldPosition(this.scratchVector3);

		if (target === "cape" || target === "elytra") {
			position.y = position.y - 7;
		} else if (target === "dragonWings" || target === "wings") {
			position.z = position.z - 4;
		}

		this.controls.target.copy(position);

		if (zoom !== undefined) {
			this.zoom = zoom;
		}

		this.controls.update();
	}

	/**
	 * Renders the scene to the canvas.
	 * This method does not change the animation progress.
	 */
	render(): void {
		this.composer.render();
	}

	setSize(width: number, height: number): void {
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
		this.updateComposerSize();
	}

	dispose(): void {
		if (this._disposed) {
			return;
		}
		this._disposed = true;

		if (this.animationID !== null) {
			window.cancelAnimationFrame(this.animationID);
			this.animationID = null;
		}

		this.canvas.removeEventListener("webglcontextlost", this.onContextLost, false);
		this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored, false);

		this.canvas.removeEventListener("mousedown", this.onMouseDown);
		this.canvas.removeEventListener("mouseup", this.onMouseUp);
		this.canvas.removeEventListener("touchmove", this.onTouchMove);
		this.canvas.removeEventListener("touchend", this.onTouchEnd);

		this.canvas.removeEventListener("keydown", this.onKeyDown);
		this.canvas.removeEventListener("keyup", this.onKeyUp);
		this.canvas.removeEventListener("blur", this.onBlur);

		if (this.devicePixelRatioQuery !== null) {
			this.devicePixelRatioQuery.removeEventListener("change", this.onDevicePixelRatioChange);
			this.devicePixelRatioQuery = null;
		}

		if (this.animationID !== null) {
			window.cancelAnimationFrame(this.animationID);
			this.animationID = null;
		}

		this.controls.dispose();

		this.resetSkin();
		this.resetCape();
		this.resetEars();
		this.resetDragonWings();
		this.resetShadow();

		this.background = null;

		this.composer.dispose();
		(this.fxaaPass.fsQuad as FullScreenQuad | undefined)?.dispose();

		this.renderer.dispose();
	}

	get disposed(): boolean {
		return this._disposed;
	}

	/**
	 * Whether rendering and animations are paused.
	 * Setting this property to true will stop both rendering and animation loops.
	 * Setting it back to false will resume them.
	 */
	get renderPaused(): boolean {
		return this._renderPaused;
	}

	set renderPaused(value: boolean) {
		this._renderPaused = value;

		if (this._renderPaused && this.animationID !== null) {
			window.cancelAnimationFrame(this.animationID);
			this.animationID = null;
			this.clock.reset();
		} else if (
			!this._renderPaused &&
			!this._disposed &&
			!this.renderer.getContext().isContextLost() &&
			this.animationID == null
		) {
			this.animationID = window.requestAnimationFrame(this.boundDraw);
		}
	}

	get width(): number {
		return this.renderer.getSize(new Vector2()).width;
	}

	set width(newWidth: number) {
		this.setSize(newWidth, this.height);
	}

	get height(): number {
		return this.renderer.getSize(new Vector2()).height;
	}

	set height(newHeight: number) {
		this.setSize(this.width, newHeight);
	}

	get background(): null | Color | Texture {
		return this.scene.background;
	}

	set background(value: null | ColorRepresentation | Texture) {
		if (value === null || value instanceof Color || value instanceof Texture) {
			this.scene.background = value;
		} else {
			this.scene.background = new Color(value);
		}
		if (this.backgroundTexture !== null && value !== this.backgroundTexture) {
			this.backgroundTexture.dispose();
			this.backgroundTexture = null;
		}
	}

	adjustCameraDistance(): void {
		let distance = 4.5 + 16.5 / Math.tan(((this.fov / 180) * Math.PI) / 2) / this.zoom;

		// limit distance between 10 ~ 256 (default min / max distance of OrbitControls)
		if (distance < 10) {
			distance = 10;
		} else if (distance > 256) {
			distance = 256;
		}

		this.camera.position.multiplyScalar(distance / this.camera.position.length());
		this.camera.updateProjectionMatrix();
	}

	resetCameraPose(): void {
		this.camera.position.set(0, 0, 1);
		this.camera.rotation.set(0, 0, 0);
		this.adjustCameraDistance();
	}

	get fov(): number {
		return this.camera.fov;
	}

	set fov(value: number) {
		this.camera.fov = value;
		this.adjustCameraDistance();
	}

	get zoom(): number {
		return this._zoom;
	}

	set zoom(value: number) {
		this._zoom = value;
		this.adjustCameraDistance();
	}

	get pixelRatio(): number | "match-device" {
		return this._pixelRatio;
	}

	set pixelRatio(newValue: number | "match-device") {
		if (newValue === "match-device") {
			if (this._pixelRatio !== "match-device") {
				this._pixelRatio = newValue;
				this.onDevicePixelRatioChange();
			}
		} else {
			if (this._pixelRatio === "match-device" && this.devicePixelRatioQuery !== null) {
				this.devicePixelRatioQuery.removeEventListener("change", this.onDevicePixelRatioChange);
				this.devicePixelRatioQuery = null;
			}

			this._pixelRatio = newValue;
			this.renderer.setPixelRatio(newValue);
			this.updateComposerSize();
		}
	}

	/**
	 * The animation that is current playing, or `null` if no animation is playing.
	 *
	 * Setting this property to a different value will change the current animation.
	 * The player's pose and the progress of the new animation will be reset before playing.
	 *
	 * Setting this property to `null` will stop the current animation and reset the player's pose.
	 */
	get animation(): PlayerAnimation | null {
		return this._animation;
	}

	set animation(animation: PlayerAnimation | null) {
		if (this._animation === animation) {
			return;
		}

		this._animation?.reset();

		this.playerObject.resetJoints();
		this.playerObject.position.set(0, 0, 0);
		this.playerObject.rotation.set(0, 0, 0);

		if (this._nameTag) {
			this._nameTag.position.y = this.nameTagYOffset;
		}

		this.clock.reset();

		if (animation !== null) {
			animation.reset();
		}

		this._animation = animation;
	}

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
	get nameTag(): NameTagObject | null {
		return this._nameTag;
	}

	set nameTag(newVal: NameTagObject | string | null) {
		if (this._nameTag !== null) {
			// Remove the old name tag from the scene
			this.playerWrapper.remove(this._nameTag);
		}

		if (newVal !== null) {
			if (!(newVal instanceof Object3D)) {
				newVal = new NameTagObject(newVal);
			}

			// Add the new name tag to the scene
			this.playerWrapper.add(newVal);
			// Set y position
			this.nameTagYOffset = this.playerObject.ears.visible ? 25 : 20;
			newVal.position.y = this.nameTagYOffset;
		}

		this._nameTag = newVal;
	}
}
