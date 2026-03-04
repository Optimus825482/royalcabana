/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type GUI from 'lil-gui';
import type ContourLineOptions from '../core/ContourLineOptions';
import type Instance from '../core/Instance';
import Panel from './Panel';
declare class ContourLinePanel extends Panel {
    /**
     * @param options - The options.
     * @param parentGui - Parent GUI
     * @param instance - The instance
     */
    constructor(options: ContourLineOptions, parentGui: GUI, instance: Instance);
}
export default ContourLinePanel;
//# sourceMappingURL=ContourLinePanel.d.ts.map