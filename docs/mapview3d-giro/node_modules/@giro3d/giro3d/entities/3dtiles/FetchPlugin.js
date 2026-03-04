/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import OperationCounter from '../../core/OperationCounter';
import Fetcher from '../../utils/Fetcher';

/**
 * A plugin that routes HTTP calls to the Giro3D Fetcher.
 */
export default class FetchPlugin {
  _opCounter = new OperationCounter();
  get loading() {
    return this._opCounter.loading;
  }
  get progress() {
    return this._opCounter.progress;
  }
  fetchData(url, options) {
    this._opCounter.increment();
    return Fetcher.fetch(url, options).finally(() => this._opCounter.decrement());
  }
}