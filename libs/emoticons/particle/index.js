/* eslint-disable indent */
import { BoxGeometry, BufferAttribute, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, NearestFilter, Object3D, PlaneGeometry, Texture, Vector3, } from "three";
import { TICK_RATE, SIXTEEN } from "../../consts.js";
import { clamp01, jitter } from "../../math.js";
const GRAVITY = 0.04 * SIXTEEN;
const DRAG = 0.98;
// Prop scales
const SCALE_POPCORN = 0.75;
const SCALE_SALT = 0.5;
const SCALE_GENERIC = 0.6;
function rngPalette(size) {
    const geometry = new BoxGeometry(1, 1, 1);
    const uv = geometry.attributes.uv;
    const cellX = Math.floor(Math.random() * size);
    const cellY = Math.floor(Math.random() * size);
    const remapped = new Float32Array(uv.count * 2);
    for (let i = 0; i < uv.count; i++) {
        remapped[i * 2] = (uv.getX(i) + cellX) / size;
        remapped[i * 2 + 1] = (uv.getY(i) + cellY) / size;
    }
    uv.set(remapped);
    uv.needsUpdate = true;
    return geometry;
}
function croppedPlane(u0, u1, v0, v1) {
    const geometry = new PlaneGeometry(1, 1);
    const uv = geometry.attributes.uv;
    const top = 1 - v0;
    const bottom = 1 - v1;
    uv.setXY(0, u0, top);
    uv.setXY(1, u1, top);
    uv.setXY(2, u0, bottom);
    uv.setXY(3, u1, bottom);
    uv.needsUpdate = true;
    return geometry;
}
export class ParticleSystem extends Group {
    constructor(textures) {
        super();
        Object.defineProperty(this, "_particles", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "_popcornMaterial", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_saltMaterial", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_saltGeometry", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = "emoteParticles";
        this._popcornMaterial = new MeshBasicMaterial({
            side: DoubleSide,
        });
        this._saltMaterial = new MeshBasicMaterial({
            side: DoubleSide,
            transparent: true,
        });
        this._saltGeometry = croppedPlane(0, 4 / 64, 0, 8 / 64);
        if (textures) {
            this.setTextures(textures);
        }
    }
    setTextures(textures) {
        if (textures.popcorn) {
            textures.popcorn.magFilter = NearestFilter;
            textures.popcorn.minFilter = NearestFilter;
            this._popcornMaterial.map = textures.popcorn;
            this._popcornMaterial.needsUpdate = true;
        }
        if (textures.salt) {
            textures.salt.magFilter = NearestFilter;
            textures.salt.minFilter = NearestFilter;
            this._saltMaterial.map = textures.salt;
            this._saltMaterial.needsUpdate = true;
        }
    }
    // This is for the `PopcornEmote` emote
    spawnPopcorn(position, count = 1, motionY = 0.1 * SIXTEEN) {
        for (let i = 0; i < count; i++) {
            const geometry = rngPalette(16);
            const mesh = new Mesh(geometry, this._popcornMaterial);
            const velocity = new Vector3(Math.random() * 0.05 * SIXTEEN, motionY === 0 ? 0 : Math.random() * 0.1 * SIXTEEN + motionY, Math.random() * 0.05 * SIXTEEN);
            this._addParticle(mesh, position, velocity, {
                gravity: GRAVITY,
                baseScale: SCALE_POPCORN,
                billboard: false,
                ownsMaterial: false,
            });
        }
    }
    // This is for the `PureSaltEmote` emote
    spawnSalt(position, count = 1, motionY = 0) {
        for (let i = 0; i < count; i++) {
            const mesh = new Mesh(this._saltGeometry, this._saltMaterial);
            const velocity = new Vector3(Math.random() * 0.05 * SIXTEEN, motionY, Math.random() * 0.05 * SIXTEEN);
            this._addParticle(mesh, position, velocity, {
                gravity: GRAVITY,
                baseScale: SCALE_SALT,
                billboard: true,
                ownsMaterial: false,
            });
        }
    }
    // This is for the `StarPower` emote
    spawnPuff(position, kind, count = 1, color) {
        const defaults = {
            cloud: 0xf5f5f5,
            tear: 0x7ec8f2,
            crumb: 0x9acd32,
            sparkle: 0xffe066,
        };
        for (let i = 0; i < count; i++) {
            const material = new MeshBasicMaterial({
                color: new Color(color ?? defaults[kind]),
                transparent: true,
                opacity: 0.9,
                side: DoubleSide,
            });
            const mesh = new Mesh(new PlaneGeometry(1, 1), material);
            const velocity = kind === "tear"
                ? new Vector3(jitter(0.02 * SIXTEEN), -1 * SIXTEEN, jitter(0.02 * SIXTEEN))
                : new Vector3(jitter(0.05 * SIXTEEN), kind === "cloud" ? -0.025 * SIXTEEN : jitter(0.05 * SIXTEEN), jitter(0.05 * SIXTEEN));
            this._addParticle(mesh, position, velocity, {
                gravity: kind === "sparkle" || kind === "cloud" ? 0 : GRAVITY * 0.3,
                baseScale: SCALE_GENERIC,
                billboard: true,
                ownsMaterial: true,
            });
        }
    }
    _addParticle(mesh, position, velocity, options) {
        mesh.position.copy(position);
        mesh.scale.setScalar(options.baseScale);
        this.add(mesh);
        this._particles.push({
            mesh,
            velocity,
            gravity: options.gravity,
            baseScale: options.baseScale,
            billboard: options.billboard,
            ownsMaterial: options.ownsMaterial,
            age: 0,
            // 20 + rand(10) ticks, matching EntityFX's
            // particleMaxAge in the Java source.
            maxAge: 20 + Math.floor(Math.random() * 10),
        });
    }
    update(deltaSeconds, facing) {
        if (deltaSeconds <= 0 || this._particles.length === 0) {
            return;
        }
        const ticks = deltaSeconds * TICK_RATE;
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const particle = this._particles[i];
            particle.age += ticks;
            if (particle.age >= particle.maxAge) {
                this.remove(particle.mesh);
                particle.mesh.geometry.dispose();
                if (particle.ownsMaterial) {
                    const material = particle.mesh.material;
                    if (Array.isArray(material)) {
                        for (const mat of material) {
                            mat.dispose();
                        }
                    }
                    else {
                        material.dispose();
                    }
                }
                this._particles.splice(i, 1);
                continue;
            }
            particle.velocity.y -= particle.gravity * ticks;
            particle.velocity.multiplyScalar(Math.pow(DRAG, ticks));
            particle.mesh.position.addScaledVector(particle.velocity, ticks);
            const remaining = particle.maxAge - particle.age;
            const fade = remaining < 5 ? clamp01(remaining / 5) : 1;
            particle.mesh.scale.setScalar(particle.baseScale * fade);
            if (particle.billboard && facing) {
                particle.mesh.quaternion.copy(facing.quaternion);
            }
        }
    }
    /**
     * Remove and dispose every active particle.
     */
    clear() {
        for (const particle of this._particles) {
            this.remove(particle.mesh);
            particle.mesh.geometry.dispose();
            if (particle.ownsMaterial) {
                const material = particle.mesh.material;
                if (Array.isArray(material)) {
                    for (const mat of material) {
                        mat.dispose();
                    }
                }
                else {
                    material.dispose();
                }
            }
        }
        this._particles.length = 0;
        return this;
    }
    /**
     * Count of active particles.
     */
    get count() {
        return this._particles.length;
    }
}
//# sourceMappingURL=index.js.map