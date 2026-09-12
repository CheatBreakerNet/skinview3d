export interface BOBJWeight {
	readonly bone: string;
	readonly weight: number;
}

export interface BOBJVertex {
	readonly x: number;
	readonly y: number;
	readonly z: number;
	readonly weights: readonly BOBJWeight[];
}

export interface BOBJFaceCorner {
	readonly position: number;
	readonly texCoord: number; // -1 if absent
	readonly normal: number; // -1 if absent
}

export interface BOBJFace {
	readonly corners: readonly [BOBJFaceCorner, BOBJFaceCorner, BOBJFaceCorner];
}

export interface BOBJMeshDef {
	readonly name: string;
	readonly armatureName: string | null;
	readonly faces: BOBJFace[];
}

export interface BOBJBoneDef {
	readonly index: number;
	readonly name: string;
	readonly parent: string | null;
	readonly tail: readonly [number, number, number];
	readonly matrix: readonly number[];
}

export interface BOBJArmatureDef {
	readonly name: string;
	readonly bones: readonly BOBJBoneDef[];
	readonly bonesByName: ReadonlyMap<string, BOBJBoneDef>;
}

export interface BOBJMeshFile {
	readonly vertices: readonly BOBJVertex[];
	readonly uvs: readonly (readonly [number, number])[];
	readonly normals: readonly (readonly [number, number, number])[];
	readonly meshes: ReadonlyMap<string, BOBJMeshDef>;
	readonly armatures: ReadonlyMap<string, BOBJArmatureDef>;
}

function eliminateTinyWeights(weights: BOBJWeight[]): BOBJWeight[] {
	const kept = weights.filter(weight => weight.weight >= 0.05);

	if (kept.length === 0) return [];

	let sum = 0;
	for (const weight of kept) sum += weight.weight;

	if (sum <= 0) return [];

	return kept.map(weight => ({
		bone: weight.bone,
		weight: weight.weight / sum,
	}));
}

function isNumericToken(value: string | undefined): boolean {
	return value !== undefined && value !== "" && !Number.isNaN(Number(value));
}

function parseFaceCorner(value: string): BOBJFaceCorner {
	const parts = value.split("/");

	const position = Number.parseInt(parts[0], 10) - 1;
	const texCoord = parts.length > 1 && parts[1].length > 0 ? Number.parseInt(parts[1], 10) - 1 : -1;
	const normal = parts.length > 2 && parts[2].length > 0 ? Number.parseInt(parts[2], 10) - 1 : -1;

	return { position, texCoord, normal };
}

export function parseMesh(data: string): BOBJMeshFile {
	const vertices: BOBJVertex[] = [];
	const uvs: (readonly [number, number])[] = [];
	const normals: (readonly [number, number, number])[] = [];
	const meshes = new Map<string, BOBJMeshFile>();
	const armatures = new Map<string, { name: string; bones: BOBJBoneDef[]; bonesByName: Map<string, BOBJBoneDef> }>();

	let mesh: BOBJMeshDef | null = null;
	let armature: { name: string; bones: BOBJBoneDef[]; bonesByName: Map<string, BOBJBoneDef> } | null = null;
	let pendingWeights: BOBJWeight[] = [];
	let boneIndex = 0;

	const lines = data.split(/\r?\n/);

	const flushVertex = () => {
		if (vertices.length === 0) return;

		const last = vertices[vertices.length - 1];

		if (pendingWeights.length > 0 || last.weights.length > 0) {
			const finalWeights = eliminateTinyWeights(pendingWeights);
			vertices[vertices.length - 1] = { ...last, weights: finalWeights };
		}

		pendingWeights = [];
	};

	for (const line of lines) {
		if (line.length === 0) continue;

		const values = line.trim().split(/\s+/);
		const tag = values[0];

		if (tag === "o") {
			flushVertex();

			mesh = { name: values[1], armatureName: null, faces: [] };
			// @ts-expect-error
			meshes.set(mesh.name, mesh);

			armature = null;
		} else if (tag === "o_arm") {
			if (mesh) {
				(mesh as { armatureName: string | null }).armatureName = values[1];
			}
		} else if (tag === "v") {
			flushVertex();
			vertices.push({
				x: Number.parseFloat(values[1]),
				y: Number.parseFloat(values[2]),
				z: Number.parseFloat(values[3]),
				weights: [],
			});
		} else if (tag === "vw") {
			const weight = Number.parseFloat(values[2]);

			if (weight === 0) continue;

			pendingWeights.push({ bone: values[1], weight });
		} else if (tag === "vt") {
			uvs.push([Number.parseFloat(values[1]), Number.parseFloat(values[2])]);
		} else if (tag === "vn") {
			normals.push([Number.parseFloat(values[1]), Number.parseFloat(values[2]), Number.parseFloat(values[3])]);
		} else if (tag === "f") {
			if (!mesh) continue;

			mesh.faces.push({
				corners: [parseFaceCorner(values[1]), parseFaceCorner(values[2]), parseFaceCorner(values[3])],
			});
		} else if (tag === "arm_name") {
			boneIndex = 0;

			armature = { name: values[1], bones: [], bonesByName: new Map() };
			armatures.set(armature.name, armature);
		} else if (tag === "arm_action") {
			// balls
		} else if (tag === "arm_bone") {
			if (!armature) continue;

			const name = values[1];
			const hasParent = !isNumericToken(values[2]);

			const parent = hasParent ? values[2] || null : null;
			const tailStart = hasParent ? 3 : 2;

			const tail: [number, number, number] = [
				Number.parseFloat(values[tailStart]),
				Number.parseFloat(values[tailStart + 1]),
				Number.parseFloat(values[tailStart + 2]),
			];

			const matrix = values.slice(tailStart + 3, tailStart + 19).map(Number.parseFloat);

			if (matrix.length !== 16) {
				console.warn(`Invalid matrix for bone "${name}"`, values);
				continue;
			}

			const bone: BOBJBoneDef = {
				index: boneIndex++,
				name,
				parent,
				tail,
				matrix,
			};

			armature.bones.push(bone);
			armature.bonesByName.set(name, bone);
		} else if (tag === "arm_ik") {
			// balls
		}
	}

	flushVertex();

	// @ts-expect-error TODO
	return { vertices, uvs, normals, meshes, armatures };
}

export function mergeBobjMesh(base: BOBJMeshFile, other: BOBJMeshFile): BOBJMeshFile {
	const vertexOffset = base.vertices.length;
	const normalOffset = base.normals.length;
	const uvOffset = base.uvs.length;

	const vertices = [...base.vertices, ...other.vertices];
	const uvs = [...base.uvs, ...other.uvs];
	const normals = [...base.normals, ...other.normals];

	const meshes = new Map(base.meshes);
	const armatures = new Map(base.armatures);

	for (const [name, armature] of other.armatures) {
		if (!armatures.has(name)) armatures.set(name, armature);
	}

	for (const mesh of other.meshes.values()) {
		const faces = mesh.faces.map(face => ({
			corners: face.corners.map(corner => ({
				position: corner.position + vertexOffset,
				texCoord: corner.texCoord < 0 ? -1 : corner.texCoord + uvOffset,
				normal: corner.normal < 0 ? -1 : corner.normal + normalOffset,
			})) as [BOBJFaceCorner, BOBJFaceCorner, BOBJFaceCorner],
		}));

		meshes.set(mesh.name, { name: mesh.name, armatureName: mesh.armatureName, faces });
	}

	return { vertices, uvs, normals, meshes, armatures };
}
