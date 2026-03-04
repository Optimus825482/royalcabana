/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

/**
 * Trait of objects that hold unmanaged resources.
 */

export function isDisposable(object) {
  if (typeof object.dispose === 'function') {
    return true;
  }
  return false;
}