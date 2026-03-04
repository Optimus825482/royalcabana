/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type GUI from 'lil-gui';
import type Instance from '../core/Instance';
import ColorMap from '../core/ColorMap';
import Panel from './Panel';
type Mode = 'Elevation' | 'Slope' | 'Aspect';
/**
 * Inspector for a {@link ColorMap}.
 */
declare class ColorMapInspector extends Panel {
    private readonly _notify;
    private readonly _colorMapFn;
    get colorMap(): ColorMap;
    get mode(): Mode;
    set mode(v: Mode);
    /**
     * @param gui - The GUI.
     * @param instance - The Giro3D instance.
     * @param layer - The color map owner.
     * @param colorMapFn - The color map to inspect.
     */
    constructor(gui: GUI, instance: Instance, colorMapFn: () => ColorMap | null, notify: () => void);
    updateControllers(): void;
}
export default ColorMapInspector;
//# sourceMappingURL=ColorMapInspector.d.ts.map