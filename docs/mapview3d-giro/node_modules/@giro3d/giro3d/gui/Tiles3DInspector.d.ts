/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type GUI from 'lil-gui';
import type Instance from '../core/Instance';
import type Tiles3D from '../entities/Tiles3D';
import ColorMapInspector from './ColorMapInspector';
import EntityInspector from './EntityInspector';
import LayerInspector from './LayerInspector';
declare class Tiles3DInspector extends EntityInspector<Tiles3D> {
    /** The color map inspector */
    colorMapInspector: ColorMapInspector;
    layers: LayerInspector[];
    /** The layer folder. */
    layerFolder: GUI;
    /**
     * Creates an instance of Tiles3DInspector.
     *
     * @param parentGui - The parent GUI.
     * @param instance - The Giro3D instance.
     * @param entity - The inspected 3D tileset.
     */
    constructor(parentGui: GUI, instance: Instance, entity: Tiles3D);
    fillLayers(): void;
    updateValues(): void;
    toggleBoundingBoxes(visible: boolean): void;
}
export default Tiles3DInspector;
//# sourceMappingURL=Tiles3DInspector.d.ts.map