/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import Fetcher from '../../utils/Fetcher';
import WorkerPool from '../../utils/WorkerPool';
import { getLazPerfPath } from './config';
import createWorker from './createWorker';

/**
 * A global singleton worker pool that provides LAS processing workers.
 */
export default class LASWorkerPool extends WorkerPool {
  constructor(wasmBinary, concurrency) {
    super({
      createWorker: createWorker(wasmBinary),
      concurrency
    });
  }
  static _wasmBinary = null;
  static _singleton = null;

  /**
   * Returns the singleton worker pool, creating it if necessary.
   */
  static async get() {
    if (this._singleton != null) {
      return this._singleton;
    }
    return this.createSingleton();
  }
  static async createSingleton() {
    // Ensure that the .wasm file is loaded only once per session,
    // then send the data to each worker. This avoids many HTTP requests.
    if (this._wasmBinary == null) {
      const url = `${getLazPerfPath()}/laz-perf.wasm`;
      this._wasmBinary = await Fetcher.arrayBuffer(url);
    }
    this._singleton = new LASWorkerPool(this._wasmBinary);
    return this._singleton;
  }
}