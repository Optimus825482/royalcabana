/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

/**
 * Interface for objects that expose a default camera point of view.
 */

/**
 * Checks if the object implements {@link HasDefaultPointOfView}.
 */
export function hasDefaultPointOfView(obj) {
  return obj?.hasDefaultPointOfView === true;
}