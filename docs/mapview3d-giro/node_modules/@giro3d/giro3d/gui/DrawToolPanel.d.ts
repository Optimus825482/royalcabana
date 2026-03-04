/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type GUI from 'lil-gui';
import { Color } from 'three';
import type Instance from '../core/Instance';
import Panel from './Panel';
export default class DrawToolPanel extends Panel {
    private readonly _shapes;
    private _drawTool?;
    color: Color;
    get pendingColor(): Color;
    constructor(parent: GUI, instance: Instance);
    private onShapeFinished;
    private createDrawToolIfNecessary;
    createSegment(): void;
    createPoint(): void;
    createPolygon(): void;
    clear(): void;
}
//# sourceMappingURL=DrawToolPanel.d.ts.map