/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type GUI from 'lil-gui';
import type TileSource from 'ol/source/Tile.js';
import type Instance from '../core/Instance';
import type ImageSource from '../sources/ImageSource';
import Panel from './Panel';
/**
 * Inspector for a source.
 *
 */
declare class SourceInspector extends Panel {
    source: ImageSource;
    url?: string;
    cogChannels: string;
    subtype?: string;
    crs?: string;
    resolutions?: number;
    cpuMemoryUsage: string;
    gpuMemoryUsage: string;
    loadedPercent: string;
    /**
     * @param gui - The GUI.
     * @param instance - The Giro3D instance.
     * @param source - The source.
     */
    constructor(gui: GUI, instance: Instance, source: ImageSource);
    private addControllers;
    private populateVideoSource;
    updateValues(): void;
    processOpenLayersSource(source: TileSource): void;
}
export default SourceInspector;
//# sourceMappingURL=SourceInspector.d.ts.map