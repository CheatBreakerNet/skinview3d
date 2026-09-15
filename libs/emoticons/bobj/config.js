import { Euler, Object3D, Vector3 } from "three";
import { SIXTEEN } from "../../consts.js";
import { degToRad } from "../../math.js";
export function applyHandAttachment(object, config) {
    object.position.set((config.x ?? 0) * SIXTEEN, (config.y ?? 0) * SIXTEEN, (config.z ?? 0) * SIXTEEN);
    object.rotation.copy(new Euler(degToRad(config.rx ?? 0), degToRad(config.ry ?? 0), degToRad(config.rz ?? 0)));
    object.scale.copy(new Vector3(config.sx ?? 1, config.sy ?? 1, config.sz ?? 1));
}
export function getHandAttachment(config, hand) {
    const hands = hand === "left" ? config.leftHands : config.rightHands;
    const entries = Object.entries(hands);
    if (entries.length === 0) {
        return null;
    }
    const [boneName, handConfig] = entries[0];
    return { boneName, config: handConfig };
}
//# sourceMappingURL=config.js.map