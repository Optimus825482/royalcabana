/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { LazPerf } from 'laz-perf';
export declare const DEFAULT_LAZPERF_PATH = "https://cdn.jsdelivr.net/npm/laz-perf@0.0.7/lib";
/**
 * Sets the path to the directory that contains the laz-perf library files.
 *
 * This must be set before instantiating any class that makes use of this library.
 *
 * For example, if the `laz-perf.wasm` file is served from
 * `<website>/public/wasm/laz-perf.wasm`, the path to configure is the following:
 * ```ts
 * setLazPerfPath('/public/wasm/');
 * ```
 *
 * Note: the default path to the laz-perf library is {@link DEFAULT_LAZPERF_PATH}.
 */
export declare function setLazPerfPath(path: string): void;
export declare function setLazPerfWasmBinary(wasmBinary: ArrayBuffer): void;
/**
 * @internal
 */
export declare function getLazPerfPath(): string;
export declare function loadWasmBinary(): Promise<ArrayBuffer>;
/**
 * @internal
 */
export declare function getLazPerf(): Promise<LazPerf>;
//# sourceMappingURL=config.d.ts.map