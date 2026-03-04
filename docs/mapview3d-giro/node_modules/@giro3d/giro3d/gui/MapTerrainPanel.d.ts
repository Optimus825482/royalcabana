/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type GUI from 'lil-gui';
import type Instance from '../core/Instance';
import type Map from '../entities/Map';
import Panel from './Panel';
declare class MapTerrainPanel extends Panel {
    map: Map;
    segments: number;
    /**
     * @param map - The map.
     * @param parentGui - Parent GUI
     * @param instance - The instance
     */
    constructor(map: Map, parentGui: GUI, instance: Instance);
    updateSegments(v: number): void;
}
export default MapTerrainPanel;
//# sourceMappingURL=MapTerrainPanel.d.ts.map