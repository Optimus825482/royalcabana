/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
type PickingCircleCallback = (x: number, y: number, idx: number) => boolean | null;
declare function traversePickingCircle(radius: number, callback: PickingCircleCallback): void;
export default traversePickingCircle;
//# sourceMappingURL=PickingCircle.d.ts.map