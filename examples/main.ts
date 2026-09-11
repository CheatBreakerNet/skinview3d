import * as skinview3d from "../src/skinview3d";
import type { ModelType } from "skinview-utils";
import type { Cosmetic, SkinViewerFocus } from "../src/skinview3d";

import "./style.css";

const skinParts = ["head", "body", "rightArm", "leftArm", "rightLeg", "leftLeg"];
const skinLayers = ["innerLayer", "outerLayer"];
const allStates = ["Idle", "Swinging", "Jumping", "Crouching"];

const availableAnimations = {
	idle: new skinview3d.IdleAnimation(),
	walk: new skinview3d.WalkAnimation(),
	fly: new skinview3d.FlyAnimation(),
	swim: new skinview3d.SwimAnimation(),
	sit: new skinview3d.SitAnimation(),
};

let skinViewer: skinview3d.SkinViewer;

// id of the addon animation added via `animation.addAnimation()`, if any is active
let spinAddonId: number | undefined;

function obtainTextureUrl(id: string): string {
	const urlInput = document.getElementById(id) as HTMLInputElement;
	const fileInput = document.getElementById(`${id}_upload`) as HTMLInputElement;
	const unsetButton = document.getElementById(`${id}_unset`);
	const file = fileInput?.files?.[0];

	if (!file) {
		if (unsetButton && !unsetButton.classList.contains("hidden")) {
			unsetButton.classList.add("hidden");
		}
		return urlInput?.value || "";
	}

	if (unsetButton) {
		unsetButton.classList.remove("hidden");
	}
	if (urlInput) {
		urlInput.value = `Local file: ${file.name}`;
		urlInput.readOnly = true;
	}
	return URL.createObjectURL(file);
}

function reloadSkin(): void {
	const input = document.getElementById("skin_url") as HTMLInputElement;
	const url = obtainTextureUrl("skin_url");
	if (url === "") {
		skinViewer.loadSkin(null);
		input?.setCustomValidity("");
	} else {
		const skinModel = document.getElementById("skin_model") as HTMLSelectElement;
		const earsSource = document.getElementById("ears_source") as HTMLSelectElement;

		skinViewer
			.loadSkin(url, {
				model: skinModel?.value as ModelType,
				ears: earsSource?.value === "current_skin",
			})
			.then(() => input?.setCustomValidity(""))
			.catch(e => {
				input?.setCustomValidity("Image can't be loaded.");
				console.error(e);
			});
	}
}

function syncCosmetics(): void {
	const capeEnabled = (document.getElementById("cosmetic_cape") as HTMLInputElement)?.checked ?? false;
	const dragonWingsEnabled = (document.getElementById("cosmetic_dragon_wings") as HTMLInputElement)?.checked ?? false;
	const capeStyle = (document.getElementById("cape_style") as HTMLSelectElement)?.value;

	skinViewer.playerObject.capeElytra = capeStyle === "elytra";

	const cosmetics: Cosmetic[] = [];
	if (capeEnabled) cosmetics.push("cape");
	if (dragonWingsEnabled) cosmetics.push("dragonWings");
	skinViewer.playerObject.cosmetics = cosmetics;
}

function reloadCape(): void {
	const input = document.getElementById("cape_url") as HTMLInputElement;
	const url = obtainTextureUrl("cape_url");
	if (url === "") {
		skinViewer.loadCape(null);
		input?.setCustomValidity("");
	} else {
		skinViewer
			.loadCape(url, { makeVisible: false })
			.then(() => {
				input?.setCustomValidity("");
				syncCosmetics();
			})
			.catch(e => {
				input?.setCustomValidity("Image can't be loaded.");
				console.error(e);
			});
	}
}

