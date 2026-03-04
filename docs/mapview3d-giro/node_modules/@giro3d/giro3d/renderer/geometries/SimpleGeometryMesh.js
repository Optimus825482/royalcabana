/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

/**
 * Interface for meshes that represent a single OpenLayers Geometry.
 */

export function isSimpleGeometryMesh(obj) {
  return obj?.isSimpleGeometryMesh ?? false;
}