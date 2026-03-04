/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type GUI from 'lil-gui';
import type Instance from '../core/Instance';
import type Shape from '../entities/Shape';
import EntityInspector from './EntityInspector';
declare class ShapeInspector extends EntityInspector<Shape> {
    color: string;
    /**
     * Creates an instance of ShapeInspector.
     *
     * @param parentGui - The parent GUI.
     * @param instance - The Giro3D instance.
     * @param entity - The inspected Map.
     */
    constructor(parentGui: GUI, instance: Instance, entity: Shape);
}
export default ShapeInspector;
//# sourceMappingURL=ShapeInspector.d.ts.map