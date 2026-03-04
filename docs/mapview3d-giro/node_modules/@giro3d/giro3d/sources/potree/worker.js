/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { createErrorResponse } from '../../utils/WorkerPool';
import { readBinFile } from './bin';
function processReadBinMessage(msg) {
  try {
    const {
      buffer,
      info
    } = msg.payload;
    const result = readBinFile(buffer, info.pointByteSize, info.positionAttribute, info.attributes);
    const response = {
      requestId: msg.id,
      payload: {
        position: result.positionBuffer,
        attributes: result.attributeBuffers
      }
    };
    const transfer = [result.positionBuffer, ...result.attributeBuffers].map(bufferToTransfer => bufferToTransfer.array);
    postMessage(response, {
      transfer
    });
  } catch (err) {
    postMessage(createErrorResponse(msg.id, err));
  }
}
onmessage = e => {
  const message = e.data;
  switch (message.type) {
    case 'ReadBinFile':
      processReadBinMessage(message);
      break;
  }
};