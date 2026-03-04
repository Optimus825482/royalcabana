/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import proj4 from 'proj4';
import NestedMap from '../../utils/NestedMap';
const createConverter = (src, dst) => proj4(src.id, dst.id);
const cache = new NestedMap();

/**
 * Returns a coordinate converter from the specified source and destination CRSes.
 */
export function getConverter(crsIn, crsOut) {
  return cache.getOrCreate(crsIn, crsOut, createConverter);
}