function reloadDragonWings(): void {
	const input = document.getElementById("dragon_wings_url") as HTMLInputElement;
	const url = obtainTextureUrl("dragon_wings_url");
	if (url === "") {
		skinViewer.loadDragonWings(null);
		input?.setCustomValidity("");
	} else {
		skinViewer
			.loadDragonWings(url, { makeVisible: false })
			.then(() => {
				input?.setCustomValidity("");
				syncCosmetics();
			})
			.catch(e => {
				input?.setCustomValidity("Image can't be loaded.");
				console.error(e);
			});
	}
}

function reloadShadow(): void {
	const input = document.getElementById("shadow_url") as HTMLInputElement;
	const url = obtainTextureUrl("shadow_url");
	const shadowEnabledCheckbox = document.getElementById("shadow_enabled") as HTMLInputElement;

	if (url === "") {
		if (shadowEnabledCheckbox?.checked) {
			skinViewer.enableShadow();
		} else {
			skinViewer.disableShadow();
		}
		input?.setCustomValidity("");
	} else {
		skinViewer
			.loadShadow(url)
			.then(() => {
				input?.setCustomValidity("");
				if (shadowEnabledCheckbox) shadowEnabledCheckbox.checked = true;
			})
			.catch(e => {
				input?.setCustomValidity("Image can't be loaded.");
				console.error(e);
			});
	}
}

function reloadEars(skipSkinReload = false): void {
	const earsSource = document.getElementById("ears_source") as HTMLSelectElement;
	const sourceType = earsSource?.value;
	let hideInput = true;

	if (sourceType === "none") {
		skinViewer.loadEars(null);
	} else if (sourceType === "current_skin") {
		if (!skipSkinReload) {
			reloadSkin();
		}
	} else {
		hideInput = false;
		const options = document.querySelectorAll<HTMLOptionElement>("#default_ears option[data-texture-type]");
		for (const opt of options) {
			opt.disabled = opt.dataset.textureType !== sourceType;
		}

		const input = document.getElementById("ears_url") as HTMLInputElement;
		const url = obtainTextureUrl("ears_url");
		if (url === "") {
			skinViewer.loadEars(null);
			input?.setCustomValidity("");
		} else {
			skinViewer
				.loadEars(url, { textureType: sourceType as "standalone" | "skin" })
				.then(() => input?.setCustomValidity(""))
				.catch(e => {
					input?.setCustomValidity("Image can't be loaded.");
					console.error(e);
				});
		}
	}

	const el = document.getElementById("ears_texture_input");
	if (hideInput) {
		if (el && !el.classList.contains("hidden")) {
			el.classList.add("hidden");
		}
	} else if (el) {
		el.classList.remove("hidden");
	}
}

function updatePanoramaTypeVisibility(): void {
	const panoramaType = (document.getElementById("panorama_type") as HTMLSelectElement)?.value;
	const equirectangularOptions = document.getElementById("panorama_equirectangular_options");
	const minecraftOptions = document.getElementById("panorama_minecraft_options");

	if (panoramaType === "minecraft") {
		equirectangularOptions?.classList.add("hidden");
		minecraftOptions?.classList.remove("hidden");
	} else {
		equirectangularOptions?.classList.remove("hidden");
		minecraftOptions?.classList.add("hidden");
	}
}

function reloadMinecraftPanorama(): void {
	const faceIds = [
		"mc_panorama_front",
		"mc_panorama_right",
		"mc_panorama_back",
		"mc_panorama_left",
		"mc_panorama_top",
		"mc_panorama_bottom",
	];
	const urls = faceIds.map(id => (document.getElementById(id) as HTMLInputElement)?.value ?? "");

	if (urls.some(url => url === "")) {
		console.error("All 6 face URLs are required for a Minecraft panorama.");
		return;
	}

	const result = skinViewer.loadMinecraftPanorama(urls as [string, string, string, string, string, string]);
	if (result) {
		result.catch(e => console.error(e));
	}
}

