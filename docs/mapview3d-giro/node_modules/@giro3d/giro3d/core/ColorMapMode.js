/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
/**
 * Modes of the color map gradient.
 */
var ColorMapMode = /*#__PURE__*/function (ColorMapMode) {
  /**
   * The color map describes an elevation gradient.
   */
  ColorMapMode[ColorMapMode["Elevation"] = 1] = "Elevation";
  /**
   * The color map describes a slope gradient.
   */
  ColorMapMode[ColorMapMode["Slope"] = 2] = "Slope";
  /**
   * The color map describes an aspect gradient.
   */
  ColorMapMode[ColorMapMode["Aspect"] = 3] = "Aspect";
  return ColorMapMode;
}(ColorMapMode || {});
export default ColorMapMode;