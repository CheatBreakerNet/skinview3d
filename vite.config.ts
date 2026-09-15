import { defineConfig } from "vite";

export default defineConfig({
	base: "./",
	root: "examples",
	server: {
		port: 9000,
	},
	preview: {
		port: 9000,
	},
	build: {
		rollupOptions: {
			input: {
				main: "./examples/index.html",
				offscreen: "./examples/offscreen-render.html",
			},
		},
	},
});
