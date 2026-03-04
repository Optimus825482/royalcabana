/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type GUI from 'lil-gui';
import type { AxesHelper, GridHelper } from 'three';
import { Color } from 'three';
import type Instance from '../core/Instance';
import type Map from '../entities/Map';
import type { BoundingBoxHelper } from '../helpers/Helpers';
import ColorimetryPanel from './ColorimetryPanel';
import ContourLinePanel from './ContourLinePanel';
import EntityInspector from './EntityInspector';
import GraticulePanel from './GraticulePanel';
import LayerInspector from './LayerInspector';
import MapLightingPanel from './MapLightingPanel';
import MapTerrainPanel from './MapTerrainPanel';
import TileInfoPanel from './TileInfoPanel';
type Sidedness = 'Front' | 'Back' | 'DoubleSide';
declare class MapInspector extends EntityInspector<Map> {
    /** Toggle the frozen property of the map. */
    frozen: boolean;
    showGrid: boolean;
    renderState: string;
    layerCount: number;
    background: Color;
    backgroundOpacity: number;
    extentColor: Color;
    showExtent: boolean;
    extentHelper: BoundingBoxHelper | null;
    lightingPanel: MapLightingPanel;
    tileInfoPanel: TileInfoPanel;
    contourLinePanel: ContourLinePanel;
    colorimetryPanel: ColorimetryPanel;
    graticulePanel: GraticulePanel;
    /** The layer folder. */
    layerFolder: GUI;
    layers: LayerInspector[];
    private _fillLayersCb;
    private _paintCompleteCb;
    grid?: GridHelper;
    axes?: AxesHelper;
    reachableTiles: number;
    visibleTiles: number;
    terrainPanel: MapTerrainPanel;
    side: Sidedness;
    completePaints: number;
    /**
     * Creates an instance of MapInspector.
     *
     * @param parentGui - The parent GUI.
     * @param instance - The Giro3D instance.
     * @param map - The inspected Map.
     */
    constructor(parentGui: GUI, instance: Instance, map: Map);
    private paintComplete;
    disposeMapAndLayers(): void;
    toggleBoundingBoxes(): void;
    updateControllers(): void;
    updateBackgroundOpacity(a: number): void;
    updateBackgroundColor(srgb: Color): void;
    updateExtentColor(): void;
    toggleExtent(): void;
    setSidedness(side: Sidedness): void;
    setRenderState(state: string): void;
    removeEventListeners(): void;
    dispose(): void;
    dumpTiles(): void;
    updateValues(): void;
    fillLayers(): void;
    toggleGrid(value: boolean): void;
}
export default MapInspector;
//# sourceMappingURL=MapInspector.d.ts.map