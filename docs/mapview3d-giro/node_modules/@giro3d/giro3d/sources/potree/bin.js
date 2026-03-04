/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { createReader, getTypedArray } from './attributes';
function readAttribute(attribute, view, pointByteSize, pointCount) {
  const array = getTypedArray(attribute.type, attribute.size, attribute.dimension, pointCount);
  const read = createReader(attribute, pointByteSize);
  for (let i = 0; i < pointCount; i++) {
    read(view, i, array);
  }
  return {
    array: array.buffer,
    dimension: attribute.dimension,
    normalized: attribute.normalized
  };
}
export function readBinFile(buffer, pointByteSize, positionAttribute, attributes) {
  const view = new DataView(buffer);

  // Format: X1,Y1,Z1,R1,G1,B1,A1,[...],XN,YN,ZN,RN,GN,BN,AN
  const pointCount = Math.floor(buffer.byteLength / pointByteSize);
  const positionBuffer = readAttribute(positionAttribute, view, pointByteSize, pointCount);
  const attributeBuffers = attributes.map(attribute => readAttribute(attribute, view, pointByteSize, pointCount));
  return {
    positionBuffer,
    attributeBuffers
  };
}