/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type Progress from '../../core/Progress';
import type { FetchOptions } from '../../utils/Fetcher';
/**
 * A plugin that routes HTTP calls to the Giro3D Fetcher.
 */
export default class FetchPlugin implements Progress {
    private readonly _opCounter;
    get loading(): boolean;
    get progress(): number;
    fetchData(url: RequestInfo | URL, options: FetchOptions): Promise<Response>;
}
//# sourceMappingURL=FetchPlugin.d.ts.map