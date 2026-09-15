import { type EulerKeyframe } from "./math.js";

export const swimLeftArm: readonly EulerKeyframe[] = [
	{
		time: 0,
		value: {
			x: 0,
			y: Math.PI,
			z: Math.PI,
		},
	},
	{
		time: 0.7 / 1.3,
		value: {
			x: 0,
			y: Math.PI,
			z: (287.2 * Math.PI) / 180,
		},
	},
	{
		time: 1.1 / 1.3,
		value: {
			x: (90 * Math.PI) / 180,
			y: Math.PI,
			z: Math.PI,
		},
	},
	{
		time: 1,
		value: {
			x: 0,
			y: Math.PI,
			z: Math.PI,
		},
	},
];

export const swimRightArm: readonly EulerKeyframe[] = [
	{
		time: 0,
		value: {
			x: 0,
			y: Math.PI,
			z: -Math.PI,
		},
	},
	{
		time: 0.7 / 1.3,
		value: {
			x: 0,
			y: Math.PI,
			z: (-287.2 * Math.PI) / 180,
		},
	},
	{
		time: 1.1 / 1.3,
		value: {
			x: (90 * Math.PI) / 180,
			y: Math.PI,
			z: -Math.PI,
		},
	},
	{
		time: 1,
		value: {
			x: 0,
			y: Math.PI,
			z: -Math.PI,
		},
	},
];
