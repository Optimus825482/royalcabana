/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type GUI from 'lil-gui';
import { Color } from 'three';
import type ColorMap from '../core/ColorMap';
import type CoordinateSystem from '../core/geographic/CoordinateSystem';
import type Instance from '../core/Instance';
import type Layer from '../core/layer/Layer';
import type Entity3D from '../entities/Entity3D';
import type { BoundingBoxHelper } from '../helpers/Helpers';
import ColorimetryPanel from './ColorimetryPanel';
import ColorMapInspector from './ColorMapInspector';
import Panel from './Panel';
import SourceInspector from './SourceInspector';
/**
 * Inspector for a {@link Layer}.
 */
declare class LayerInspector extends Panel {
    /** The inspected layer. */
    layer: Layer;
    entity: Entity3D;
    state: string;
    sourceCrs: CoordinateSystem;
    interpretation: string;
    minmax: {
        min: number;
        max: number;
    } | undefined;
    extentColor: Color;
    showExtent: boolean;
    extentHelper: BoundingBoxHelper | null;
    visible: boolean;
    /** The color map inspector */
    colorMapInspector: ColorMapInspector;
    /** The source inspector. */
    sourceInspector: SourceInspector | undefined;
    colorimetryPanel: ColorimetryPanel | undefined;
    composerImages: number;
    cpuMemoryUsage: string;
    gpuMemoryUsage: string;
    blendingMode: string;
    /**
     * @param gui - The GUI.
     * @param instance - The Giro3D instance.
     * @param entity - The map.
     * @param layer - The layer to inspect
     */
    constructor(gui: GUI, instance: Instance, entity: Entity3D, layer: Layer);
    repaint(): void;
    get colorMap(): Pick<ColorMap, 'min' | 'max' | 'mode'>;
    removeLayer(): void;
    disposeLayer(): void;
    updateExtentColor(): void;
    toggleExtent(): void;
    updateControllers(): void;
    updateValues(): void;
}
export default LayerInspector;
//# sourceMappingURL=LayerInspector.d.ts.map