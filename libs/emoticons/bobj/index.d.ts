export type BOBJInterpolation = "CONSTANT" | "LINEAR" | "BEZIER";
export type BOBJPath = "location" | "rotation" | "scale";
export type XYZ = [number, number, number];
export interface BOBJKeyframe {
    readonly frame: number;
    readonly value: number;
    readonly interpolation: BOBJInterpolation;
    readonly leftX: number;
    readonly leftY: number;
    readonly rightX: number;
    readonly rightY: number;
}
export interface BOBJChannel {
    readonly path: BOBJPath;
    readonly axis: 0 | 1 | 2;
    readonly keyframes: readonly BOBJKeyframe[];
}
export interface BOBJTrack {
    readonly name: string;
    readonly channels: readonly BOBJChannel[];
}
export interface BOBJAction {
    readonly name: string;
    readonly bones: ReadonlyMap<string, BOBJTrack>;
    readonly duration: number;
}
export interface BOBJData {
    readonly actions: ReadonlyMap<string, BOBJAction>;
}
export interface BoneSample {
    readonly position: readonly [number, number, number];
    readonly rotation: readonly [number, number, number];
    readonly scale: readonly [number, number, number];
}
export declare function parseActions(data: string): BOBJData;
export declare function sampleChannel(channel: BOBJChannel, frame: number): number;
export declare function sampleBone(action: BOBJAction, bone: string, frame: number): BoneSample;