function reloadPanorama(): void {
	const backgroundTypeInput = document.getElementById("background_type") as HTMLSelectElement;
	backgroundTypeInput.value = "panorama";

	const panoramaType = (document.getElementById("panorama_type") as HTMLSelectElement)?.value;
	if (panoramaType === "minecraft") {
		reloadMinecraftPanorama();
		return;
	}

	const input = document.getElementById("panorama_url") as HTMLInputElement;
	const url = obtainTextureUrl("panorama_url");
	if (url === "") {
		skinViewer.background = null;
		input?.setCustomValidity("");
	} else {
		skinViewer
			.loadPanorama(url)
			.then(() => input?.setCustomValidity(""))
			.catch(e => {
				input?.setCustomValidity("Image can't be loaded.");
				console.error(e);
			});
	}
}

function updateBackground(): void {
	const backgroundType = (document.getElementById("background_type") as HTMLSelectElement)?.value;
	const panoramaSection =
		document.querySelector(".control-section h1")?.textContent === "Panorama"
			? document.querySelector(".control-section h1")?.parentElement
			: null;

	if (backgroundType === "color") {
		const color = (document.getElementById("background_color") as HTMLInputElement)?.value;
		skinViewer.background = color;
		if (panoramaSection) {
			panoramaSection.style.display = "none";
		}
	} else {
		if (panoramaSection) {
			panoramaSection.style.display = "block";
		}
		reloadPanorama();
	}
}

function updateStateBadges(): void {
	const active = skinViewer.animation ? skinViewer.animation.states : new Set(["Idle"]);

	for (const state of allStates) {
		const badge = document.querySelector<HTMLElement>(`.badge[data-state="${state}"]`);

		if (!badge) continue;
		badge.classList.toggle("active", active.has(state as never));
	}

	const fpsCounter = document.getElementById("fps_counter");

	if (fpsCounter) {
		fpsCounter.textContent = skinViewer.renderPaused ? "paused" : "live";
	}

	requestAnimationFrame(updateStateBadges);
}

function reloadNameTag(): void {
	const text = (document.getElementById("nametag_text") as HTMLInputElement)?.value;
	if (text === "") {
		skinViewer.nameTag = null;
	} else {
		skinViewer.nameTag = text;
	}
}

