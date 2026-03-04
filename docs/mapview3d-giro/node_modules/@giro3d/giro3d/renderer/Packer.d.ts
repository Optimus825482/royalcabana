/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
export interface Node {
    x: number;
    y: number;
    w: number;
    h: number;
    offset?: number;
    right?: Node;
    down?: Node;
    used?: boolean;
}
export interface UsedNode extends Node {
    used: true;
    right: Node;
    down: Node;
}
export interface Block {
    w: number;
    h: number;
    fit: Node;
}
declare function fit(blocks: Block[], w: number, h: number, previousRoot: Node | null): {
    maxX: number;
    maxY: number;
};
export default fit;
//# sourceMappingURL=Packer.d.ts.map