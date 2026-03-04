/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type GUI from 'lil-gui';
import { Object3D } from 'three';
import type Instance from '../../core/Instance';
import Panel from '../Panel';
declare class OutlinerPropertyView extends Panel {
    protected _folders: GUI[];
    private _object;
    constructor(parentGui: GUI, instance: Instance);
    createControllers(obj: object, gui: GUI): void;
    /**
     * @param obj - The object to update.
     */
    updateObject(obj: Object3D): void;
    goToObject(): void;
    private updateControlsWithDefaultView;
    populateProperties(obj: Object3D): void;
}
export default OutlinerPropertyView;
//# sourceMappingURL=OutlinerPropertyView.d.ts.map