function initializeControls(): void {
	const canvasWidth = document.getElementById("canvas_width") as HTMLInputElement;
	const canvasHeight = document.getElementById("canvas_height") as HTMLInputElement;
	const fov = document.getElementById("fov") as HTMLInputElement;
	const zoom = document.getElementById("zoom") as HTMLInputElement;
	const globalLight = document.getElementById("global_light") as HTMLInputElement;
	const cameraLight = document.getElementById("camera_light") as HTMLInputElement;
	const animationPauseResume = document.getElementById("animation_pause_resume");
	const autoRotate = document.getElementById("auto_rotate") as HTMLInputElement;
	const autoRotateSpeed = document.getElementById("auto_rotate_speed") as HTMLInputElement;
	const controlRotate = document.getElementById("control_rotate") as HTMLInputElement;
	const controlZoom = document.getElementById("control_zoom") as HTMLInputElement;
	const controlPan = document.getElementById("control_pan") as HTMLInputElement;
	const animationSpeed = document.getElementById("animation_speed") as HTMLInputElement;

	canvasWidth?.addEventListener("change", e => {
		const target = e.target as HTMLInputElement;
		skinViewer.width = Number(target.value);
	});

	canvasHeight?.addEventListener("change", e => {
		const target = e.target as HTMLInputElement;
		skinViewer.height = Number(target.value);
	});

	fov?.addEventListener("change", e => {
		const target = e.target as HTMLInputElement;
		skinViewer.fov = Number(target.value);
	});

	zoom?.addEventListener("change", e => {
		const target = e.target as HTMLInputElement;
		skinViewer.zoom = Number(target.value);
	});

	globalLight?.addEventListener("change", e => {
		const target = e.target as HTMLInputElement;
		skinViewer.globalLight.intensity = Number(target.value);
	});

	cameraLight?.addEventListener("change", e => {
		const target = e.target as HTMLInputElement;
		skinViewer.cameraLight.intensity = Number(target.value);
	});

	animationPauseResume?.addEventListener("click", () => {
		if (skinViewer.animation) {
			skinViewer.animation.paused = !skinViewer.animation.paused;
		}
	});

	autoRotate?.addEventListener("change", e => {
		const target = e.target as HTMLInputElement;
		skinViewer.autoRotate = target.checked;
	});

	autoRotateSpeed?.addEventListener("change", e => {
		const target = e.target as HTMLInputElement;
		skinViewer.autoRotateSpeed = Number(target.value);
	});

	const animationRadios = document.querySelectorAll<HTMLInputElement>('input[type="radio"][name="animation"]');
	for (const el of animationRadios) {
		el.addEventListener("change", e => {
			const target = e.target as HTMLInputElement;

			// switching the base animation invalidates any addon we had attached
			spinAddonId = undefined;
			const spinCheckbox = document.getElementById("spin_addon") as HTMLInputElement;
			if (spinCheckbox) spinCheckbox.checked = false;

			if (target.value === "") {
				skinViewer.animation = null;
			} else {
				// @ts-ignore
				skinViewer.animation = availableAnimations[target.value];
				if (skinViewer.animation && animationSpeed) {
					skinViewer.animation.speed = Number(animationSpeed.value);
				}
			}

			syncAllowedActionCheckboxes();
		});
	}

	animationSpeed?.addEventListener("change", e => {
		const target = e.target as HTMLInputElement;

		if (skinViewer.animation) {
			skinViewer.animation.speed = Number(target.value);
		}
	});

	controlRotate?.addEventListener("change", e => {
		const target = e.target as HTMLInputElement;
		skinViewer.controls.enableRotate = target.checked;
	});

	controlZoom?.addEventListener("change", e => {
		const target = e.target as HTMLInputElement;
		skinViewer.controls.enableZoom = target.checked;
	});

	controlPan?.addEventListener("change", e => {
		const target = e.target as HTMLInputElement;
		skinViewer.controls.enablePan = target.checked;
	});

	for (const part of skinParts) {
		for (const layer of skinLayers) {
			const checkbox = document.querySelector<HTMLInputElement>(
				`#layers_table input[type="checkbox"][data-part="${part}"][data-layer="${layer}"]`
			);
			checkbox?.addEventListener("change", e => {
				const target = e.target as HTMLInputElement;
				// @ts-ignore
				skinViewer.playerObject.skin[part][layer].visible = target.checked;
			});
		}
	}

	const initializeUploadButton = (id: string, callback: () => void) => {
		const urlInput = document.getElementById(id) as HTMLInputElement;
		const fileInput = document.getElementById(`${id}_upload`) as HTMLInputElement;
		const unsetButton = document.getElementById(`${id}_unset`);

		const unsetAction = () => {
			if (urlInput) {
				urlInput.readOnly = false;
				urlInput.value = "";
			}
			if (fileInput) {
				fileInput.value = fileInput.defaultValue;
			}
			callback();
		};

		fileInput?.addEventListener("change", () => callback());
		urlInput?.addEventListener("keydown", e => {
			if (e.key === "Backspace" && urlInput?.readOnly) {
				unsetAction();
			}
		});
		unsetButton?.addEventListener("click", () => unsetAction());
	};

	initializeUploadButton("skin_url", reloadSkin);
	initializeUploadButton("cape_url", reloadCape);
	initializeUploadButton("dragon_wings_url", reloadDragonWings);
	initializeUploadButton("ears_url", reloadEars);
	initializeUploadButton("panorama_url", reloadPanorama);
	initializeUploadButton("shadow_url", reloadShadow);

	const skinUrl = document.getElementById("skin_url") as HTMLInputElement;
	const skinModel = document.getElementById("skin_model") as HTMLSelectElement;
	const capeUrl = document.getElementById("cape_url") as HTMLInputElement;
	const dragonWingsUrl = document.getElementById("dragon_wings_url") as HTMLInputElement;
	const earsSource = document.getElementById("ears_source") as HTMLSelectElement;
	const earsUrl = document.getElementById("ears_url") as HTMLInputElement;
	const panoramaUrl = document.getElementById("panorama_url") as HTMLInputElement;
	const shadowUrl = document.getElementById("shadow_url") as HTMLInputElement;

	skinUrl?.addEventListener("change", reloadSkin);
	skinModel?.addEventListener("change", reloadSkin);
	capeUrl?.addEventListener("change", reloadCape);
	dragonWingsUrl?.addEventListener("change", reloadDragonWings);
	earsSource?.addEventListener("change", () => reloadEars());
	earsUrl?.addEventListener("change", () => reloadEars());
	panoramaUrl?.addEventListener("change", reloadPanorama);
	shadowUrl?.addEventListener("change", reloadShadow);

	const panoramaType = document.getElementById("panorama_type") as HTMLSelectElement;
	panoramaType?.addEventListener("change", () => {
		updatePanoramaTypeVisibility();
		reloadPanorama();
	});

	const mcPanoramaLoad = document.getElementById("mc_panorama_load");
	mcPanoramaLoad?.addEventListener("click", reloadMinecraftPanorama);

	updatePanoramaTypeVisibility();

	const cosmeticCape = document.getElementById("cosmetic_cape") as HTMLInputElement;
	const cosmeticDragonWings = document.getElementById("cosmetic_dragon_wings") as HTMLInputElement;
	const capeStyle = document.getElementById("cape_style") as HTMLSelectElement;

	cosmeticCape?.addEventListener("change", syncCosmetics);
	cosmeticDragonWings?.addEventListener("change", syncCosmetics);
	capeStyle?.addEventListener("change", syncCosmetics);

	const capeSwayEnabled = document.getElementById("cape_sway_enabled") as HTMLInputElement;
	capeSwayEnabled?.addEventListener("change", e => {
		const target = e.target as HTMLInputElement;
		if (target.checked) {
			skinViewer.enableCapeSway();
		} else {
			skinViewer.disableCapeSway();
		}
	});

	const shadowEnabled = document.getElementById("shadow_enabled") as HTMLInputElement;
	shadowEnabled?.addEventListener("change", e => {
		const target = e.target as HTMLInputElement;
		if (target.checked) {
			skinViewer.enableShadow();
		} else {
			skinViewer.disableShadow();
		}
	});

	const focusApply = document.getElementById("focus_apply");
	focusApply?.addEventListener("click", () => {
		const focusTarget = document.getElementById("focus_target") as HTMLSelectElement;
		const focusZoom = document.getElementById("focus_zoom") as HTMLInputElement;
		const zoomValue = focusZoom?.value === "" ? undefined : Number(focusZoom.value);
		skinViewer.focus(focusTarget?.value as SkinViewerFocus, zoomValue);
	});

	const resetAll = document.getElementById("reset_all");

	resetAll?.addEventListener("click", () => {
		skinViewer.dispose();
		initializeViewer();
	});

	const nametagText = document.getElementById("nametag_text") as HTMLInputElement;
	nametagText?.addEventListener("change", reloadNameTag);

	const backgroundType = document.getElementById("background_type") as HTMLSelectElement;
	const backgroundColor = document.getElementById("background_color") as HTMLInputElement;

	backgroundType?.addEventListener("change", updateBackground);
	backgroundColor?.addEventListener("change", () => {
		backgroundType.value = "color";
		updateBackground();
	});

	// Set panorama as default
	if (backgroundType) {
		backgroundType.value = "panorama";
	}

	// Initialize background type
	updateBackground();
}

