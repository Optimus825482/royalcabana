/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type GUI from 'lil-gui';
import type { WebGLRenderer } from 'three';
import type Instance from '../core/Instance';
import Panel from './Panel';
declare class WebGLRendererInspector extends Panel {
    renderer: WebGLRenderer;
    /**
     * @param gui - The GUI.
     * @param instance - The Giro3D instance.
     */
    constructor(gui: GUI, instance: Instance);
    /**
     * @param renderer - The renderer
     * @param rendererPanel - The GUI
     */
    private _addCapabilities;
}
export default WebGLRendererInspector;
//# sourceMappingURL=WebGLRendererInspector.d.ts.map