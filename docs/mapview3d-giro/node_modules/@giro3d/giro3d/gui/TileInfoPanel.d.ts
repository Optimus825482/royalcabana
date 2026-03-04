/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type GUI from 'lil-gui';
import { Color } from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type Instance from '../core/Instance';
import type Map from '../entities/Map';
import type TileMesh from '../entities/tiles/TileMesh';
import Panel from './Panel';
declare class TileInfoPanel extends Panel {
    private readonly _labels;
    private readonly _map;
    private readonly _root;
    readonly params: {
        enabled: boolean;
        nodeInfo: boolean;
        imageSize: boolean;
        minMax: boolean;
        layerInfo: boolean;
        color: Color;
    };
    /**
     * @param map - The map.
     * @param parentGui - Parent GUI
     * @param instance - The instance
     */
    constructor(map: Map, parentGui: GUI, instance: Instance);
    getOrCreateLabel(obj: TileMesh): CSS2DObject;
    getInfo(tile: TileMesh): string;
    private getLabelVisibility;
    private getLabelPosition;
    private removeLabel;
    updateLabel(tile: TileMesh): void;
    updateValues(): void;
}
export default TileInfoPanel;
//# sourceMappingURL=TileInfoPanel.d.ts.map