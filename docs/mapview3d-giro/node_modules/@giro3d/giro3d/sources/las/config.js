/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { LazPerf } from 'laz-perf';
import Fetcher from '../../utils/Fetcher';
export const DEFAULT_LAZPERF_PATH = 'https://cdn.jsdelivr.net/npm/laz-perf@0.0.7/lib';
let lazPerfPath = DEFAULT_LAZPERF_PATH;
let lazPerfWasmBinary = null;

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
export function setLazPerfPath(path) {
  lazPerfPath = path;
}
export function setLazPerfWasmBinary(wasmBinary) {
  lazPerfWasmBinary = wasmBinary;
}

/**
 * @internal
 */
export function getLazPerfPath() {
  return lazPerfPath;
}
let lazPerf = undefined;
export function loadWasmBinary() {
  return Fetcher.arrayBuffer(lazPerfPath + '/laz-perf.wasm');
}
async function loadLazPerfFromWasmBinary(binary) {
  return LazPerf.create({
    wasmBinary: binary
  });
}

/**
 * Loads one instance of the LazPerf library.
 */
async function loadLazPerf(wasmPath) {
  // console.log('initializing laz-perf with path: ' + wasmPath);
  return LazPerf.create({
    locateFile: file => `${wasmPath}/${file}`
  });
}

/**
 * @internal
 */
export function getLazPerf() {
  if (!lazPerf) {
    if (lazPerfWasmBinary != null) {
      lazPerf = loadLazPerfFromWasmBinary(lazPerfWasmBinary);
    } else {
      lazPerf = loadLazPerf(lazPerfPath);
    }
  }
  return lazPerf;
}