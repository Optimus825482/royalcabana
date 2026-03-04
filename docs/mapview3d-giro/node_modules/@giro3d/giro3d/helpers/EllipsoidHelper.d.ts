/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { Color, Object3D, type ColorRepresentation } from 'three';
import type Disposable from '../core/Disposable';
import Ellipsoid from '../core/geographic/Ellipsoid';
/**
 * Displays an ellipsoid along with its axes.
 */
export default class EllipsoidHelper extends Object3D implements Disposable {
    readonly isEllipsoidHelper: true;
    readonly type: "EllipsoidHelper";
    readonly ellipsoid: Ellipsoid;
    private readonly _mesh;
    private readonly _axes;
    private readonly _labels;
    private readonly _arrows;
    private _showNormals;
    private _disposed;
    /**
     * The color of the lines.
     */
    get color(): Color;
    set color(c: Color);
    get showLines(): boolean;
    set showLines(show: boolean);
    get showAxes(): boolean;
    set showAxes(show: boolean);
    get showNormals(): boolean;
    set showNormals(show: boolean);
    get showLabels(): boolean;
    set showLabels(show: boolean);
    constructor(params?: {
        /**
         * The ellipsoid to use.
         * @defaultValue {@link Ellipsoid.WGS84}
         */
        ellipsoid?: Ellipsoid;
        /**
         * The number of parallels, including the equator. Must be an odd number. 0 disable parallels.
         * @defaultValue 5
         */
        parallels?: number;
        /**
         * The number of meridians.
         * @defaultValue 24 (one per timezone)
         */
        meridians?: number;
        /**
         * The number of segments.
         * @defaultValue 32
         */
        segments?: number;
        /**
         * The color of the lines (except equator and prime meridian).
         * @defaultValue grey
         */
        lineColor?: ColorRepresentation;
        /**
         * The color of the equator line.
         * @defaultValue #FF4F93
         */
        equatorColor?: ColorRepresentation;
        /**
         * The color of the prime meridian line.
         * @defaultValue #75B1C7
         */
        primeMeridianColor?: ColorRepresentation;
    });
    private deleteNormalArrows;
    private createNormalArrows;
    dispose(): void;
}
//# sourceMappingURL=EllipsoidHelper.d.ts.map