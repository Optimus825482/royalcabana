/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
/**
 * Describes how a layer is blended into the background (either another layer or the background
 * color).
 */
var BlendingMode = /*#__PURE__*/function (BlendingMode) {
  /**
   * No blending is performed, i.e if the layer has transparent or semi-transparent pixels,
   * they become opaque.
   */
  BlendingMode[BlendingMode["None"] = 0] = "None";
  /**
   * Normal [alpha blending](https://en.wikipedia.org/wiki/Alpha_compositing).
   */
  BlendingMode[BlendingMode["Normal"] = 1] = "Normal";
  /**
   * Additive blending: pixel colors are added to the background pixel. The alpha channel is not
   * used
   */
  BlendingMode[BlendingMode["Add"] = 2] = "Add";
  /**
   * Multiplicative blending: pixel colors are multiplied by the background pixel. The alpha
   * channel is not used.
   */
  BlendingMode[BlendingMode["Multiply"] = 3] = "Multiply";
  return BlendingMode;
}(BlendingMode || {});
export default BlendingMode;