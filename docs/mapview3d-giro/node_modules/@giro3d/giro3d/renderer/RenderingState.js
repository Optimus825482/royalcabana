/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
/**
 * The various states supported by a material (more precisely its fragment shader).
 */
var RenderingState = /*#__PURE__*/function (RenderingState) {
  /** The normal state. */
  RenderingState[RenderingState["FINAL"] = 0] = "FINAL";
  /**
   * The fragment shader outputs (ID, Z, U, V) without encoding.
   * Requires a 32-bit floating point render target.
   */
  RenderingState[RenderingState["PICKING"] = 1] = "PICKING";
  return RenderingState;
}(RenderingState || {});
export default RenderingState;