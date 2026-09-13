import { inferModelType, isTextureSource, loadCapeToCanvas, loadEarsToCanvas, loadEarsToCanvasFromSkin, loadImage, loadSkinToCanvas, } from "skinview-utils";
import { Color, PointLight, EquirectangularReflectionMapping, Group, NearestFilter, PerspectiveCamera, Scene, Texture, Vector2, Vector3, WebGLRenderer, AmbientLight, CanvasTexture, WebGLRenderTarget, FloatType, DepthTexture, Timer, Object3D, ColorManagement, CubeTexture, CubeReflectionMapping, Mesh, CircleGeometry, MeshBasicMaterial, FrontSide, } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { PlayerAnimation } from "./animation.js";
import { PlayerObject } from "./model.js";
import { NameTagObject } from "./nametag.js";
import { clamp, clamp01, lerp } from "./math.js";
/**
 * The SkinViewer renders the player on a canvas.
 */
export class SkinViewer {
    constructor(options = {}) {
        /**
         * The canvas where the renderer draws its output.
         */
        Object.defineProperty(this, "canvas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "camera", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "renderer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * The OrbitControls component which is used to implement the mouse control function.
         *
         * @see {@link https://threejs.org/docs/#examples/en/controls/OrbitControls | OrbitControls - three.js docs}
         */
        Object.defineProperty(this, "controls", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * The player object.
         */
        Object.defineProperty(this, "playerObject", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * A group that wraps the player object.
         * It is used to center the player in the world.
         */
        Object.defineProperty(this, "playerWrapper", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "globalLight", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new AmbientLight(0xffffff, 3)
        });
        Object.defineProperty(this, "cameraLight", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new PointLight(0xffffff, 0.6)
        });
        Object.defineProperty(this, "lastCameraAzimuth", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "composer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "renderPass", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "fxaaPass", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "skinCanvas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "capeCanvas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "earsCanvas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "wingsCanvas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "shadowCanvas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "skinTexture", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "capeTexture", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "earsTexture", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "wingsTexture", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "shadowTexture", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "backgroundTexture", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_disposed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_renderPaused", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_zoom", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "isUserRotating", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "onKeyDown", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "onKeyUp", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "onBlur", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "onMouseDown", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "onMouseUp", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "onTouchMove", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "onTouchEnd", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * Whether cape swaying (a subtle rotation to the cape as the
         * camera orbits around the player) is currently enabled.
         * @defaultValue `false`
         * @see {@link enableCapeSway}
         * @see {@link disableCapeSway}
         */
        Object.defineProperty(this, "_capeSwayEnabled", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "capeSway", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_capeMaxSway", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0.15
        });
        Object.defineProperty(this, "_capeStiffness", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 8.0
        });
        Object.defineProperty(this, "_capeDrive", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 12.0
        });
        /**
         * Whether a shadow mesh (below the player) is currently enabled.
         * @defaultValue `false`
         * @see {@link enableShadow}
         * @see {@link disableShadow}
         */
        Object.defineProperty(this, "_shadowEnabled", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "shadowMesh", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /**
         * Whether to rotate the player along the y axis.
         *
         * @defaultValue `false`
         */
        Object.defineProperty(this, "autoRotate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /**
         * The angular velocity of the player, in rad/s.
         *
         * @defaultValue `1.0`
         * @see {@link autoRotate}
         */
        Object.defineProperty(this, "autoRotateSpeed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1.0
        });
        Object.defineProperty(this, "_animation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "clock", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "animationID", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "onContextLost", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "onContextRestored", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_pixelRatio", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "devicePixelRatioQuery", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "onDevicePixelRatioChange", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_nameTag", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "nameTagYOffset", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 20
        });
        Object.defineProperty(this, "scratchVector3", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Vector3()
        });
        Object.defineProperty(this, "boundDraw", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => this.draw()
        });
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
        }
        else {
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
        }
        else {
            this.animationID = window.requestAnimationFrame(this.boundDraw);
        }
        this.onContextLost = (event) => {
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
        this.onKeyDown = (event) => {
            if (event.code === "Space") {
                event.preventDefault();
                this.doAction(animation => animation.playJump());
            }
            if (event.code === "ShiftLeft") {
                this.doAction(animation => animation.playCrouch(true));
            }
        };
        this.onKeyUp = (event) => {
            if (event.code === "ShiftLeft" && this.animation) {
                this.animation.playCrouch(false);
            }
        };
        this.onBlur = () => {
            this.animation?.playCrouch(false);
        };
        this.onMouseDown = (event) => {
            this.isUserRotating = true;
            if (event.button === 0) {
                this.doAction(animation => animation.playSwing());
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
    doAction(fn) {
        const current = this.animation;
        if (!current)
            return;
        const next = current.interruptForAction() ?? current;
        if (next !== current) {
            this.animation = next;
        }
        fn(next);
    }
    interruptEmote() {
        const current = this.animation;
        if (!current)
            return;
        const next = current.interruptForAction();
        if (next) {
            this.animation = next;
        }
    }
    updateComposerSize() {
        this.composer.setSize(this.width, this.height);
        const pixelRatio = this.renderer.getPixelRatio();
        this.composer.setPixelRatio(pixelRatio);
        this.fxaaPass.material.uniforms["resolution"].value.x = 1 / (this.width * pixelRatio);
        this.fxaaPass.material.uniforms["resolution"].value.y = 1 / (this.height * pixelRatio);
    }
    recreateSkinTexture() {
        if (this.skinTexture !== null) {
            this.skinTexture.dispose();
        }
        this.skinTexture = new CanvasTexture(this.skinCanvas);
        this.skinTexture.magFilter = NearestFilter;
        this.skinTexture.minFilter = NearestFilter;
        this.playerObject.skin.map = this.skinTexture;
        this.playerObject.bobjRig?.setBodyTexture(this.skinTexture);
    }
    recreateCapeTexture() {
        if (this.capeTexture !== null) {
            this.capeTexture.dispose();
        }
        this.capeTexture = new CanvasTexture(this.capeCanvas);
        this.capeTexture.magFilter = NearestFilter;
        this.capeTexture.minFilter = NearestFilter;
        this.playerObject.cape.map = this.capeTexture;
        this.playerObject.elytra.map = this.capeTexture;
    }
    recreateEarsTexture() {
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
    setCosmetic(cosmetic, options = {}) {
        const showCape = cosmetic === "cape";
        this.playerObject.cape.visible = showCape && options.elytra !== true;
        this.playerObject.elytra.visible = showCape && options.elytra === true;
        this.playerObject.dragonWings.visible = cosmetic === "dragonWings";
    }
    loadSkin(source, options = {}) {
        this.interruptEmote();
        if (source === null) {
            this.resetSkin();
        }
        else if (isTextureSource(source)) {
            loadSkinToCanvas(this.skinCanvas, source);
            this.recreateSkinTexture();
            if (options.model === undefined || options.model === "auto-detect") {
                this.playerObject.skin.modelType = inferModelType(this.skinCanvas);
            }
            else {
                this.playerObject.skin.modelType = options.model;
            }
            this.playerObject.syncBOBJModelType();
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
        }
        else {
            return loadImage(source).then(image => this.loadSkin(image, options));
        }
    }
    resetSkin() {
        this.interruptEmote();
        this.playerObject.skin.visible = false;
        this.playerObject.skin.map = null;
        this.playerObject.bobjRig?.setBodyTexture(null);
        if (this.skinTexture !== null) {
            this.skinTexture.dispose();
            this.skinTexture = null;
        }
    }
    loadCape(source, options = {}) {
        this.interruptEmote();
        if (source === null) {
            this.resetCape();
        }
        else if (isTextureSource(source)) {
            loadCapeToCanvas(this.capeCanvas, source);
            this.recreateCapeTexture();
            if (options.makeVisible !== false) {
                this.playerObject.cape.visible = options.elytra !== true;
                this.playerObject.elytra.visible = options.elytra === true;
            }
        }
        else {
            return loadImage(source).then(image => this.loadCape(image, options));
        }
    }
    resetCape() {
        this.interruptEmote();
        this.playerObject.cape.visible = false;
        this.playerObject.elytra.visible = false;
        this.playerObject.cape.map = null;
        this.playerObject.elytra.map = null;
        if (this.capeTexture !== null) {
            this.capeTexture.dispose();
            this.capeTexture = null;
        }
    }
    updateCapeSway(dt) {
        if (!this._capeSwayEnabled || !this.playerObject.cape.visible)
            return;
        const currentAzimuth = Math.atan2(this.camera.position.x, this.camera.position.z);
        let azimuthDelta = currentAzimuth - this.lastCameraAzimuth;
        if (azimuthDelta > Math.PI)
            azimuthDelta -= 2 * Math.PI;
        if (azimuthDelta < -Math.PI)
            azimuthDelta += 2 * Math.PI;
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
    get capeSwayEnabled() {
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
    enableCapeSway() {
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
    disableCapeSway() {
        this._capeSwayEnabled = false;
        this.capeSway = 0;
        this.playerObject.cape.rotation.z = 0;
    }
    recreateWingsTexture() {
        if (this.wingsTexture !== null) {
            this.wingsTexture.dispose();
        }
        this.wingsTexture = new CanvasTexture(this.wingsCanvas);
        this.wingsTexture.magFilter = NearestFilter;
        this.wingsTexture.minFilter = NearestFilter;
        this.playerObject.wings.map = this.wingsTexture;
    }
    loadDragonWings(source, options = {}) {
        this.interruptEmote();
        if (source === null) {
            this.resetDragonWings();
        }
        else if (isTextureSource(source)) {
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
        }
        else {
            return loadImage(source).then(image => this.loadDragonWings(image, options));
        }
    }
    resetDragonWings() {
        this.interruptEmote();
        this.playerObject.dragonWings.visible = false;
        this.playerObject.dragonWings.map = null;
        if (this.wingsTexture !== null) {
            this.wingsTexture.dispose();
            this.wingsTexture = null;
        }
    }
    loadWings(source, options = {}) {
        // @ts-expect-error
        return this.loadDragonWings(source, options);
    }
    /** @deprecated Use {@link resetDragonWings}. */
    resetWings() {
        this.resetDragonWings();
    }
    loadEars(source, options = {}) {
        if (source === null) {
            this.resetEars();
        }
        else if (isTextureSource(source)) {
            if (options.textureType === "skin") {
                loadEarsToCanvasFromSkin(this.earsCanvas, source);
            }
            else {
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
        }
        else {
            return loadImage(source).then(image => this.loadEars(image, options));
        }
    }
    resetEars() {
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
    loadPanorama(source) {
        return this.loadBackground(source, EquirectangularReflectionMapping);
    }
    loadMinecraftPanorama(images) {
        if (images.every(isTextureSource)) {
            const sources = images;
            const [front, right, back, left, top, bottom] = sources;
            const faces = [
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
                // eslint-disable-next-line
                const ctx = canvas.getContext("2d");
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
        }
        else {
            return Promise.all(images.map(img => (isTextureSource(img) ? img : loadImage(img)))).then(loaded => {
                this.loadMinecraftPanorama(loaded);
            });
        }
    }
    loadBackground(source, mapping) {
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
        }
        else {
            return loadImage(source).then(image => this.loadBackground(image, mapping));
        }
    }
    loadShadowMesh() {
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
    recreateShadowTexture() {
        if (this.shadowTexture !== null) {
            this.shadowTexture.dispose();
        }
        this.shadowTexture = new CanvasTexture(this.shadowCanvas);
        this.shadowTexture.magFilter = NearestFilter;
        this.shadowTexture.minFilter = NearestFilter;
        const material = this.loadShadowMesh().material;
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
    get shadowEnabled() {
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
    enableShadow() {
        if (this._shadowEnabled)
            return;
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
    disableShadow() {
        if (!this._shadowEnabled)
            return;
        this._shadowEnabled = false;
        if (this.shadowMesh) {
            this.scene.remove(this.shadowMesh);
        }
    }
    loadShadow(source) {
        if (source === null) {
            this.resetShadow();
        }
        else if (isTextureSource(source)) {
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
        }
        else {
            return loadImage(source).then(image => this.loadShadow(image));
        }
    }
    resetShadow() {
        if (this.shadowMesh) {
            this.scene.remove(this.shadowMesh);
        }
        this._shadowEnabled = false;
        if (this.shadowTexture !== null) {
            this.shadowTexture.dispose();
            this.shadowTexture = null;
        }
        if (this.shadowMesh) {
            const material = this.shadowMesh.material;
            material.map = null;
            material.color.set(0x000000);
            material.needsUpdate = true;
        }
    }
    draw() {
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
    focus(target, zoom) {
        let object;
        if (target === "player") {
            object = this.playerObject;
        }
        else if (target === "head") {
            object = this.playerObject.skin.head;
        }
        else if (target === "cape") {
            object = this.playerObject.cape;
        }
        else if (target === "elytra") {
            object = this.playerObject.elytra;
        }
        else if (target === "dragonWings" || target === "wings") {
            object = this.playerObject.dragonWings;
        }
        else if (target === "ears") {
            object = this.playerObject.ears;
        }
        else {
            object = target;
        }
        const position = object.getWorldPosition(this.scratchVector3);
        if (target === "head") {
            position.y = position.y + 4;
        }
        else if (target === "cape" || target === "elytra") {
            position.y = position.y - 7;
        }
        else if (target === "dragonWings" || target === "wings") {
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
    render() {
        this.composer.render();
    }
    setSize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.updateComposerSize();
    }
    dispose() {
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
        this.fxaaPass.fsQuad?.dispose();
        this.renderer.dispose();
    }
    get disposed() {
        return this._disposed;
    }
    /**
     * Whether rendering and animations are paused.
     * Setting this property to true will stop both rendering and animation loops.
     * Setting it back to false will resume them.
     */
    get renderPaused() {
        return this._renderPaused;
    }
    set renderPaused(value) {
        this._renderPaused = value;
        if (this._renderPaused && this.animationID !== null) {
            window.cancelAnimationFrame(this.animationID);
            this.animationID = null;
            this.clock.reset();
        }
        else if (!this._renderPaused &&
            !this._disposed &&
            !this.renderer.getContext().isContextLost() &&
            this.animationID == null) {
            this.animationID = window.requestAnimationFrame(this.boundDraw);
        }
    }
    get width() {
        return this.renderer.getSize(new Vector2()).width;
    }
    set width(newWidth) {
        this.setSize(newWidth, this.height);
    }
    get height() {
        return this.renderer.getSize(new Vector2()).height;
    }
    set height(newHeight) {
        this.setSize(this.width, newHeight);
    }
    get background() {
        return this.scene.background;
    }
    set background(value) {
        if (value === null || value instanceof Color || value instanceof Texture) {
            this.scene.background = value;
        }
        else {
            this.scene.background = new Color(value);
        }
        if (this.backgroundTexture !== null && value !== this.backgroundTexture) {
            this.backgroundTexture.dispose();
            this.backgroundTexture = null;
        }
    }
    adjustCameraDistance() {
        let distance = 4.5 + 16.5 / Math.tan(((this.fov / 180) * Math.PI) / 2) / this.zoom;
        // limit distance between 10 ~ 256 (default min / max distance of OrbitControls)
        if (distance < 10) {
            distance = 10;
        }
        else if (distance > 256) {
            distance = 256;
        }
        this.camera.position.multiplyScalar(distance / this.camera.position.length());
        this.camera.updateProjectionMatrix();
    }
    resetCameraPose() {
        this.camera.position.set(0, 0, 1);
        this.camera.rotation.set(0, 0, 0);
        this.adjustCameraDistance();
    }
    get fov() {
        return this.camera.fov;
    }
    set fov(value) {
        this.camera.fov = value;
        this.adjustCameraDistance();
    }
    get zoom() {
        return this._zoom;
    }
    set zoom(value) {
        this._zoom = value;
        this.adjustCameraDistance();
    }
    get pixelRatio() {
        return this._pixelRatio;
    }
    set pixelRatio(newValue) {
        if (newValue === "match-device") {
            if (this._pixelRatio !== "match-device") {
                this._pixelRatio = newValue;
                this.onDevicePixelRatioChange();
            }
        }
        else {
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
    get animation() {
        return this._animation;
    }
    set animation(animation) {
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
    get nameTag() {
        return this._nameTag;
    }
    set nameTag(newVal) {
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
//# sourceMappingURL=viewer.js.map