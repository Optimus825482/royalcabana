/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import * as copc from 'copc';
import { createErrorResponse } from '../../utils/WorkerPool';
import { getLazPerf, setLazPerfWasmBinary } from './config';
import { getPerPointFilters } from './filter';
import { readColor, readPosition, readScalarAttribute } from './readers';
async function decompressChunk(chunk, metadata) {
  const lazPerf = await getLazPerf();
  return copc.Las.PointData.decompressChunk(new Uint8Array(chunk), metadata, lazPerf);
}
async function decompressFile(chunk) {
  const lazPerf = await getLazPerf();
  return copc.Las.PointData.decompressFile(new Uint8Array(chunk), lazPerf);
}
function processDecodeChunkMessage(msg) {
  decompressChunk(msg.payload.buffer, msg.payload.metadata).then(buf => {
    const response = {
      requestId: msg.id,
      payload: buf.buffer
    };
    postMessage(response, {
      transfer: [buf.buffer]
    });
  }).catch(err => {
    postMessage(createErrorResponse(msg.id, err));
  });
}
function processDecodeFileMessage(msg) {
  decompressFile(msg.payload.buffer).then(buf => {
    const response = {
      requestId: msg.id,
      payload: buf.buffer
    };
    postMessage(response, {
      transfer: [buf.buffer]
    });
  }).catch(err => {
    console.error(err);
    postMessage(createErrorResponse(msg.id, err));
  });
}
export function readView(options) {
  const {
    view,
    filters,
    origin,
    attributes,
    compressColors
  } = options;
  const stride = options.stride ?? 1;
  const perPointFilters = getPerPointFilters(filters ?? [], view);
  let position = undefined;
  if (options.position) {
    const data = readPosition(view, origin, stride, perPointFilters);
    const localBoundingBox = [data.localBoundingBox.min.x, data.localBoundingBox.min.y, data.localBoundingBox.min.z, data.localBoundingBox.max.x, data.localBoundingBox.max.y, data.localBoundingBox.max.z];
    position = {
      buffer: data.buffer,
      localBoundingBox
    };
  }
  const attributesBuffers = attributes.map(attribute => {
    switch (attribute.interpretation) {
      case 'color':
        return readColor(view, stride, compressColors, perPointFilters);
        break;
      case 'classification':
      case 'unknown':
        return readScalarAttribute(view, attribute, stride, perPointFilters);
        break;
    }
  });
  return {
    position,
    attributes: attributesBuffers
  };
}
function processReadViewMessage(msg) {
  const {
    buffer,
    metadata,
    header,
    eb,
    include
  } = msg.payload;
  decompressChunk(buffer, metadata).then(bin => {
    const view = copc.Las.View.create(bin, header, eb, include);
    const payload = readView({
      ...msg.payload,
      view
    });
    const response = {
      requestId: msg.id,
      payload
    };
    const transfer = [...payload.attributes];
    if (payload.position) {
      transfer.push(payload.position.buffer);
    }
    postMessage(response, {
      transfer
    });
  }).catch(err => {
    console.error(err);
    postMessage(createErrorResponse(msg.id, err));
  });
}
onmessage = event => {
  const message = event.data;
  switch (message.type) {
    case 'DecodeLazChunk':
      processDecodeChunkMessage(message);
      break;
    case 'DecodeLazFile':
      processDecodeFileMessage(message);
      break;
    case 'ReadView':
      processReadViewMessage(message);
      break;
    case 'SetWasmBinary':
      setLazPerfWasmBinary(message.buffer);
      break;
  }
};