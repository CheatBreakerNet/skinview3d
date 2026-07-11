# skinview3d

CheatBreaker's fork of [skinview3d](https://github.com/bs-community/skinview3d)

# Usage

```html
<canvas id="skin_container"></canvas>
<script>
	let skinViewer = new skinview3d.SkinViewer({
		canvas: document.getElementById("skin_container"),
		width: 300,
		height: 400,
		skin: "img/skin.png",
	});

	// Change viewer size
	skinViewer.width = 600;
	skinViewer.height = 800;

	// Load another skin
	skinViewer.loadSkin("img/skin2.png");

	// Load a cape
	skinViewer.loadCape("img/cape.png");

	// Load an elytra (from a cape texture)
	skinViewer.loadCape("img/cape.png", { backEquipment: "elytra" });

	// Unload(hide) the cape / elytra
	skinViewer.loadCape(null);

	// Set the background color
	skinViewer.background = 0x5a76f3;

	// Set the background to a normal image
	skinViewer.loadBackground("img/background.png");

	// Set the background to a panoramic image
	skinViewer.loadPanorama("img/panorama1.png");

	// Change camera FOV
	skinViewer.fov = 70;

	// Zoom out
	skinViewer.zoom = 0.5;

	// Rotate the player
	skinViewer.autoRotate = true;

	// Apply an animation
	skinViewer.animation = new skinview3d.WalkAnimation();

	// Set the speed of the animation
	skinViewer.animation.speed = 3;

	// Pause the animation
	skinViewer.animation.paused = true;

	// Remove the animation
	skinViewer.animation = null;
</script>
```

# Build

`pnpm build`
