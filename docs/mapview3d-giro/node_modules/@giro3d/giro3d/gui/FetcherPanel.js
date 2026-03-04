/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import Fetcher from '../utils/Fetcher';
import Panel from './Panel';
class FetcherPanel extends Panel {
  pendingRequests = 0;
  runningRequests = 0;
  completedRequests = 0;
  constructor(parentGui, instance) {
    super(parentGui, instance, 'Fetcher');
    this.updateValues();
    this.addController(this, 'pendingRequests').name('Pending requests');
  }
  updateValues() {
    const {
      pending
    } = Fetcher.getInfo();
    this.pendingRequests = pending;
  }
}
export default FetcherPanel;