function syncAllowedActionCheckboxes(): void {
	const allow = skinViewer.animation?.allowedActions ?? { jump: true, swing: true, crouch: true };
	const jump = document.getElementById("allow_jump") as HTMLInputElement;
	const swing = document.getElementById("allow_swing") as HTMLInputElement;
	const crouch = document.getElementById("allow_crouch") as HTMLInputElement;
	if (jump) jump.checked = allow.jump;
	if (swing) swing.checked = allow.swing;
	if (crouch) crouch.checked = allow.crouch;
}

function initializeViewer(): void {
	const skinContainer = document.getElementById("skin_container") as HTMLCanvasElement;
	if (!skinContainer) {
		throw new Error("Canvas element not found");
	}

	skinViewer = new skinview3d.SkinViewer({
		canvas: skinContainer,
	});

	const canvasWidth = document.getElementById("canvas_width") as HTMLInputElement;
	const canvasHeight = document.getElementById("canvas_height") as HTMLInputElement;
	const fov = document.getElementById("fov") as HTMLInputElement;
	const zoom = document.getElementById("zoom") as HTMLInputElement;
	const globalLight = document.getElementById("global_light") as HTMLInputElement;
	const cameraLight = document.getElementById("camera_light") as HTMLInputElement;
	const autoRotate = document.getElementById("auto_rotate") as HTMLInputElement;
	const autoRotateSpeed = document.getElementById("auto_rotate_speed") as HTMLInputElement;
	const controlRotate = document.getElementById("control_rotate") as HTMLInputElement;
	const controlZoom = document.getElementById("control_zoom") as HTMLInputElement;
	const controlPan = document.getElementById("control_pan") as HTMLInputElement;
	const animationSpeed = document.getElementById("animation_speed") as HTMLInputElement;

	skinViewer.width = Number(canvasWidth?.value);
	skinViewer.height = Number(canvasHeight?.value);
	skinViewer.fov = Number(fov?.value);
	skinViewer.zoom = Number(zoom?.value);
	skinViewer.globalLight.intensity = Number(globalLight?.value);
	skinViewer.cameraLight.intensity = Number(cameraLight?.value);
	skinViewer.autoRotate = autoRotate?.checked ?? false;
	skinViewer.autoRotateSpeed = Number(autoRotateSpeed?.value);

	const animationRadio = document.querySelector<HTMLInputElement>('input[type="radio"][name="animation"]:checked');
	const animationName = animationRadio?.value;
	if (animationName) {
		// @ts-ignore
		skinViewer.animation = availableAnimations[animationName];

		if (skinViewer.animation && animationSpeed) {
			skinViewer.animation.speed = Number(animationSpeed.value);
		}
	}

	skinViewer.controls.enableRotate = controlRotate?.checked ?? false;
	skinViewer.controls.enableZoom = controlZoom?.checked ?? false;
	skinViewer.controls.enablePan = controlPan?.checked ?? false;

	for (const part of skinParts) {
		for (const layer of skinLayers) {
			const checkbox = document.querySelector<HTMLInputElement>(
				`#layers_table input[type="checkbox"][data-part="${part}"][data-layer="${layer}"]`
			);

			// @ts-ignore
			skinViewer.playerObject.skin[part][layer].visible = checkbox?.checked ?? false;
		}
	}

	reloadSkin();
	reloadCape();
	reloadDragonWings();
	reloadEars(true);
	reloadPanorama();
	reloadNameTag();
	syncCosmetics();

	const capeSwayEnabled = document.getElementById("cape_sway_enabled") as HTMLInputElement;
	if (capeSwayEnabled?.checked) {
		skinViewer.enableCapeSway();
	}

	const shadowEnabledCheckbox = document.getElementById("shadow_enabled") as HTMLInputElement;
	const shadowUrlValue = (document.getElementById("shadow_url") as HTMLInputElement)?.value;
	if (shadowUrlValue) {
		reloadShadow();
	} else if (shadowEnabledCheckbox?.checked) {
		skinViewer.enableShadow();
	}

	syncAllowedActionCheckboxes();
}

initializeViewer();
initializeControls();
updateStateBadges();
