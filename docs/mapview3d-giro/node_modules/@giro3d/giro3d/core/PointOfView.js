/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { Vector3 } from 'three';
import { isOrthographicCamera, isVector3 } from '../utils/predicates';

/**
 * A point of view generated for a specific camera configuration.
 *
 * Note: this point of view might not be applicable to different camera
 * settings (e.g different field of views, or orthographic sizes).
 */

export function isPointOfView(obj) {
  if (obj != null && typeof obj === 'object') {
    return 'origin' in obj && isVector3(obj.origin) && 'target' in obj && isVector3(obj.target) && 'orthographicZoom' in obj && typeof obj.orthographicZoom === 'number';
  }
  return false;
}

/**
 * Creates an immutable point of view from a camera.
 */
export function createFromCamera(obj) {
  const origin = obj.getWorldPosition(new Vector3());
  const target = origin.clone().add(obj.getWorldDirection(new Vector3()));
  let zoom = 1;
  if (isOrthographicCamera(obj)) {
    zoom = obj.zoom;
  }
  const result = {
    origin,
    target,
    orthographicZoom: zoom
  };
  return Object.freeze(result);
}