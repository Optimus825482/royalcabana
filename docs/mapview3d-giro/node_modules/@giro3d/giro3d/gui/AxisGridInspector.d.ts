/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type GUI from 'lil-gui';
import type { ColorRepresentation } from 'three';
import type Instance from '../core/Instance';
import type AxisGrid from '../entities/AxisGrid';
import EntityInspector from './EntityInspector';
declare class AxisGridInspector extends EntityInspector<AxisGrid> {
    absoluteTicks: boolean;
    /**
     * Creates an instance of AxisGridInspector.
     *
     * @param parentGui - The parent GUI.
     * @param instance - The Giro3D instance.
     * @param grid - The inspected Map.
     */
    constructor(parentGui: GUI, instance: Instance, grid: AxisGrid);
    private _rebuild;
    updateTickOrigin(v: boolean): void;
    updateGridColor(v: ColorRepresentation): void;
}
export default AxisGridInspector;
//# sourceMappingURL=AxisGridInspector.d.ts.map