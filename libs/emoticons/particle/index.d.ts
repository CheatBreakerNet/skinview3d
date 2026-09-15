import { Group, Object3D, Texture, Vector3, type ColorRepresentation } from "three";
export type ParticleKind = "popcorn" | "salt" | "cloud" | "tear" | "crumb" | "sparkle";
export interface ParticleTextures {
    popcorn?: Texture;
    salt?: Texture;
    minecraft?: Texture;
}
export declare class ParticleSystem extends Group {
    private readonly _particles;
    private readonly _popcornMaterial;
    private readonly _saltMaterial;
    private readonly _minecraftMaterial;
    private readonly _facingQuaternion;
    private readonly _inverseWorldQuaternion;
    constructor(textures?: ParticleTextures);
    setTextures(textures: ParticleTextures): void;
    spawnPopcorn(position: Vector3, count?: number, motionY?: number): void;
    spawnSalt(position: Vector3, count?: number, motionY?: number): void;
    spawnEnchantment(position: Vector3, count?: number): void;
    spawnSpell(position: Vector3, color: ColorRepresentation, count?: number): void;
    spawnPuff(position: Vector3, kind: "cloud" | "tear" | "crumb" | "sparkle", count?: number, color?: ColorRepresentation): void;
    private _addParticle;
    update(deltaSeconds: number, facing?: Object3D): void;
    /**
     * Remove and dispose every active particle.
     */
    clear(): this;
    /**
     * Count of active particles.
     */
    get count(): number;
}
