/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { MessageMap, MessageType } from './worker';
import WorkerPool from '../../utils/WorkerPool';
export default class PotreeWorkerPool extends WorkerPool<MessageType, MessageMap> {
    private static _singleton;
    private static create;
    static get(): Promise<PotreeWorkerPool>;
}
//# sourceMappingURL=PotreeWorkerPool.d.ts.map