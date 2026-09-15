import { Euler, Object3D, Vector3 } from "three";
import { SIXTEEN } from "../../consts.js";
import { degToRad } from "../../math.js";

export interface AttachmentConfig {
	readonly x?: number;
	readonly y?: number;
	readonly z?: number;

	readonly sx?: number;
	readonly sy?: number;
	readonly sz?: number;

	readonly rx?: number;
	readonly ry?: number;
	readonly rz?: number;
}

export interface MeshConfig {
	readonly visible?: boolean;
	readonly normals?: boolean;
	readonly smooth?: boolean;
	readonly texture?: string;
}

export interface PlayerRigConfig {
	readonly name: string;
	readonly primaryMesh: string;

	readonly scale: number;
	readonly scaleItems?: number;
	readonly scaleGui?: number;

	readonly renderHeldItems?: boolean;
	readonly leftHands: Readonly<Record<string, AttachmentConfig>>;
	readonly rightHands: Readonly<Record<string, AttachmentConfig>>;

	readonly head: string;
	readonly body?: string;
	readonly cosmetic?: AttachmentConfig;
	readonly meshes: Readonly<Record<string, MeshConfig>>;
}

export function applyHandAttachment(object: Object3D, config: AttachmentConfig): void {
	object.position.set((config.x ?? 0) * SIXTEEN, (config.y ?? 0) * SIXTEEN, (config.z ?? 0) * SIXTEEN);

	object.rotation.copy(new Euler(degToRad(config.rx ?? 0), degToRad(config.ry ?? 0), degToRad(config.rz ?? 0)));

	object.scale.copy(new Vector3(config.sx ?? 1, config.sy ?? 1, config.sz ?? 1));
}

export type Hand = "left" | "right";

export function getHandAttachment(
	config: PlayerRigConfig,
	hand: Hand
): { boneName: string; config: AttachmentConfig } | null {
	const hands = hand === "left" ? config.leftHands : config.rightHands;
	const entries = Object.entries(hands);

	if (entries.length === 0) {
		return null;
	}

	const [boneName, handConfig] = entries[0];

	return { boneName, config: handConfig };
}
