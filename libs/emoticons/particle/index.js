/* eslint-disable indent */
import { BoxGeometry, BufferAttribute, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, NearestFilter, Object3D, PlaneGeometry, Quaternion, Texture, Vector3, } from "three";
import { TICK_RATE, SIXTEEN } from "../../consts.js";
import { clamp01, jitter } from "../../math.js";
const GRAVITY = 0.04 * SIXTEEN;
const DRAG = 0.98;
// Prop scales
const SCALE_POPCORN = 0.75;
const SCALE_SALT = 0.5;
const SCALE_GENERIC = 0.6;
function kernelGeometry(row, salt = false) {
    const geometry = new BoxGeometry(1, 1, 1);
    const uv = geometry.attributes.uv;
    const faces = [
        [2, row + 1],
        [0, row + 1],
        [1, row],
        [2, row],
        [3, row + 1],
        [1, row + 1],
    ];
    for (let face = 0; face < faces.length; face++) {
        const [u, v] = faces[face];
        for (let corner = 0; corner < 4; corner++) {
            const i = face * 4 + corner;
            uv.setXY(i, (u + uv.getX(i)) / 64, 1 - (v + 1 - uv.getY(i)) / 64);
        }
    }
    uv.needsUpdate = true;
    geometry.translate(salt ? 0.25 : 0, salt ? 0.25 : 0, salt ? 0.75 : 1);
    return geometry;
}
function croppedPlane(u0, u1, v0, v1) {
    const geometry = new PlaneGeometry(1, 1);
    setPlaneUVs(geometry, u0, u1, v0, v1);
    return geometry;
}
function setPlaneUVs(geometry, u0, u1, v0, v1) {
    const uv = geometry.attributes.uv;
    const top = 1 - v0;
    const bottom = 1 - v1;
    uv.setXY(0, u0, top);
    uv.setXY(1, u1, top);
    uv.setXY(2, u0, bottom);
    uv.setXY(3, u1, bottom);
    uv.needsUpdate = true;
}
function setSprite(geometry, index) {
    const u = (index % 16) / 16;
    const v = Math.floor(index / 16) / 16;
    setPlaneUVs(geometry, u, u + 0.0624375, v, v + 0.0624375);
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
        Object.defineProperty(this, "_minecraftMaterial", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_facingQuaternion", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Quaternion()
        });
        Object.defineProperty(this, "_inverseWorldQuaternion", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Quaternion()
        });
        this.name = "emoteParticles";
        this._popcornMaterial = new MeshBasicMaterial({
            side: DoubleSide,
            alphaTest: 0.01,
            toneMapped: false,
        });
        this._saltMaterial = new MeshBasicMaterial({
            side: DoubleSide,
            alphaTest: 0.01,
            toneMapped: false,
        });
        this._minecraftMaterial = new MeshBasicMaterial({
            side: DoubleSide,
            transparent: true,
            depthWrite: false,
            alphaTest: 0.01,
            toneMapped: false,
        });
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
        if (textures.minecraft) {
            textures.minecraft.magFilter = NearestFilter;
            textures.minecraft.minFilter = NearestFilter;
            this._minecraftMaterial.map = textures.minecraft;
            this._minecraftMaterial.needsUpdate = true;
            for (const particle of this._particles) {
                if (particle.behavior === "falling")
                    continue;
                const material = particle.mesh.material;
                material.map = textures.minecraft;
                material.needsUpdate = true;
            }
        }
    }
    // This is for the `PopcornEmote` emote
    spawnPopcorn(position, count = 1, motionY = 0.1 * SIXTEEN) {
        for (let i = 0; i < count; i++) {
            const geometry = kernelGeometry(2 + Math.floor(Math.random() * 2) * 2);
            const mesh = new Mesh(geometry, this._popcornMaterial);
            const velocity = new Vector3(Math.random() * 0.05 * SIXTEEN, motionY === 0 ? 0 : Math.random() * 0.1 * SIXTEEN + motionY, Math.random() * 0.05 * SIXTEEN);
            this._addParticle(mesh, position, velocity, {
                gravity: GRAVITY * 0.5,
                baseScale: SCALE_POPCORN,
                billboard: false,
                ownsMaterial: false,
            });
        }
    }
    // This is for the `PureSaltEmote` emote
    spawnSalt(position, count = 1, motionY = 0) {
        for (let i = 0; i < count; i++) {
            const mesh = new Mesh(kernelGeometry(0, true), this._saltMaterial);
            const velocity = new Vector3(Math.random() * 0.05 * SIXTEEN, motionY, Math.random() * 0.05 * SIXTEEN);
            this._addParticle(mesh, position, velocity, {
                gravity: GRAVITY * 0.5,
                baseScale: SCALE_SALT,
                billboard: false,
                ownsMaterial: false,
            });
        }
    }
    spawnEnchantment(position, count = 15) {
        for (let i = 0; i < count; i++) {
            const material = this._minecraftMaterial.clone();
            const brightness = Math.random() * 0.6 + 0.4;
            material.color.setRGB(brightness * 0.9, brightness * 0.9, brightness);
            const geometry = croppedPlane(0, 1, 0, 1);
            setSprite(geometry, 225 + Math.floor(Math.random() * 26));
            const velocity = new Vector3(jitter(0.025 * SIXTEEN), jitter(0.025 * SIXTEEN), jitter(0.025 * SIXTEEN));
            this._addParticle(new Mesh(geometry, material), position, velocity, {
                gravity: 0,
                baseScale: (Math.random() * 0.5 + 0.2) * 0.2 * SIXTEEN,
                billboard: true,
                ownsMaterial: true,
                behavior: "enchantment",
                maxAge: 30 + Math.floor(Math.random() * 10),
            });
        }
    }
    spawnSpell(position, color, count = 7) {
        for (let i = 0; i < count; i++) {
            const material = this._minecraftMaterial.clone();
            material.color.set(color);
            const geometry = croppedPlane(0, 1, 0, 1);
            setSprite(geometry, 128);
            const velocity = new Vector3(jitter(0.5) + jitter(0.4), material.color.g + jitter(0.4), jitter(0.5) + jitter(0.4));
            velocity.normalize().multiplyScalar((Math.random() + Math.random() + 1) * 0.15 * 0.4);
            velocity.y = (velocity.y + 0.1) * 0.2;
            if (material.color.r === 0 && material.color.b === 0) {
                velocity.x *= 0.1;
                velocity.z *= 0.1;
            }
            velocity.multiplyScalar(SIXTEEN);
            const origin = position
                .clone()
                .add(new Vector3(jitter(0.025 * SIXTEEN), jitter(0.025 * SIXTEEN), jitter(0.025 * SIXTEEN)));
            this._addParticle(new Mesh(geometry, material), origin, velocity, {
                gravity: -0.004 * SIXTEEN,
                baseScale: (Math.random() + 1) * 0.75 * 0.2 * SIXTEEN,
                billboard: true,
                ownsMaterial: true,
                behavior: "spell",
                maxAge: Math.floor(8 / (Math.random() * 0.8 + 0.2)),
            });
        }
    }
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
        mesh.position.copy(this.worldToLocal(position.clone()));
        mesh.scale.setScalar(options.baseScale);
        this.add(mesh);
        this._particles.push({
            mesh,
            velocity,
            gravity: options.gravity,
            baseScale: options.baseScale,
            billboard: options.billboard,
            ownsMaterial: options.ownsMaterial,
            behavior: options.behavior ?? "falling",
            origin: mesh.position.clone(),
            age: 0,
            // 20 + rand(10) ticks, matching EntityFX's
            // particleMaxAge in the Java source.
            maxAge: options.maxAge ?? 20 + Math.floor(Math.random() * 10),
        });
        if (options.behavior === "enchantment")
            mesh.position.add(velocity);
    }
    update(deltaSeconds, facing) {
        if (deltaSeconds <= 0 || this._particles.length === 0) {
            return;
        }
        const ticks = deltaSeconds * TICK_RATE;
        if (facing) {
            this.getWorldQuaternion(this._inverseWorldQuaternion).invert();
            facing.getWorldQuaternion(this._facingQuaternion).premultiply(this._inverseWorldQuaternion);
        }
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
            if (particle.behavior === "enchantment") {
                const progress = particle.age / particle.maxAge;
                particle.mesh.position.copy(particle.origin).addScaledVector(particle.velocity, 1 - progress);
                particle.mesh.position.y -= Math.pow(progress, 4) * 1.2 * SIXTEEN;
            }
            else {
                const drag = particle.behavior === "spell" ? 0.96 : DRAG;
                const damping = Math.pow(drag, ticks);
                const travel = (1 - damping) / (1 - drag);
                particle.mesh.position.addScaledVector(particle.velocity, travel);
                particle.mesh.position.y -= (particle.gravity * (ticks - drag * travel)) / (1 - drag);
                particle.velocity.multiplyScalar(damping);
                particle.velocity.y -= particle.gravity * drag * travel;
            }
            if (particle.behavior === "spell") {
                setSprite(particle.mesh.geometry, 128 + Math.max(0, 7 - Math.floor((particle.age * 8) / particle.maxAge)));
            }
            const remaining = particle.maxAge - particle.age;
            const fade = particle.behavior === "falling" && remaining < 5 ? clamp01(remaining / 5) : 1;
            particle.mesh.scale.setScalar(particle.baseScale * fade);
            if (particle.billboard && facing) {
                particle.mesh.quaternion.copy(this._facingQuaternion);
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